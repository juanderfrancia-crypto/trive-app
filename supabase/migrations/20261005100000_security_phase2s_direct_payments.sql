-- Fase 2s: pago directo al conductor y código de reserva.
-- Trive NO retiene ni procesa dinero de pasajeros. El pago al conductor es en efectivo
-- o por transferencia (Nequi, Daviplata o Bre-B), directamente entre las dos personas.
-- 1. Métodos de pago de pasajero: 'cash' y 'transfer'. Tarjeta y billetera se rechazan.
-- 2. Código de reserva por COMPRA (TRV-XXXXXX), compartido por todos sus asientos.
-- 3. Marcas de pago: el pasajero informa que pagó; el conductor confirma que recibió.

-- ============================================================
-- 1. Métodos de pago válidos para reservas nuevas.
-- ============================================================
-- La restricción anterior (2d) era NOT VALID, pero Postgres la vuelve a evaluar en cada
-- UPDATE de la fila: una reserva vieja con 'card' no se podía cancelar ni completar.
-- Por eso se reemplaza por un disparador que valida solo al insertar o cuando cambia
-- payment_method. Las reservas anteriores siguen funcionando sin tocarlas.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;

CREATE OR REPLACE FUNCTION public.bookings_guard_payment_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_method IS NOT NULL
     AND NEW.payment_method NOT IN ('cash', 'transfer')
     AND (TG_OP = 'INSERT' OR NEW.payment_method IS DISTINCT FROM OLD.payment_method) THEN
    RAISE EXCEPTION 'Método de pago no válido' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_guard_payment_method ON public.bookings;
CREATE TRIGGER bookings_guard_payment_method
  BEFORE INSERT OR UPDATE OF payment_method ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_payment_method();

-- ============================================================
-- 2. Columnas nuevas en bookings.
-- ============================================================
-- reservation_code: una compra = un código, repetido en todos sus asientos. Alfabeto sin 0, O, 1, I, L.
-- Criterio: las reservas anteriores a esta fase quedan con NULL (no hay backfill).
-- Unicidad entre compras: la garantiza reserve_seats comprobando que el código no exista
-- antes de insertar (bucle con reintento). No se usa un índice UNIQUE porque una compra
-- tiene varios asientos con el mismo código. El índice es solo de búsqueda.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reservation_code text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_marked_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_reservation_code_format;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_reservation_code_format
  CHECK (reservation_code ~ '^TRV-[A-HJ-KM-NP-Z2-9]{6}$');

CREATE INDEX IF NOT EXISTS bookings_reservation_code_idx
  ON public.bookings (reservation_code) WHERE reservation_code IS NOT NULL;

-- Genera un código candidato TRV-XXXXXX. 31 caracteres: A-Z sin I, L, O, más 2-9.
-- Usa bytes de gen_random_uuid() y descarta los bytes >= 248 (31 * 8) para evitar sesgo.
CREATE OR REPLACE FUNCTION public.generate_reservation_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_out text := '';
  v_bytes bytea;
  v_byte integer;
  i integer;
