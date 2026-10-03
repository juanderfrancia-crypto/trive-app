-- Fase 2b (parte 2): flujo de solicitudes de aeropuerto.
-- Ninguna transición de estado que tenga dinero de por medio se hace por escritura directa.
-- Las escrituras directas que quedan no afectan saldo ni aceptación.

-- ============================================================
-- 1. Solicitudes: el pasajero solo crea y lee las suyas.
--    Cambios de estado (aceptar, cancelar, iniciar, completar) solo por funciones.
-- ============================================================
DROP POLICY IF EXISTS passenger_own_requests ON public.airport_requests;
DROP POLICY IF EXISTS driver_accept_request ON public.airport_requests;
DROP POLICY IF EXISTS driver_view_pending ON public.airport_requests;

CREATE POLICY passenger_select_own_requests ON public.airport_requests
  FOR SELECT TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY passenger_insert_requests ON public.airport_requests
  FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid() AND status = 'pending' AND driver_id IS NULL);

CREATE POLICY driver_view_pending_requests ON public.airport_requests
  FOR SELECT TO authenticated
  USING (status = 'pending' AND public.puede_conducir(auth.uid()));

-- driver_own_accepted (SELECT) se mantiene.

-- ============================================================
-- 2. Ofertas: el pasajero no puede aceptar por escritura directa
--    (saltaría el cobro). Solo puede rechazar, por función.
-- ============================================================
DROP POLICY IF EXISTS passenger_accept_offer ON public.airport_offers;
DROP POLICY IF EXISTS driver_create_offer ON public.airport_offers;
DROP POLICY IF EXISTS driver_create_offer_simple ON public.airport_offers;

CREATE POLICY driver_create_offer_verified ON public.airport_offers
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND public.puede_conducir(auth.uid())
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.airport_requests ar
      WHERE ar.id = request_id AND ar.status = 'pending'
    )
  );

-- ============================================================
-- 3. Chat de negociación: el conductor escribe solo cuando la solicitud
--    está aceptada, porque la aceptación ya cobró la comisión.
--    Se quita la política de INSERT directo.
-- ============================================================
DROP POLICY IF EXISTS users_send_negotiation_messages ON public.negotiation_messages;

CREATE OR REPLACE FUNCTION public.send_negotiation_message(
  v_request_id uuid,
  v_message_text text,
  v_message_type text DEFAULT 'text'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
  v_passenger_id uuid;
  v_request_status text;
BEGIN
  SELECT driver_id, passenger_id, status
    INTO v_driver_id, v_passenger_id, v_request_status
  FROM public.airport_requests
  WHERE id = v_request_id;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF v_user_id IS DISTINCT FROM v_passenger_id AND v_user_id IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION 'No eres participante de este viaje';
  END IF;

  IF v_request_status NOT IN ('accepted', 'in_progress') THEN
    RAISE EXCEPTION 'El chat se habilita cuando el viaje está aceptado';
  END IF;

  INSERT INTO public.negotiation_messages (
    request_id, driver_id, passenger_id, sent_by_user_id, message_text, message_type
  ) VALUES (
    v_request_id, v_driver_id, v_passenger_id, v_user_id, v_message_text, v_message_type
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- ============================================================
-- 4. Cancelar solicitud.
--    Pasajero: si el conductor ya pagó la comisión, la devuelve completa.
--    Conductor: cancela sin reembolso.
--    En curso o completada: no se puede cancelar.
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
    END IF;
  ELSIF v_uid = r.driver_id AND r.status = 'accepted' THEN
    NULL; -- El conductor cancela: sin reembolso.
  ELSE
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.airport_requests
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = r.id;
END;
$$;

-- ============================================================
-- 5. Rechazar una oferta. La solicitud sigue visible para otros conductores.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_airport_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id uuid;
  v_status text;
BEGIN
  SELECT ar.passenger_id, ao.status
    INTO v_passenger_id, v_status
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
END;
$$;
