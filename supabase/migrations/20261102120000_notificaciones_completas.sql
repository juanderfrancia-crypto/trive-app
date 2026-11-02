-- Auditoría completa de notificaciones (push + internas), 2026-11-02.
--
-- 1. Nueva columna notifications.send_push (default true): permite insertar una
--    notificación que solo queda en el centro de notificaciones de la app, sin
--    disparar push — para autoconfirmaciones donde el usuario ya está viendo el
--    resultado de su propia acción en pantalla (publicó su ruta, confirmó su
--    reserva, publicó su solicitud). El trigger de push ahora filtra por esta
--    columna antes de llamar a send-push.
--
-- 2. Cinco huecos reales donde nadie se enteraba de algo importante:
--    a) Un pasajero cancela su propio cupo -> el conductor no se enteraba.
--    b) Un pasajero marca "no llegué bien" (disputa) -> el conductor no se enteraba.
--    c) Un pasajero rechaza la oferta de un conductor -> el conductor no se enteraba.
--    d) Un pasajero sube el precio de su solicitud de aeropuerto ("Subir oferta")
--       -> no insertaba ninguna notificación, solo un broadcast de Realtime que
--       nadie en el código escuchaba (verificado: ningún archivo se suscribe al
--       canal price_update_<id>). update_airport_request_price() tampoco estaba
--       versionada en ninguna migración (vivía solo en producción) — queda
--       incorporada aquí.
--    e) cancel_airport_request() nunca notificaba desde el servidor (dependía
--       enteramente del cliente, que además solo cubría el caso "conductor ya
--       asignado" y se perdía si la app se cerraba justo después de cancelar).
--       También faltaba el caso inverso: si el CONDUCTOR cancela una solicitud ya
--       aceptada, el pasajero no se enteraba de nada.
--
-- 3. Limpieza: se deja de depender del cliente para estas notificaciones server-side
--    (más confiable: si la app se cierra justo después de la llamada RPC, la
--    notificación ya quedó garantizada en la misma transacción).

-- ============================================================
-- 1. send_push + filtro del trigger de push.
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS send_push boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_payload jsonb;
  v_records jsonb;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_secret_send_push';

  IF v_secret IS NULL THEN
    RAISE WARNING 'webhook_secret_send_push no existe en Vault; no se envía push';
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(to_jsonb(n)) INTO v_records FROM new_table n WHERE n.send_push;

  IF v_records IS NULL THEN
    RETURN NULL;
  END IF;

  v_payload := jsonb_build_object(
    'type', 'INSERT_BATCH',
    'records', v_records,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA
  );

  PERFORM net.http_post(
    url := 'https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/send-push',
    body := v_payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 10000
  );

  RETURN NULL;
END;
$$;

-- ============================================================
-- 2a. Pasajero cancela su propia reserva -> avisar al conductor.
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
  v_driver_id uuid;
  v_route_id uuid;
  v_origin text;
  v_destination text;
  v_seat integer;
BEGIN
  SELECT b.passenger_id, b.booking_status, r.departure_time, r.driver_id, r.id, r.origin, r.destination, b.seat_number
    INTO v_passenger_id, v_status, v_departure, v_driver_id, v_route_id, v_origin, v_destination, v_seat
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

  PERFORM public.notify_user(
    v_driver_id, 'trip_update', 'Un pasajero canceló su reserva',
    'El asiento ' || v_seat || ' de tu viaje ' || v_origin || ' → ' || v_destination || ' quedó libre de nuevo.',
    jsonb_build_object('booking_id', p_booking_id, 'route_id', v_route_id)
  );
END;
$$;

-- ============================================================
-- 2b. Pasajero marca "no llegué bien" (disputa) -> avisar al conductor.
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
  v_driver_id uuid;
  v_origin text;
  v_destination text;
BEGIN
  SELECT b.passenger_id, b.booking_status, r.driver_id, r.origin, r.destination
    INTO v_passenger_id, v_status, v_driver_id, v_origin, v_destination
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id
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

    PERFORM public.notify_user(
      v_driver_id, 'trip_update', 'Un pasajero reportó un problema',
      'Un pasajero dijo que no llegó bien en tu viaje ' || v_origin || ' → ' || v_destination || '. Contáctalo para resolverlo.',
      jsonb_build_object('booking_id', p_booking_id)
    );
  END IF;
END;
$$;

-- ============================================================
-- 2c. Pasajero rechaza la oferta de un conductor -> avisar al conductor.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_airport_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id uuid;
  v_driver_id uuid;
  v_request_id uuid;
  v_status text;
  v_origin text;
  v_destination text;
BEGIN
  SELECT ar.passenger_id, ao.driver_id, ao.request_id, ao.status, ar.origin, ar.destination
    INTO v_passenger_id, v_driver_id, v_request_id, v_status, v_origin, v_destination
  FROM public.airport_offers ao
  JOIN public.airport_requests ar ON ar.id = ao.request_id
  WHERE ao.id = p_offer_id
  FOR UPDATE OF ao;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_passenger_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta oferta ya no está pendiente';
  END IF;

  UPDATE public.airport_offers
  SET status = 'rejected',
      responded_at = NOW()
  WHERE id = p_offer_id;

  PERFORM public.notify_user(
    v_driver_id, 'trip_update', 'Oferta no aceptada',
    'El pasajero no aceptó tu oferta para ' || v_origin || ' → ' || v_destination || '.',
    jsonb_build_object('request_id', v_request_id)
  );
END;
$$;

-- ============================================================
-- 2d. Pasajero sube el precio de su solicitud ("Subir oferta") -> avisar a los
--     conductores con oferta pendiente en esa solicitud. Esta función vivía solo
--     en producción, sin migración que la versionara; queda incorporada aquí.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_airport_request_price(request_id uuid, new_price integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.airport_requests%ROWTYPE;
  o record;
BEGIN
  IF new_price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  UPDATE public.airport_requests
  SET offered_price = new_price,
      price_updated_at = NOW()
  WHERE id = request_id
    AND status = 'pending'
    AND passenger_id = auth.uid()
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el precio. Verifica que la solicitud existe y está pendiente.';
  END IF;

  FOR o IN SELECT DISTINCT driver_id FROM public.airport_offers
           WHERE airport_offers.request_id = r.id AND status = 'pending' LOOP
    PERFORM public.notify_user(
      o.driver_id, 'trip_update', 'El pasajero subió el precio',
      r.origin || ' → ' || r.destination || ': nuevo precio $' || to_char(new_price, 'FM999G999G999') || '.',
      jsonb_build_object('request_id', r.id, 'new_price', new_price)
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_airport_request_price(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_airport_request_price(uuid, integer) TO authenticated;

-- ============================================================
-- 2e. Cancelación de una solicitud de aeropuerto: ahora notifica desde el
--     servidor (ya no depende del cliente) y cubre los dos sentidos:
--     pasajero cancela (avisa al conductor asignado, o a los que tenían oferta
--     pendiente si aún no había conductor) y conductor cancela (avisa al pasajero).
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_airport_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.airport_requests%ROWTYPE;
  c_fee constant integer := 5000;
  o record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO r
  FROM public.airport_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  IF r.status IN ('cancelled', 'completed', 'in_progress') THEN
    RAISE EXCEPTION 'Esta solicitud ya no se puede cancelar';
  END IF;

  IF v_uid = r.passenger_id THEN
    IF r.status = 'accepted' AND r.driver_id IS NOT NULL THEN
      UPDATE public.profiles
      SET balance = balance + c_fee
      WHERE id = r.driver_id;

      PERFORM public.post_wallet_movement(r.driver_id, c_fee, 'airport_refund');

      UPDATE public.negotiation_payments
      SET status = 'refunded'
      WHERE request_id = r.id
        AND status = 'deducted';

      PERFORM public.notify_user(
        r.driver_id, 'trip_update', 'Solicitud cancelada',
        'El pasajero canceló la solicitud de ' || r.origin || ' → ' || r.destination || '.',
        jsonb_build_object('request_id', r.id)
      );
    ELSE
      FOR o IN SELECT DISTINCT driver_id FROM public.airport_offers
               WHERE airport_offers.request_id = r.id AND status = 'pending' LOOP
        PERFORM public.notify_user(
          o.driver_id, 'trip_update', 'Solicitud cancelada',
          'El pasajero canceló la solicitud de ' || r.origin || ' → ' || r.destination || '.',
          jsonb_build_object('request_id', r.id)
        );
      END LOOP;
    END IF;
  ELSIF v_uid = r.driver_id AND r.status = 'accepted' THEN
    -- El conductor cancela: sin reembolso, pero el pasajero debe enterarse.
    PERFORM public.notify_user(
      r.passenger_id, 'trip_update', 'El conductor canceló',
      'Tu conductor canceló el viaje de ' || r.origin || ' → ' || r.destination || '. Puedes buscar otro conductor.',
      jsonb_build_object('request_id', r.id)
    );
  ELSE
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.airport_requests
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = r.id;
END;
$$;