BEGIN
  WHILE length(v_out) < 6 LOOP
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    FOR i IN 0..15 LOOP
      v_byte := get_byte(v_bytes, i);
      IF v_byte < 248 THEN
        v_out := v_out || substr(v_alphabet, (v_byte % 31) + 1, 1);
        EXIT WHEN length(v_out) >= 6;
      END IF;
    END LOOP;
  END LOOP;
  RETURN 'TRV-' || v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_reservation_code() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. Reservar: una compra, un código; solo efectivo o transferencia.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_seats(
  p_route_id uuid,
  p_seat_numbers integer[],
  p_payment_method text DEFAULT 'cash',
  p_dropoff_point text DEFAULT NULL,
  p_dropoff_custom boolean DEFAULT false
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
    RETURN QUERY
    WITH inserted AS (
      INSERT INTO public.bookings (
        route_id, passenger_id, seat_number, price,
        payment_method, payment_status, booking_status,
        dropoff_point, dropoff_point_custom, reservation_code
      )
      SELECT
        p_route_id, v_uid, seat, r.price_per_seat,
        p_payment_method, 'pending', 'pending',
        p_dropoff_point, COALESCE(p_dropoff_custom, false), v_code
      FROM unnest(p_seat_numbers) AS seat
      RETURNING *
    )
    SELECT * FROM inserted;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Uno o más asientos ya fueron reservados. Vuelve a seleccionar.'
      USING ERRCODE = '23505';
  END;
END;
$$;

-- ============================================================
-- 4. Pasajero informa que pagó (solo sus reservas con ese código).
-- ============================================================
CREATE OR REPLACE FUNCTION public.passenger_mark_paid(p_reservation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_driver uuid;
  v_first boolean;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No autorizado');
  END IF;

  v_first := EXISTS (
    SELECT 1 FROM public.bookings
    WHERE reservation_code = p_reservation_code
      AND passenger_id = v_uid
      AND payment_marked_at IS NULL
      AND booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed')
  );

  UPDATE public.bookings
  SET payment_marked_at = COALESCE(payment_marked_at, now())
  WHERE reservation_code = p_reservation_code
    AND passenger_id = v_uid
    AND booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed');
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No encontramos una reserva tuya con ese código');
  END IF;

  IF v_first THEN
    SELECT r.driver_id INTO v_driver
    FROM public.bookings b JOIN public.routes r ON r.id = b.route_id
    WHERE b.reservation_code = p_reservation_code
    LIMIT 1;

    PERFORM public.notify_user(
      v_driver, 'booking', 'Pago informado',
      'Un pasajero informó que pagó la reserva ' || p_reservation_code || '. Confírmalo al recibirlo.',
      jsonb_build_object('reservation_code', p_reservation_code)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'Pago informado. El conductor lo confirmará al recibirlo.');
END;
$$;

-- ============================================================
-- 5. Conductor confirma (o no) que recibió el pago de una compra de su viaje.
--    No cambia booking_status. Si no recibió, queda aviso al pasajero (notificación).
-- ============================================================
CREATE OR REPLACE FUNCTION public.driver_confirm_payment(p_reservation_code text, p_received boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger uuid;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No autorizado');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.routes r ON r.id = b.route_id
    WHERE b.reservation_code = p_reservation_code AND r.driver_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No encontramos una reserva de tu viaje con ese código');
  END IF;

  IF p_received THEN
    UPDATE public.bookings b
    SET payment_confirmed_at = COALESCE(b.payment_confirmed_at, now())
    FROM public.routes r
    WHERE r.id = b.route_id
      AND r.driver_id = v_uid
      AND b.reservation_code = p_reservation_code
      AND b.booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed');
    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count = 0 THEN
      RETURN jsonb_build_object('ok', false, 'message', 'La reserva no está activa');
    END IF;

    RETURN jsonb_build_object('ok', true, 'message', 'Pago confirmado');
  END IF;

  SELECT b.passenger_id INTO v_passenger
  FROM public.bookings b
  WHERE b.reservation_code = p_reservation_code
  LIMIT 1;

  PERFORM public.notify_user(
    v_passenger, 'booking', 'Pago no recibido',
    'El conductor aún no registra tu pago de la reserva ' || p_reservation_code || '. Revísalo con él.',
    jsonb_build_object('reservation_code', p_reservation_code)
  );

  RETURN jsonb_build_object('ok', true, 'message', 'Registrado: el pago no fue recibido. Se avisó al pasajero.');
END;
$$;

-- ============================================================
-- 6. Permisos: solo usuarios con sesión.
-- ============================================================
REVOKE ALL ON FUNCTION public.passenger_mark_paid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.passenger_mark_paid(text) TO authenticated;

REVOKE ALL ON FUNCTION public.driver_confirm_payment(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_confirm_payment(text, boolean) TO authenticated;
