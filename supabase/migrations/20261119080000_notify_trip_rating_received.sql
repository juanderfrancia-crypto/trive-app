-- rate_booking (rutas normales) ya avisa a quien es calificado ('review_received').
-- rate_trip (rutas personalizadas) guardaba la calificación pero nunca avisaba
-- a la persona calificada -- ni push ni en Alertas. Se agrega el mismo aviso,
-- solo cuando es una calificación nueva (no al editarla, por el ON CONFLICT
-- DO UPDATE que ya traía la función).

CREATE OR REPLACE FUNCTION public.rate_trip(v_trip_id uuid, v_rating integer, v_comment text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_trip_exists BOOLEAN;
  v_user_id UUID;
  v_is_participant BOOLEAN;
  v_rated_user_id UUID;
  v_passenger_id UUID;
  v_driver_id UUID;
  v_already_rated BOOLEAN;
BEGIN
  RAISE NOTICE '[DB] Iniciando rate_trip para trip_id: %, rating: %', v_trip_id, v_rating;

  v_user_id := auth.uid();

  -- Validar rating
  IF v_rating < 1 OR v_rating > 5 THEN
    RAISE NOTICE '[DB] ERROR: Rating inválido: %', v_rating;
    RAISE EXCEPTION 'Rating debe estar entre 1 y 5';
  END IF;

  -- Verificar que el viaje existe y está completado
  SELECT passenger_id, driver_id INTO v_passenger_id, v_driver_id
  FROM airport_requests
  WHERE id = v_trip_id
  AND status = 'completed';

  IF v_passenger_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado o no está completado';
    RAISE EXCEPTION 'Viaje no encontrado o no está completado';
  END IF;

  -- Verificar que el usuario es participante del viaje
  IF v_user_id != v_passenger_id AND v_user_id != v_driver_id THEN
    RAISE NOTICE '[DB] ERROR: Usuario no participó en este viaje';
    RAISE EXCEPTION 'Solo los participantes del viaje pueden calificarlo';
  END IF;

  -- Determinar a quién se califica (el otro participante)
  v_rated_user_id := CASE
    WHEN v_user_id = v_passenger_id THEN v_driver_id
    ELSE v_passenger_id
  END;

  v_already_rated := EXISTS (
    SELECT 1 FROM trip_ratings
    WHERE trip_id = v_trip_id AND rater_id = v_user_id AND rated_id = v_rated_user_id
  );

  -- Insertar o actualizar calificación
  INSERT INTO trip_ratings (trip_id, rater_id, rated_id, rating, comment)
  VALUES (v_trip_id, v_user_id, v_rated_user_id, v_rating, v_comment)
  ON CONFLICT (trip_id, rater_id, rated_id)
  DO UPDATE SET
    rating = v_rating,
    comment = v_comment,
    updated_at = NOW();

  IF NOT v_already_rated THEN
    PERFORM public.notify_user(
      v_rated_user_id, 'review_received', 'Nueva calificación recibida',
      'Recibiste una calificación de ' || v_rating || '/5.',
      jsonb_build_object('trip_id', v_trip_id, 'rating', v_rating)
    );
  END IF;

  RAISE NOTICE '[DB] Viaje calificado: trip_id=%, rater=%, rating=%', v_trip_id, v_user_id, v_rating;
END;
$function$;
