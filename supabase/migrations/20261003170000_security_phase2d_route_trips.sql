-- Fase 2d: viajes por ruta ("Cupos Hoy").
-- Reservas, asientos, cierre del viaje por el conductor, confirmación del pasajero
-- (24 h), cancelaciones y bono de referido. Todo cambio de estado pasa por funciones.

-- ============================================================
-- 1. Estados de reserva y disputas. Se valida con CHECK para que el cliente no
--    pueda escribir estados inválidos.
-- ============================================================
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN ('pending', 'confirmed', 'awaiting_confirmation', 'completed', 'disputed', 'cancelled')) NOT VALID;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'wallet')) NOT VALID;

-- ============================================================
-- 2. El cierre de la ruta ya no marca pagos como completados por su cuenta.
--    Eso lo hace la confirmación del pasajero (o el cierre automático de 24 h).
-- ============================================================
DROP TRIGGER IF EXISTS trg_route_completion_mark_cash_completed ON public.routes;
DROP TRIGGER IF EXISTS trg_route_completion_mark_cash_payments_completed ON public.routes;

-- ============================================================
-- 3. Reservar asientos. El precio sale de la ruta, no del cliente.
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_seat_numbers IS NULL OR cardinality(p_seat_numbers) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un asiento';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card', 'wallet') THEN
    RAISE EXCEPTION 'Método de pago no válido';
  END IF;

  SELECT * INTO r
  FROM public.routes
  WHERE id = p_route_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF r.driver_id = v_uid THEN
    RAISE EXCEPTION 'No puedes reservar un cupo en tu propio viaje';
  END IF;

  IF r.status <> 'scheduled' OR r.departure_time <= NOW() THEN
    RAISE EXCEPTION 'Este viaje ya no acepta reservas';
  END IF;

  FOREACH v_seat IN ARRAY p_seat_numbers LOOP
    IF v_seat < 1 OR v_seat > r.total_seats THEN
      RAISE EXCEPTION 'El asiento % no existe en este viaje', v_seat;
    END IF;
  END LOOP;

  -- Liberar reservas pendientes vencidas (5 minutos) antes de contar.
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

  BEGIN
    RETURN QUERY
    WITH inserted AS (
      INSERT INTO public.bookings (
        route_id, passenger_id, seat_number, price,
        payment_method, payment_status, booking_status,
        dropoff_point, dropoff_point_custom
      )
      SELECT
        p_route_id, v_uid, seat, r.price_per_seat,
        p_payment_method, 'pending', 'pending',
        p_dropoff_point, COALESCE(p_dropoff_custom, false)
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
-- 4. Asientos ocupados de una ruta: solo números, sin datos de pasajeros.
-- ============================================================
CREATE OR REPLACE FUNCTION public.route_occupied_seats(p_route_id uuid)
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(seat_number ORDER BY seat_number), '{}'::integer[])
  FROM public.bookings
  WHERE route_id = p_route_id
    AND (
      booking_status IN ('confirmed', 'awaiting_confirmation', 'completed')
      OR (booking_status = 'pending' AND created_at >= NOW() - INTERVAL '5 minutes')
    );
$$;

-- ============================================================
-- 5. Completar un viaje y crear la confirmación del pasajero.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  VALUES (p_user, p_type, p_title, p_message, p_data, false);
$$;

REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;

