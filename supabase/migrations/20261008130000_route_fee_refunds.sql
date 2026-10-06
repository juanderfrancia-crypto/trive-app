-- Devolución de la tarifa de publicación ($2.000), con el ancla en "Salir".
-- Reglas (ver docs/security/LEGAL_POLITICA_REEMBOLSOS.md, sección 2):
--   * Cancelar antes de salir, sin reservas: devolución automática (máximo 3 al día).
--   * Cancelar con reservas, o después de salir o de la hora: sin devolución.
--   * Ruta que pasa la hora sin salir (con 60 min de gracia): se cierra sola, sin devolución.

-- 1. Cada movimiento de la billetera queda ligado a su ruta.
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL;

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'recharge', 'route_fee', 'route_fee_refund', 'airport_fee', 'airport_refund',
    'referral_bonus', 'referral_discount', 'admin_credit', 'admin_debit'
  ]::text[]));

-- 2. Publicar ruta: igual que antes, pero el cobro queda ligado a la ruta creada.
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
  c_fee constant integer := 2000;
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

  INSERT INTO public.routes (
    driver_id, vehicle_id, origin, destination, departure_time, arrival_time,
    price_per_seat, total_seats, available_seats, status, description,
    pickup_point, pickup_point_custom, vehicle_type,
    vehicle_plate, vehicle_make, vehicle_year, vehicle_color
  )
  VALUES (
    v_uid, v_vehicle.id,
    p_route->>'origin',
    p_route->>'destination',
    (p_route->>'departure_time')::timestamp,
    NULLIF(p_route->>'arrival_time', '')::timestamp,
    (p_route->>'price_per_seat')::numeric,
    (p_route->>'total_seats')::integer,
    (p_route->>'total_seats')::integer,
    'scheduled',
    NULLIF(p_route->>'description', ''),
    NULLIF(p_route->>'pickup_point', ''),
    COALESCE((p_route->>'pickup_point_custom')::boolean, false),
    NULLIF(p_route->>'vehicle_type', ''),
    v_vehicle.plate,
    v_vehicle.make,
    v_vehicle.year,
    v_vehicle.color
  )
  RETURNING * INTO v_route;

  UPDATE public.profiles SET balance = balance - c_fee WHERE id = v_uid AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $2.000 de saldo para publicar un viaje';
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, route_id)
  VALUES (v_uid, -c_fee, 'route_fee', 'approved', v_route.id);

  RETURN v_route;
END;
$$;

-- 3. Cancelación del conductor con la regla de devolución.
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
  c_fee constant integer := 2000;
  c_daily_limit constant integer := 3;
  v_has_bookings boolean;
  v_fee_paid boolean;
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

  v_fee_paid := EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE route_id = p_route_id AND type = 'route_fee' AND amount = -c_fee
  );

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
     AND v_fee_paid
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
    UPDATE public.profiles SET balance = balance + c_fee WHERE id = v_uid;
    INSERT INTO public.wallet_transactions (user_id, amount, type, status, route_id)
    VALUES (v_uid, c_fee, 'route_fee_refund', 'approved', p_route_id);
    v_message := 'Ruta cancelada. Te devolvimos los $2.000 a tu saldo.';
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

-- 4. Rutas que pasan la hora sin salir: se cierran, sin devolución y avisando a los pasajeros.
CREATE OR REPLACE FUNCTION public.close_expired_routes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  b record;
  v_closed integer := 0;
BEGIN
  FOR r IN SELECT id, driver_id FROM public.routes
           WHERE status = 'scheduled'
             AND departure_time < public.now_bogota() - INTERVAL '60 minutes'
           FOR UPDATE LOOP
    UPDATE public.routes SET status = 'cancelled', updated_at = NOW() WHERE id = r.id;

    FOR b IN SELECT id, passenger_id FROM public.bookings
             WHERE route_id = r.id AND booking_status IN ('pending', 'confirmed') LOOP
      UPDATE public.bookings
      SET booking_status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = 'La ruta no inició',
          updated_at = NOW()
      WHERE id = b.id;

      PERFORM public.notify_user(
        b.passenger_id, 'trip_update', 'Viaje cerrado',
        'El conductor no inició el viaje a tiempo.', jsonb_build_object('route_id', r.id)
      );
    END LOOP;

    v_closed := v_closed + 1;
  END LOOP;

  RETURN v_closed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_expired_routes() FROM PUBLIC, anon, authenticated;

-- 5. Programación cada 5 minutos. Requiere la extensión pg_cron activa en Supabase
--    (Database > Extensions). Si no está, este bloque no hace nada y hay que activarla y volver a ejecutar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('close-expired-routes');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('close-expired-routes', '*/5 * * * *', 'select public.close_expired_routes()');
  END IF;
END $$;
