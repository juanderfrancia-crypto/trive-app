-- Fase 2o: coherencia de los flujos de punta a punta.
-- 1. Tipos de notificación completos (antes faltaban trip_confirm y review_received: el cierre del viaje fallaba).
-- 2. Hora de Colombia en las comparaciones de salida (el servidor corre en UTC).
-- 3. Vista de cupos sin teléfono de conductores, con calificación correcta y cupos reales.
-- 4. El rol de conductor solo lo otorga la verificación de documentos, nunca la API.
-- 5. Vehículo solo con conductor verificado.
-- 6. Aeropuerto: no se acepta una solicitud que ya no está pendiente; se cierran las ofertas abiertas.
-- 7. Eliminación de cuenta cierra solicitudes y ofertas activas.

-- ============================================================
-- 1. Tipos de notificación.
-- ============================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notification_type_check CHECK (type IN (
  'booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending', 'message',
  'trip_published', 'offer_received', 'offer_accepted', 'trip_confirmed', 'trip_started',
  'trip_rated', 'trip_confirm', 'review_received'
));

-- ============================================================
-- 2. Hora de Colombia. Las salidas se guardan en hora local (sin zona).
-- ============================================================
CREATE OR REPLACE FUNCTION public.now_bogota()
RETURNS timestamp
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'America/Bogota')::timestamp;
$$;

DROP POLICY IF EXISTS "Passengers can search public routes" ON public.routes;
CREATE POLICY "Passengers can search public routes" ON public.routes
  FOR SELECT TO authenticated
  USING (status <> 'cancelled' AND available_seats > 0 AND departure_time > public.now_bogota());

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

  IF v_departure <= public.now_bogota() THEN
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

-- Cambios de estado del viaje por el conductor: la salida se compara con la hora de Colombia.
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
        b.passenger_id, 'trip_started', 'Tu viaje ya inició',
        'El conductor inició el viaje.', jsonb_build_object('route_id', p_route_id)
      );
    END LOOP;

  ELSIF p_status = 'completed' THEN
    IF r.status NOT IN ('scheduled', 'in_progress') THEN
      RAISE EXCEPTION 'Este viaje no se puede completar desde su estado actual';
    END IF;
    IF r.departure_time > public.now_bogota() THEN
      RAISE EXCEPTION 'No puedes completar un viaje antes de su hora de salida';
    END IF;

    UPDATE public.routes SET status = 'completed', updated_at = NOW() WHERE id = p_route_id;

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
-- 3. Vista de cupos: sin teléfono, con calificación del conductor (reviewee) y cupos reales.
--    Corre con permisos del usuario que consulta, para respetar las políticas de perfiles.
-- ============================================================
DROP VIEW IF EXISTS public.available_rides;
CREATE VIEW public.available_rides WITH (security_invoker = true) AS
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
  r.updated_at
FROM public.routes r
LEFT JOIN public.profiles p ON p.id = r.driver_id
WHERE r.departure_time > (public.now_bogota() - INTERVAL '15 minutes')
  AND r.departure_time <= (public.now_bogota() + INTERVAL '24 hours')
  AND r.status = 'scheduled'
  AND r.available_seats > 0;

GRANT SELECT ON public.available_rides TO authenticated;