-- Marca una reserva como completada y paga al conductor (el trigger handle_booking_completion
-- registra la ganancia al cambiar payment_status). Aplica el bono de referido si corresponde.
CREATE OR REPLACE FUNCTION public.complete_booking_internal(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_passenger_id uuid;
  v_referred_by text;
  v_referrer_id uuid;
  c_bonus constant integer := 2000;
  c_discount constant integer := 1000;
BEGIN
  UPDATE public.bookings
  SET booking_status = 'completed',
      payment_status = 'completed',
      updated_at = NOW()
  WHERE id = p_booking_id
    AND booking_status IN ('awaiting_confirmation', 'disputed');

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT r.driver_id, b.passenger_id
    INTO v_driver_id, v_passenger_id
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id;

  PERFORM public.notify_user(
    v_passenger_id, 'trip_completed', 'Viaje confirmado',
    'Gracias por confirmar tu viaje.',
    jsonb_build_object('booking_id', p_booking_id, 'driver_id', v_driver_id)
  );

  PERFORM public.notify_user(
    v_passenger_id, 'review_pending', '¿Cómo estuvo tu viaje?',
    'Califica a tu conductor.',
    jsonb_build_object('booking_id', p_booking_id, 'driver_id', v_driver_id)
  );

  -- Bono de referido: solo en la primera reserva completada del conductor referido.
  SELECT referred_by INTO v_referred_by FROM public.profiles WHERE id = v_driver_id;

  IF v_referred_by IS NOT NULL
     AND (SELECT COUNT(*) FROM public.bookings b
            JOIN public.routes r ON r.id = b.route_id
           WHERE r.driver_id = v_driver_id AND b.booking_status = 'completed') = 1
     AND NOT EXISTS (
       SELECT 1 FROM public.wallet_transactions
       WHERE user_id = v_driver_id AND type = 'referral_discount'
     ) THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referred_by
      AND id <> v_driver_id;

    IF v_referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + c_bonus WHERE id = v_referrer_id;
      PERFORM public.post_wallet_movement(v_referrer_id, c_bonus, 'referral_bonus');

      UPDATE public.profiles SET balance = balance + c_discount WHERE id = v_driver_id;
      PERFORM public.post_wallet_movement(v_driver_id, c_discount, 'referral_discount');

      PERFORM public.notify_user(
        v_referrer_id, 'trip_update', '¡Referido activo! +$2.000',
        'Tu conductor referido completó su primer viaje. Te acreditamos $2.000 en tu billetera.',
        '{}'::jsonb
      );
      PERFORM public.notify_user(
        v_driver_id, 'trip_update', 'Bienvenido a Trive · $1.000 de regalo',
        'Completaste tu primer viaje como conductor referido. Te devolvimos $1.000.',
        '{}'::jsonb
      );
    END IF;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_booking_internal(uuid)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6. Cambios de estado de la ruta por el conductor (reemplaza el UPDATE directo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.driver_set_route_status(p_route_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.routes%ROWTYPE;
  b record;
BEGIN
  SELECT * INTO r FROM public.routes WHERE id = p_route_id FOR UPDATE;

  IF NOT FOUND OR r.driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_status = 'in_progress' THEN
    IF r.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Este viaje no se puede iniciar desde su estado actual';
    END IF;
    UPDATE public.routes SET status = 'in_progress', updated_at = NOW() WHERE id = p_route_id;

    FOR b IN SELECT passenger_id FROM public.bookings
             WHERE route_id = p_route_id AND booking_status = 'confirmed' LOOP
      PERFORM public.notify_user(
        b.passenger_id, 'trip_update', 'Tu viaje ya inició',
        'El conductor inició el viaje.', jsonb_build_object('route_id', p_route_id)
      );
    END LOOP;

  ELSIF p_status = 'completed' THEN
    IF r.status NOT IN ('scheduled', 'in_progress') THEN
      RAISE EXCEPTION 'Este viaje no se puede completar desde su estado actual';
    END IF;
    IF r.departure_time > NOW() THEN
      RAISE EXCEPTION 'No puedes completar un viaje antes de su hora de salida';
    END IF;

    UPDATE public.routes SET status = 'completed', updated_at = NOW() WHERE id = p_route_id;

    -- El pasajero confirma (24 h). Mientras tanto la reserva queda esperando confirmación.
    UPDATE public.bookings
    SET booking_status = 'awaiting_confirmation',
        updated_at = NOW()
    WHERE route_id = p_route_id
      AND booking_status = 'confirmed';

    FOR b IN SELECT id, passenger_id FROM public.bookings
             WHERE route_id = p_route_id AND booking_status = 'awaiting_confirmation' LOOP
      PERFORM public.notify_user(
        b.passenger_id, 'trip_confirm', '¿Llegaste bien?',
        'El conductor marcó el viaje como completado. Confírmalo en las próximas 24 horas.',
        jsonb_build_object('booking_id', b.id, 'route_id', p_route_id)
      );
    END LOOP;

  ELSIF p_status = 'cancelled' THEN
    IF r.status NOT IN ('scheduled', 'in_progress') THEN
      RAISE EXCEPTION 'Este viaje no se puede cancelar desde su estado actual';
    END IF;

    UPDATE public.routes SET status = 'cancelled', updated_at = NOW() WHERE id = p_route_id;

    FOR b IN SELECT id, passenger_id FROM public.bookings
             WHERE route_id = p_route_id AND booking_status IN ('pending', 'confirmed') LOOP
      UPDATE public.bookings
      SET booking_status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = 'Viaje cancelado por el conductor',
          updated_at = NOW()
      WHERE id = b.id;

      PERFORM public.notify_user(
        b.passenger_id, 'trip_update', 'Viaje cancelado',
        'El conductor canceló el viaje.', jsonb_build_object('route_id', p_route_id)
      );
    END LOOP;

  ELSE
    RAISE EXCEPTION 'Estado no válido';
  END IF;
END;
$$;

-- ============================================================
-- 7. El pasajero confirma o reporta el viaje.
-- ============================================================
CREATE OR REPLACE FUNCTION public.passenger_confirm_trip(p_booking_id uuid, p_arrived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id uuid;
  v_status text;
BEGIN
  SELECT passenger_id, booking_status INTO v_passenger_id, v_status
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_passenger_id IS NULL OR v_passenger_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Este viaje no está pendiente de confirmación';
  END IF;

  IF p_arrived THEN
    PERFORM public.complete_booking_internal(p_booking_id);
  ELSE
    UPDATE public.bookings
    SET booking_status = 'disputed', updated_at = NOW()
    WHERE id = p_booking_id;
  END IF;
END;
$$;

-- Cierre automático: reservas que no se confirmaron en 24 horas.
CREATE OR REPLACE FUNCTION public.auto_confirm_expired_trips()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_count integer := 0;
BEGIN
  FOR b IN SELECT id FROM public.bookings
           WHERE booking_status = 'awaiting_confirmation'
             AND updated_at < NOW() - INTERVAL '24 hours' LOOP
    PERFORM public.complete_booking_internal(b.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_confirm_expired_trips() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 8. Cancelar una reserva por el pasajero (antes de la salida).
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id uuid;
  v_status text;
  v_departure timestamp;
BEGIN
  SELECT b.passenger_id, b.booking_status, r.departure_time
    INTO v_passenger_id, v_status, v_departure
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_passenger_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Esta reserva ya no se puede cancelar';
  END IF;

  IF v_departure <= NOW() THEN
    RAISE EXCEPTION 'No puedes cancelar un viaje que ya salió';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = COALESCE(p_reason, 'Cancelado por el pasajero'),
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- ============================================================
-- 9. Políticas de reservas: cada quien lee lo suyo. Ninguna escritura directa.
-- ============================================================
DROP POLICY IF EXISTS create_own_booking ON public.bookings;
DROP POLICY IF EXISTS read_all_bookings ON public.bookings;
DROP POLICY IF EXISTS update_own_booking ON public.bookings;

CREATE POLICY bookings_passenger_read ON public.bookings
  FOR SELECT TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY bookings_driver_read ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = bookings.route_id AND r.driver_id = auth.uid()
  ));

-- ============================================================
-- 10. Rutas: el conductor ya no escribe el estado directamente.
-- ============================================================
DROP POLICY IF EXISTS "Drivers can update own routes" ON public.routes;
DROP POLICY IF EXISTS "Drivers can update their own routes" ON public.routes;
DROP POLICY IF EXISTS "Drivers can update own routes" ON public.routes;
DROP POLICY IF EXISTS "Drivers can delete own routes" ON public.routes;

-- ============================================================
-- 11. Punto de destino de reservas pendientes del pasajero.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_booking_dropoff(
  p_booking_ids uuid[],
  p_dropoff_point text,
  p_dropoff_custom boolean DEFAULT false
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
  SET dropoff_point = p_dropoff_point,
      dropoff_point_custom = COALESCE(p_dropoff_custom, false),
      updated_at = NOW()
  WHERE id = ANY(p_booking_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 12. El conductor cancela una reserva de su viaje (ej. pasajero no llegó).
-- ============================================================
CREATE OR REPLACE FUNCTION public.driver_cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_status text;
  v_passenger_id uuid;
BEGIN
  SELECT r.driver_id, b.booking_status, b.passenger_id
    INTO v_driver_id, v_status, v_passenger_id
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Esta reserva ya no se puede cancelar';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = COALESCE(p_reason, 'Cancelado por el conductor'),
      updated_at = NOW()
  WHERE id = p_booking_id;

  PERFORM public.notify_user(
    v_passenger_id, 'trip_update', 'Reserva cancelada',
    'El conductor canceló tu reserva.', jsonb_build_object('booking_id', p_booking_id)
  );
END;
$$;

-- ============================================================
-- 13. Datos del vehículo del conductor en sus rutas activas.
--     (Se reemplaza en la fase de vehículos por una tabla propia.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_driver_vehicle(
  p_make text,
  p_year integer,
  p_plate text,
  p_color text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.puede_conducir(auth.uid()) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada';
  END IF;

  UPDATE public.routes
  SET vehicle_make = p_make,
      vehicle_year = p_year,
      vehicle_plate = upper(p_plate),
      vehicle_color = p_color,
      updated_at = NOW()
  WHERE driver_id = auth.uid()
    AND status = 'scheduled';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 14. Calificaciones de viajes por ruta: solo entre participantes de una reserva
--     completada, una vez por participante. El promedio lo calcula el servidor.
-- ============================================================
DROP POLICY IF EXISTS "Users can write reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own review" ON public.reviews;

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

  SELECT AVG(rating) INTO v_avg FROM public.reviews WHERE reviewee_id = v_reviewee;
  UPDATE public.profiles SET rating = ROUND(v_avg, 2) WHERE id = v_reviewee;

  PERFORM public.notify_user(
    v_reviewee, 'review_received', 'Nueva calificación recibida',
    'Recibiste una calificación de ' || p_rating || '/5.',
    jsonb_build_object('booking_id', p_booking_id, 'rating', p_rating)
  );
END;
$$;
