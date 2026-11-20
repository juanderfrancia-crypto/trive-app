-- El conductor se enteraba de "nueva reserva" en reserve_seats, es decir apenas
-- el pasajero elegía asientos y presionaba Continuar -- pero eso solo crea una
-- reserva 'pending' que expira sola a los 5 minutos si el pasajero nunca llega
-- a presionar "Confirmar viaje" en la pantalla de Reserva. El conductor terminaba
-- recibiendo avisos de reservas que ni siquiera se concretaban, sin ningún aviso
-- de que en realidad no pasó nada. Se mueve el aviso a finalize_bookings_atomic,
-- que es lo que corre cuando el pasajero sí confirma.

CREATE OR REPLACE FUNCTION public.reserve_seats(p_route_id uuid, p_seat_numbers integer[], p_payment_method text DEFAULT 'cash'::text, p_dropoff_point text DEFAULT NULL::text, p_dropoff_custom boolean DEFAULT false, p_pickup_point text DEFAULT NULL::text, p_pickup_custom boolean DEFAULT false)
RETURNS SETOF bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  r public.routes%ROWTYPE;
  v_seat integer;
  v_code text := NULL;
  v_candidate text;
  v_try integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_seat_numbers IS NULL OR cardinality(p_seat_numbers) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un asiento';
  END IF;

  IF p_payment_method NOT IN ('cash', 'transfer') THEN
    RAISE EXCEPTION 'Método de pago no válido';
  END IF;

  SELECT * INTO r FROM public.routes WHERE id = p_route_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF r.driver_id = v_uid THEN
    RAISE EXCEPTION 'No puedes reservar un cupo en tu propio viaje';
  END IF;

  IF r.status <> 'scheduled' OR r.departure_time <= public.now_bogota() THEN
    RAISE EXCEPTION 'Este viaje ya no acepta reservas';
  END IF;

  FOREACH v_seat IN ARRAY p_seat_numbers LOOP
    IF v_seat < 1 OR v_seat > r.total_seats THEN
      RAISE EXCEPTION 'El asiento % no existe en este viaje', v_seat;
    END IF;
  END LOOP;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = 'Reserva vencida sin confirmar'
  WHERE route_id = p_route_id
    AND booking_status = 'pending'
    AND created_at < NOW() - INTERVAL '5 minutes';

  IF r.available_seats < cardinality(p_seat_numbers) THEN
    RAISE EXCEPTION 'No hay suficientes cupos disponibles';
  END IF;

  -- Código de la compra: un intento por candidato, reintenta si ya existe.
  FOR v_try IN 1..10 LOOP
    v_candidate := public.generate_reservation_code();
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE reservation_code = v_candidate) THEN
      v_code := v_candidate;
      EXIT;
    END IF;
  END LOOP;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'No pudimos generar un código de reserva. Intenta de nuevo.';
  END IF;

  BEGIN
    INSERT INTO public.bookings (
      route_id, passenger_id, seat_number, price,
      payment_method, payment_status, booking_status,
      dropoff_point, dropoff_point_custom,
      pickup_point, pickup_point_custom, reservation_code
    )
    SELECT
      p_route_id, v_uid, seat, r.price_per_seat,
      p_payment_method, 'pending', 'pending',
      p_dropoff_point, COALESCE(p_dropoff_custom, false),
      p_pickup_point, COALESCE(p_pickup_custom, false), v_code
    FROM unnest(p_seat_numbers) AS seat;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Uno o más asientos ya fueron reservados. Vuelve a seleccionar.'
      USING ERRCODE = '23505';
  END;

  -- El aviso al conductor ya no se manda aquí -- ver finalize_bookings_atomic.
  RETURN QUERY SELECT * FROM public.bookings WHERE reservation_code = v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_bookings_atomic(p_booking_ids uuid[], p_payment_method text DEFAULT 'card'::text)
RETURNS TABLE(success boolean, message text, updated_bookings_count integer, remaining_seats integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route_id UUID;
  v_total_seats INT;
  v_available_seats INT;
  v_count INT := 0;
  v_driver_id uuid;
  v_origin text;
  v_destination text;
  v_passenger_name text;
BEGIN
  IF auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM bookings
    WHERE id = ANY(p_booking_ids)
      AND passenger_id IS DISTINCT FROM auth.uid()
  ) THEN
    RETURN QUERY SELECT false, 'No autorizado', 0, 0;
    RETURN;
  END IF;

  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE id = ANY(p_booking_ids)
        AND booking_status = 'pending'
    ) THEN
      RETURN QUERY SELECT false, 'Algunos bookings no están en estado pending o no existen', 0, 0;
      RETURN;
    END IF;

    SELECT route_id INTO v_route_id
    FROM bookings
    WHERE id = p_booking_ids[1];

    SELECT total_seats, available_seats, driver_id, origin, destination
      INTO v_total_seats, v_available_seats, v_driver_id, v_origin, v_destination
    FROM routes
    WHERE id = v_route_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_count
    FROM bookings
    WHERE id = ANY(p_booking_ids);

    IF v_available_seats < v_count THEN
      RETURN QUERY SELECT false, 'No hay suficientes asientos disponibles', 0, v_available_seats;
      RETURN;
    END IF;

    UPDATE bookings
    SET booking_status = 'confirmed',
        payment_status = p_payment_method,
        payment_method = p_payment_method,
        updated_at = NOW()
    WHERE id = ANY(p_booking_ids);

    SELECT available_seats INTO v_available_seats
    FROM routes
    WHERE id = v_route_id;

    -- La reserva ya quedó confirmada de verdad (no solo pendiente): ahora sí avisar
    -- al conductor, con la misma redacción que antes traía reserve_seats.
    SELECT name INTO v_passenger_name FROM profiles WHERE id = auth.uid();

    PERFORM notify_user(
      v_driver_id, 'booking', 'Nueva reserva en tu viaje',
      COALESCE(v_passenger_name, 'Un pasajero') || ' reservó ' || v_count ||
        (CASE WHEN v_count = 1 THEN ' cupo' ELSE ' cupos' END) ||
        ' en tu ruta ' || v_origin || ' → ' || v_destination || '.',
      jsonb_build_object('route_id', v_route_id, 'passenger_id', auth.uid())
    );

    RETURN QUERY SELECT true, 'Bookings confirmados exitosamente', v_count, v_available_seats;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error: ' || SQLERRM, 0, 0;
  END;
END;
$function$;
