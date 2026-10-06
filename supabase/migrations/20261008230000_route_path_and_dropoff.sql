-- El pasajero necesita saber por dónde va la ruta, de qué punto sale en el origen y a qué punto llega en el destino.

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS route_via text,
  ADD COLUMN IF NOT EXISTS dropoff_point text;

CREATE OR REPLACE FUNCTION public.publish_route(p_route jsonb)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_vehicle public.vehicles%ROWTYPE;
  v_route public.routes;
  c_fee constant integer := 2000;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'driver' AND driver_verified = true
  ) THEN
    RAISE EXCEPTION 'Tus documentos deben estar aprobados para publicar viajes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = v_uid AND national_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Registra tu número de cédula para publicar viajes';
  END IF;

  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE driver_id = v_uid AND is_active AND status = 'verified';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu vehículo debe estar aprobado para publicar viajes';
  END IF;

  INSERT INTO public.routes (
    driver_id, vehicle_id, origin, destination, departure_time, arrival_time,
    price_per_seat, total_seats, available_seats, status, description,
    pickup_point, pickup_point_custom, vehicle_type,
    vehicle_plate, vehicle_make, vehicle_year, vehicle_color,
    route_via, dropoff_point
  )
  VALUES (
    v_uid, v_vehicle.id,
    p_route->>'origin',
    p_route->>'destination',
    (p_route->>'departure_time')::timestamp,
    NULLIF(p_route->>'arrival_time', '')::timestamp,
    (p_route->>'price_per_seat')::numeric,
    (p_route->>'total_seats')::integer,
    (p_route->>'total_seats')::integer,
    'scheduled',
    NULLIF(p_route->>'description', ''),
    NULLIF(p_route->>'pickup_point', ''),
    COALESCE((p_route->>'pickup_point_custom')::boolean, false),
    NULLIF(p_route->>'vehicle_type', ''),
    v_vehicle.plate,
    v_vehicle.make,
    v_vehicle.year,
    v_vehicle.color,
    NULLIF(p_route->>'route_via', ''),
    NULLIF(p_route->>'dropoff_point', '')
  )
  RETURNING * INTO v_route;

  UPDATE public.profiles SET balance = balance - c_fee WHERE id = v_uid AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $2.000 de saldo para publicar un viaje';
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, route_id)
  VALUES (v_uid, -c_fee, 'route_fee', 'approved', v_route.id);

  RETURN v_route;
END;
$$;

CREATE OR REPLACE VIEW public.available_rides WITH (security_invoker = true) AS
SELECT
  r.id,
  r.driver_id,
  r.origin,
  r.destination,
  r.departure_time,
  r.arrival_time,
  r.price_per_seat,
  r.total_seats,
  r.available_seats,
  r.vehicle_type,
  r.vehicle_color,
  r.vehicle_plate,
  r.status,
  r.description,
  r.available_seats AS seats_available_count,
  p.id AS driver_user_id,
  p.name AS driver_name,
  p.avatar_url AS driver_photo,
  COALESCE((SELECT AVG(rv.rating)::numeric FROM public.reviews rv WHERE rv.reviewee_id = r.driver_id), 0) AS driver_rating,
  (SELECT COUNT(*) FROM public.reviews rv WHERE rv.reviewee_id = r.driver_id) AS driver_review_count,
  r.created_at,
  r.updated_at,
  r.pickup_point,
  r.route_via,
  r.dropoff_point
FROM public.routes r
LEFT JOIN public.profiles p ON p.id = r.driver_id
WHERE r.departure_time > (public.now_bogota() - INTERVAL '15 minutes')
  AND r.departure_time <= (public.now_bogota() + INTERVAL '24 hours')
  AND r.status = 'scheduled'
  AND r.available_seats > 0;
