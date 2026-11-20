-- rate_booking (reseñas de rutas normales, tabla reviews) sí recalculaba
-- profiles.rating al calificar. rate_trip (calificaciones de rutas
-- personalizadas, tabla trip_ratings) nunca lo tocaba -- si las reseñas de un
-- conductor venían de viajes personalizados, profiles.rating se quedaba en
-- NULL para siempre, aunque sí tuviera calificaciones reales guardadas.
--
-- Se extrae el cálculo a una función compartida que promedia AMBAS tablas
-- (reviews + trip_ratings), para que el rating de un usuario refleje su
-- reputación completa sin importar en qué tipo de viaje lo calificaron.
-- Mismo umbral de siempre: NULL hasta tener 5 calificaciones o más
-- (MIN_REVIEWS_TO_SHOW_RATING en el cliente).

CREATE OR REPLACE FUNCTION public.recompute_user_rating(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
  FROM (
    SELECT rating FROM public.reviews WHERE reviewee_id = p_user_id
    UNION ALL
    SELECT rating FROM public.trip_ratings WHERE rated_id = p_user_id
  ) all_ratings;

  UPDATE public.profiles
  SET rating = CASE WHEN v_count >= 5 THEN ROUND(v_avg, 2) ELSE NULL END
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rate_booking(p_booking_id uuid, p_rating integer, p_comment text DEFAULT NULL::text, p_recommend boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger_id uuid;
  v_driver_id uuid;
  v_status text;
  v_reviewee uuid;
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

  PERFORM public.recompute_user_rating(v_reviewee);

  PERFORM public.notify_user(
    v_reviewee, 'review_received', 'Nueva calificación recibida',
    'Recibiste una calificación de ' || p_rating || '/5.',
    jsonb_build_object('booking_id', p_booking_id, 'rating', p_rating)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rate_trip(v_trip_id uuid, v_rating integer, v_comment text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_rated_user_id UUID;
  v_passenger_id UUID;
  v_driver_id UUID;
  v_already_rated BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_rating < 1 OR v_rating > 5 THEN
    RAISE EXCEPTION 'Rating debe estar entre 1 y 5';
  END IF;

  SELECT passenger_id, driver_id INTO v_passenger_id, v_driver_id
  FROM airport_requests
  WHERE id = v_trip_id
  AND status = 'completed';

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado o no está completado';
  END IF;

  IF v_user_id != v_passenger_id AND v_user_id != v_driver_id THEN
    RAISE EXCEPTION 'Solo los participantes del viaje pueden calificarlo';
  END IF;

  v_rated_user_id := CASE
    WHEN v_user_id = v_passenger_id THEN v_driver_id
    ELSE v_passenger_id
  END;

  v_already_rated := EXISTS (
    SELECT 1 FROM trip_ratings
    WHERE trip_id = v_trip_id AND rater_id = v_user_id AND rated_id = v_rated_user_id
  );

  INSERT INTO trip_ratings (trip_id, rater_id, rated_id, rating, comment)
  VALUES (v_trip_id, v_user_id, v_rated_user_id, v_rating, v_comment)
  ON CONFLICT (trip_id, rater_id, rated_id)
  DO UPDATE SET
    rating = v_rating,
    comment = v_comment,
    updated_at = NOW();

  PERFORM public.recompute_user_rating(v_rated_user_id);

  IF NOT v_already_rated THEN
    PERFORM public.notify_user(
      v_rated_user_id, 'review_received', 'Nueva calificación recibida',
      'Recibiste una calificación de ' || v_rating || '/5.',
      jsonb_build_object('trip_id', v_trip_id, 'rating', v_rating)
    );
  END IF;
END;
$function$;

-- Backfill: recalcula para todo el que ya tiene calificaciones de viajes
-- personalizados, para que esto se vea reflejado ya mismo, no solo a futuro.
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN SELECT DISTINCT rated_id FROM public.trip_ratings LOOP
    PERFORM public.recompute_user_rating(v_user.rated_id);
  END LOOP;
END;
$$;
