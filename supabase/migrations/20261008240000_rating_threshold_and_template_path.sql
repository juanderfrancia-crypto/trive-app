-- La calificación pública solo existe con 5 o más reseñas (MIN_REVIEWS_TO_SHOW_RATING en la app).
-- Antes de eso profiles.rating queda en NULL y la app muestra "Nuevo".

CREATE OR REPLACE FUNCTION public.rate_booking(
  p_booking_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_recommend boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger_id uuid;
  v_driver_id uuid;
  v_status text;
  v_reviewee uuid;
  v_avg numeric;
  v_count integer;
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'La calificación debe estar entre 1 y 5';
  END IF;

  SELECT b.passenger_id, r.driver_id, b.booking_status
    INTO v_passenger_id, v_driver_id, v_status
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Solo puedes calificar viajes completados';
  END IF;

  IF v_uid = v_passenger_id THEN
    v_reviewee := v_driver_id;
  ELSIF v_uid = v_driver_id THEN
    v_reviewee := v_passenger_id;
  ELSE
    RAISE EXCEPTION 'No eres participante de este viaje';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id AND reviewer_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Ya calificaste este viaje';
  END IF;

  INSERT INTO public.reviews (booking_id, reviewer_id, reviewee_id, rating, comment, recommend)
  VALUES (p_booking_id, v_uid, v_reviewee, p_rating, NULLIF(trim(p_comment), ''), COALESCE(p_recommend, false));

  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count FROM public.reviews WHERE reviewee_id = v_reviewee;
  UPDATE public.profiles
  SET rating = CASE WHEN v_count >= 5 THEN ROUND(v_avg, 2) ELSE NULL END
  WHERE id = v_reviewee;

  PERFORM public.notify_user(
    v_reviewee, 'review_received', 'Nueva calificación recibida',
    'Recibiste una calificación de ' || p_rating || '/5.',
    jsonb_build_object('booking_id', p_booking_id, 'rating', p_rating)
  );
END;
$$;

UPDATE public.profiles p
SET rating = CASE WHEN s.total >= 5 THEN s.promedio ELSE NULL END
FROM (
  SELECT reviewee_id, COUNT(*) AS total, ROUND(AVG(rating), 2) AS promedio
  FROM public.reviews
  GROUP BY reviewee_id
) s
WHERE p.id = s.reviewee_id;

UPDATE public.profiles
SET rating = NULL
WHERE rating IS NOT NULL
  AND id NOT IN (SELECT reviewee_id FROM public.reviews);

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
  p.rating::numeric AS driver_rating,
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

ALTER TABLE public.route_templates
  ADD COLUMN IF NOT EXISTS pickup_point text,
  ADD COLUMN IF NOT EXISTS route_via text,
  ADD COLUMN IF NOT EXISTS dropoff_point text;
