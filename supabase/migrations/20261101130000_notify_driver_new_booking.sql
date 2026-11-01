-- Cuando un pasajero reserva un cupo, el conductor nunca se enteraba: ni push ni aviso
-- en la app. reserve_seats() creaba la reserva pero no llamaba a notify_user() para nadie,
-- y ningún trigger de bookings lo hacía tampoco (confirmado revisando los 6 triggers de
-- esa tabla el 2026-11-01: ninguno toca notifications). No es que la notificación fallara,
-- es que nunca se construyó. Mismo cuerpo de reserve_seats que 20261028100000, solo se
-- agrega el aviso al conductor justo después de que la reserva se guarda con éxito.

CREATE OR REPLACE FUNCTION public.reserve_seats(
  p_route_id uuid,
  p_seat_numbers integer[],
  p_payment_method text DEFAULT 'cash',
  p_dropoff_point text DEFAULT NULL,
  p_dropoff_custom boolean DEFAULT false,
  p_pickup_point text DEFAULT NULL,
  p_pickup_custom boolean DEFAULT false
)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.routes%ROWTYPE;
  v_seat integer;
  v_code text := NULL;
  v_candidate text;
  v_try integer;
  v_passenger_name text;
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

  -- La reserva se guardó con éxito (si hubiera fallado, la excepción de arriba habría
  -- detenido todo antes de llegar aquí): ahora sí avisar al conductor.
  SELECT name INTO v_passenger_name FROM public.profiles WHERE id = v_uid;

  PERFORM public.notify_user(
    r.driver_id, 'new_booking', 'Nueva reserva en tu viaje',
    COALESCE(v_passenger_name, 'Un pasajero') || ' reservó ' || cardinality(p_seat_numbers) ||
      (CASE WHEN cardinality(p_seat_numbers) = 1 THEN ' cupo' ELSE ' cupos' END) ||
      ' en tu ruta ' || r.origin || ' → ' || r.destination || '.',
    jsonb_build_object('route_id', p_route_id, 'passenger_id', v_uid)
  );

  RETURN QUERY SELECT * FROM public.bookings WHERE reservation_code = v_code;
END;
$$;
