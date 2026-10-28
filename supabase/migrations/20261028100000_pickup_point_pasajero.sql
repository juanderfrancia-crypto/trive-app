-- Punto de recogida personalizado del pasajero (simétrico al punto de llegada ya existente).
-- Caso real: el conductor publica "Puerto Tejada → Cali" pero el pasajero está en un sector
-- como Ciudad del Sur, afuera del casco urbano, vía a Cali. Hoy el pasajero puede elegir un
-- punto de LLEGADA distinto al destino final (dropoff_point), pero no uno de RECOGIDA distinto
-- al origen. Se corrige esa asimetría con las mismas columnas/patrón que dropoff_point.

-- ============================================================
-- 1. Columnas nuevas en bookings.
-- ============================================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_point text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_point_custom boolean DEFAULT false;

-- ============================================================
-- 2. reserve_seats: acepta el punto de recogida al crear la reserva.
--    CREATE OR REPLACE no permite agregar parámetros a una función ya existente
--    (cambia su firma, quedaría como una sobrecarga aparte) -> se elimina primero.
-- ============================================================
DROP FUNCTION IF EXISTS public.reserve_seats(uuid, integer[], text, text, boolean);

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
        dropoff_point, dropoff_point_custom,
        pickup_point, pickup_point_custom, reservation_code
      )
      SELECT
        p_route_id, v_uid, seat, r.price_per_seat,
        p_payment_method, 'pending', 'pending',
        p_dropoff_point, COALESCE(p_dropoff_custom, false),
        p_pickup_point, COALESCE(p_pickup_custom, false), v_code
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
-- 3. set_booking_pickup: para reservas que ya existen como 'pending'
--    (mismo patrón exacto de set_booking_dropoff, sin REVOKE adicional:
--    el candado real es el chequeo de passenger_id/estado adentro de la función).
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_booking_pickup(
  p_booking_ids uuid[],
  p_pickup_point text,
  p_pickup_custom boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = ANY(p_booking_ids)
      AND (passenger_id IS DISTINCT FROM auth.uid() OR booking_status <> 'pending')
  ) THEN
    RAISE EXCEPTION 'No autorizado o reserva no pendiente';
  END IF;

  UPDATE public.bookings
  SET pickup_point = p_pickup_point,
      pickup_point_custom = COALESCE(p_pickup_custom, false),
      updated_at = NOW()
  WHERE id = ANY(p_booking_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