-- ============================================================
-- 4. El rol de conductor solo lo otorga la verificación de documentos.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role NOT IN ('driver', 'passenger') THEN
      RAISE EXCEPTION 'Rol no permitido';
    END IF;
    IF NEW.role = 'driver' AND NEW.driver_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'Para ser conductor debes tener tus documentos aprobados';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Registrar vehículo: solo conductores verificados.
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_vehicle(
  p_plate text,
  p_make text,
  p_year integer,
  p_color text
)
RETURNS public.vehicles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plate text := upper(regexp_replace(COALESCE(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'driver' AND driver_verified = true
  ) THEN
    RAISE EXCEPTION 'Primero debes tener tus documentos aprobados para registrar un vehículo';
  END IF;

  IF v_plate !~ '^[A-Z]{3}[0-9]{3}$' AND v_plate !~ '^[A-Z]{3}[0-9]{2}[A-Z]$' THEN
    RAISE EXCEPTION 'La placa no tiene un formato válido (ejemplo: ABC-123)';
  END IF;

  IF p_year IS NULL OR p_year < 1980 OR p_year > EXTRACT(YEAR FROM NOW())::int + 1 THEN
    RAISE EXCEPTION 'El año del vehículo no es válido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE plate = v_plate AND status IN ('pending', 'verified') AND driver_id <> v_uid
  ) THEN
    RAISE EXCEPTION 'Esta placa ya está registrada por otro conductor';
  END IF;

  BEGIN
    INSERT INTO public.vehicles (driver_id, plate, make, year, color)
    VALUES (v_uid, v_plate, trim(p_make), p_year, trim(p_color))
    RETURNING * INTO v_vehicle;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_vehicle FROM public.vehicles
    WHERE plate = v_plate AND status IN ('pending', 'verified') AND driver_id = v_uid;
  END;

  RETURN v_vehicle;
END;
$$;

-- ============================================================
-- 6. Aeropuerto: una solicitud solo se acepta si sigue pendiente, y al aceptar se cierran las ofertas abiertas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_airport_offer(offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id uuid;
  v_driver_id uuid;
  v_final_price int;
  v_req_status text;
  v_passenger_id uuid;
BEGIN
  SELECT ao.request_id, ao.driver_id, COALESCE(ao.proposed_price, ar.offered_price), ar.status, ar.passenger_id
    INTO v_req_id, v_driver_id, v_final_price, v_req_status, v_passenger_id
  FROM public.airport_offers ao
  JOIN public.airport_requests ar ON ar.id = ao.request_id
  WHERE ao.id = offer_id AND ao.status = 'pending'
  FOR UPDATE OF ar;

  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada o no está pendiente';
  END IF;

  IF v_req_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya no está disponible';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() NOT IN (v_passenger_id, v_driver_id) THEN
    RAISE EXCEPTION 'No autorizado para aceptar esta oferta';
  END IF;

  UPDATE public.airport_requests
  SET driver_id = v_driver_id, offered_price = v_final_price, status = 'accepted', accepted_at = NOW()
  WHERE id = v_req_id;

  UPDATE public.airport_offers SET status = 'accepted', responded_at = NOW() WHERE id = offer_id;

  PERFORM public.create_negotiation_payment(offer_id, 5000);

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE request_id = v_req_id AND id <> offer_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_request_direct(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c_fee constant integer := 5000;
BEGIN
  IF v_uid IS NULL OR NOT public.puede_conducir(v_uid) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada';
  END IF;

  PERFORM 1 FROM public.airport_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta solicitud ya no está disponible';
  END IF;

  UPDATE public.profiles SET balance = balance - c_fee WHERE id = v_uid AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $5.000 de saldo para aceptar este viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'airport_fee');

  UPDATE public.airport_requests
  SET driver_id = v_uid, status = 'accepted', accepted_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.airport_offers (request_id, driver_id, proposed_price, status, responded_at)
  VALUES (p_request_id, v_uid, NULL, 'accepted', NOW());

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE request_id = p_request_id AND status = 'pending';
END;
$$;

-- ============================================================
-- 7. Eliminación de cuenta: también cierra solicitudes y ofertas activas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.anonymize_account(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET booking_status = 'cancelled', cancelled_at = NOW(),
      cancellation_reason = 'Cuenta eliminada', updated_at = NOW()
  WHERE passenger_id = p_uid AND booking_status IN ('pending', 'confirmed');

  UPDATE public.routes SET status = 'cancelled', updated_at = NOW()
  WHERE driver_id = p_uid AND status = 'scheduled';

  UPDATE public.airport_requests SET status = 'cancelled', cancelled_at = NOW()
  WHERE passenger_id = p_uid AND status IN ('pending', 'negotiating', 'accepted');

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE driver_id = p_uid AND status = 'pending';

  DELETE FROM public.notifications WHERE user_id = p_uid;
  DELETE FROM public.user_sessions WHERE user_id = p_uid;
  DELETE FROM public.travel_preferences WHERE user_id = p_uid;
  DELETE FROM public.trip_preferences WHERE user_id = p_uid;
  DELETE FROM public.favorite_routes WHERE user_id = p_uid;
  DELETE FROM public.saved_addresses WHERE user_id = p_uid;
  DELETE FROM public.payment_methods WHERE user_id = p_uid;
  DELETE FROM public.user_notification_preferences WHERE user_id = p_uid;
  DELETE FROM public.user_activity WHERE user_id = p_uid;
  DELETE FROM public.driver_payment_methods WHERE driver_id = p_uid;

  UPDATE public.profiles
  SET name = 'Usuario eliminado', email = NULL, phone = NULL, avatar_url = NULL,
      profile_photo_url = NULL, vehicle_photo_url = NULL, emergency_contact = NULL,
      push_token = NULL, referral_code = NULL, notification_preferences = NULL,
      is_driver = false, is_passenger = false, driver_active = false, updated_at = NOW()
  WHERE id = p_uid;
END;
$$;
