-- Fase 2p: al publicar, el mensaje dice exactamente qué falta (documentos, cédula o vehículo).

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

  UPDATE public.profiles SET balance = balance - c_fee WHERE id = v_uid AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $2.000 de saldo para publicar un viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'route_fee');

  INSERT INTO public.routes (
    driver_id, vehicle_id, origin, destination, departure_time, arrival_time,
    price_per_seat, total_seats, available_seats, status, description,
    pickup_point, pickup_point_custom, vehicle_type,
    vehicle_plate, vehicle_make, vehicle_year, vehicle_color
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
    v_vehicle.color
  )
  RETURNING * INTO v_route;

  RETURN v_route;
END;
$$;

-- Chat de negociación en tiempo real (el cliente se suscribe a estos mensajes).
-- Las políticas de lectura siguen aplicando: cada quien recibe solo sus hilos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'negotiation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
  END IF;
END $$;
