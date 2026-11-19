-- Las tarifas de plataforma pasan de un monto fijo a un modelo escalonado por valor:
--   * Publicar ruta: $2.500 fijo hasta $32.000 de valor total (precio_por_cupo * total_seats),
--     luego 7,8125% de ese valor, con techo de $20.000.
--   * Aceptar viaje personalizado (oferta o directo): 10% del valor acordado del viaje,
--     piso $3.000, techo $25.000.
-- Los reembolsos dejan de asumir un monto fijo: ahora leen el monto real que se cobró
-- (wallet_transactions / negotiation_payments), porque la tarifa ya no es constante.

-- ============================================================
-- 1. Calculadoras puras, usadas por las funciones de cobro.
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_route_fee(p_price_per_seat numeric, p_total_seats integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(20000, GREATEST(2500, ROUND(p_price_per_seat * p_total_seats * 0.078125)))::integer;
$$;

CREATE OR REPLACE FUNCTION public.calculate_trip_accept_fee(p_trip_value numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(25000, GREATEST(3000, ROUND(p_trip_value * 0.10)))::integer;
$$;

REVOKE ALL ON FUNCTION public.calculate_route_fee(numeric, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.calculate_trip_accept_fee(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_route_fee(numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_trip_accept_fee(numeric) TO authenticated;

-- ============================================================
-- 2. Publicar ruta: la tarifa ahora depende del valor total de la ruta.
--    (Última versión previa: 20261008230000_route_path_and_dropoff.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_route(p_route jsonb)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_vehicle public.vehicles%ROWTYPE;
  v_route public.routes;
  v_price_per_seat numeric := (p_route->>'price_per_seat')::numeric;
  v_total_seats integer := (p_route->>'total_seats')::integer;
  v_fee integer;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'driver' AND driver_verified = true
  ) THEN
    RAISE EXCEPTION 'Tus documentos deben estar aprobados para publicar viajes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = v_uid AND national_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Registra tu número de cédula para publicar viajes';
  END IF;

  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE driver_id = v_uid AND is_active AND status = 'verified';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu vehículo debe estar aprobado para publicar viajes';
  END IF;

  v_fee := public.calculate_route_fee(v_price_per_seat, v_total_seats);

  INSERT INTO public.routes (
    driver_id, vehicle_id, origin, destination, departure_time, arrival_time,
    price_per_seat, total_seats, available_seats, status, description,
    pickup_point, pickup_point_custom, vehicle_type,
    vehicle_plate, vehicle_make, vehicle_year, vehicle_color,
    route_via, dropoff_point
  )
  VALUES (
    v_uid, v_vehicle.id,
    p_route->>'origin',
    p_route->>'destination',
    (p_route->>'departure_time')::timestamp,
    NULLIF(p_route->>'arrival_time', '')::timestamp,
    v_price_per_seat,
    v_total_seats,
    v_total_seats,
    'scheduled',
    NULLIF(p_route->>'description', ''),
    NULLIF(p_route->>'pickup_point', ''),
    COALESCE((p_route->>'pickup_point_custom')::boolean, false),
    NULLIF(p_route->>'vehicle_type', ''),
    v_vehicle.plate,
    v_vehicle.make,
    v_vehicle.year,
    v_vehicle.color,
    NULLIF(p_route->>'route_via', ''),
    NULLIF(p_route->>'dropoff_point', '')
  )
  RETURNING * INTO v_route;

  UPDATE public.profiles SET balance = balance - v_fee WHERE id = v_uid AND balance >= v_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $% de saldo para publicar este viaje', replace(to_char(v_fee, 'FM999,999'), ',', '.');
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, route_id)
  VALUES (v_uid, -v_fee, 'route_fee', 'approved', v_route.id);

  RETURN v_route;
END;
$$;

-- ============================================================
-- 3. Cancelación del conductor: el reembolso lee el monto real cobrado a ESTA ruta,
--    no un monto fijo (antes era c_fee := 2000 también en el mensaje y el reembolso).
-- ============================================================
CREATE OR REPLACE FUNCTION public.driver_cancel_route(p_route_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.routes%ROWTYPE;
  b record;
  c_daily_limit constant integer := 3;
  v_fee_paid integer;
  v_has_bookings boolean;
  v_already_refunded boolean;
  v_refunds_today integer;
  v_refunded boolean := false;
  v_message text;
BEGIN
  SELECT * INTO r FROM public.routes WHERE id = p_route_id FOR UPDATE;

  IF NOT FOUND OR r.driver_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF r.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Este viaje ya no se puede cancelar desde su estado actual';
  END IF;

  v_has_bookings := EXISTS (
    SELECT 1 FROM public.bookings
    WHERE route_id = p_route_id
      AND booking_status IN ('pending', 'confirmed', 'awaiting_confirmation')
  );

  SELECT (-amount) INTO v_fee_paid
  FROM public.wallet_transactions
  WHERE route_id = p_route_id AND type = 'route_fee'
  ORDER BY created_at DESC
  LIMIT 1;

  v_already_refunded := EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE route_id = p_route_id AND type = 'route_fee_refund'
  );

  SELECT count(*) INTO v_refunds_today
  FROM public.wallet_transactions
  WHERE user_id = v_uid
    AND type = 'route_fee_refund'
    AND (created_at AT TIME ZONE 'America/Bogota') >= date_trunc('day', public.now_bogota());

  IF NOT v_has_bookings
     AND v_fee_paid IS NOT NULL
     AND NOT v_already_refunded
     AND r.departure_time > public.now_bogota()
     AND v_refunds_today < c_daily_limit THEN
    v_refunded := true;
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

  IF v_refunded THEN
    UPDATE public.profiles SET balance = balance + v_fee_paid WHERE id = v_uid;
    INSERT INTO public.wallet_transactions (user_id, amount, type, status, route_id)
    VALUES (v_uid, v_fee_paid, 'route_fee_refund', 'approved', p_route_id);
    v_message := 'Ruta cancelada. Te devolvimos $' || replace(to_char(v_fee_paid, 'FM999,999'), ',', '.') || ' a tu saldo.';
  ELSIF v_has_bookings THEN
    v_message := 'Ruta cancelada. Tenías reservas, así que la tarifa de publicación no se devuelve.';
  ELSIF v_refunds_today >= c_daily_limit THEN
    v_message := 'Ruta cancelada. Ya llegaste al límite de devoluciones de hoy; la tarifa no se devuelve.';
  ELSE
    v_message := 'Ruta cancelada. La tarifa de publicación no se devuelve.';
  END IF;

  RETURN jsonb_build_object('refunded', v_refunded, 'message', v_message);
END;
$$;

-- ============================================================
-- 4. Aceptar oferta negociada de viaje personalizado: la comisión ahora
--    depende del precio final acordado, no de un monto fijo.
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

  PERFORM public.create_negotiation_payment(offer_id, public.calculate_trip_accept_fee(v_final_price));

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE request_id = v_req_id AND id <> offer_id AND status = 'pending';
END;
$$;

-- ============================================================
-- 5. Aceptar solicitud directa (sin contraoferta): la comisión depende del
--    precio ofrecido por el pasajero. Ahora SÍ deja registro en negotiation_payments
--    (antes no, lo que dejaba a cancel_airport_request sin dónde leer el monto real).
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_request_direct(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offered_price int;
  v_fee integer;
  v_offer_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.puede_conducir(v_uid) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada';
  END IF;

  SELECT offered_price INTO v_offered_price
  FROM public.airport_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta solicitud ya no está disponible';
  END IF;

  v_fee := public.calculate_trip_accept_fee(v_offered_price);

  UPDATE public.profiles SET balance = balance - v_fee WHERE id = v_uid AND balance >= v_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $% de saldo para aceptar este viaje', replace(to_char(v_fee, 'FM999,999'), ',', '.');
  END IF;

  UPDATE public.airport_requests
  SET driver_id = v_uid, status = 'accepted', accepted_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.airport_offers (request_id, driver_id, proposed_price, status, responded_at)
  VALUES (p_request_id, v_uid, NULL, 'accepted', NOW())
  RETURNING id INTO v_offer_id;

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE request_id = p_request_id AND id <> v_offer_id AND status = 'pending';

  INSERT INTO public.negotiation_payments (
    request_id, driver_id, offer_id, amount, status, deducted_at, reason
  ) VALUES (
    p_request_id, v_uid, v_offer_id, v_fee, 'deducted', NOW(),
    'Comisión de aceptación directa de viaje'
  );

  PERFORM public.post_wallet_movement(v_uid, -v_fee, 'airport_fee');
END;
$$;

-- ============================================================
-- 6. Cancelar solicitud de viaje personalizado: el reembolso lee el monto
--    realmente cobrado (negotiation_payments.amount), no un fijo de $5.000.
--    (Última versión previa: 20261102120000_notificaciones_completas.sql)
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
  v_fee_paid integer;
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
      SELECT amount INTO v_fee_paid
      FROM public.negotiation_payments
      WHERE request_id = r.id AND status = 'deducted'
      ORDER BY deducted_at DESC
      LIMIT 1;

      IF v_fee_paid IS NOT NULL THEN
        UPDATE public.profiles
        SET balance = balance + v_fee_paid
        WHERE id = r.driver_id;

        PERFORM public.post_wallet_movement(r.driver_id, v_fee_paid, 'airport_refund');

        UPDATE public.negotiation_payments
        SET status = 'refunded'
        WHERE request_id = r.id
          AND status = 'deducted';
      END IF;

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
