-- Fase 2c: chat de negociación por hilo (solicitud + conductor).
-- Un hilo existe por cada conductor que ofertó en una solicitud. Se puede escribir mientras
-- la oferta esté pendiente o aceptada. Al rechazarse o cancelarse, queda de solo lectura.
-- La aceptación directa también crea su oferta, así todo acuerdo tiene su hilo.

-- ============================================================
-- 1. Aceptación directa: registra la oferta aceptada para que el hilo exista.
-- ============================================================
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

  PERFORM 1
  FROM public.airport_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta solicitud ya no está disponible';
  END IF;

  UPDATE public.profiles
  SET balance = balance - c_fee
  WHERE id = v_uid
    AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $5.000 de saldo para aceptar este viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'airport_fee');

  UPDATE public.airport_requests
  SET driver_id = v_uid,
      status = 'accepted',
      accepted_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.airport_offers (request_id, driver_id, proposed_price, status, responded_at)
  VALUES (p_request_id, v_uid, NULL, 'accepted', NOW());
END;
$$;

-- ============================================================
-- 2. Enviar mensaje en un hilo.
--    Pasajero: escribe en el hilo de un conductor que le ofertó.
--    Conductor: escribe en su propio hilo.
-- ============================================================
DROP FUNCTION IF EXISTS public.send_negotiation_message(uuid, text, text);

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_request_id uuid,
  p_driver_id uuid,
  p_text text,
  p_type text DEFAULT 'text'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger_id uuid;
  v_offer_status text;
  v_message_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT passenger_id INTO v_passenger_id
  FROM public.airport_requests
  WHERE id = p_request_id;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF v_uid <> v_passenger_id AND v_uid <> p_driver_id THEN
    RAISE EXCEPTION 'No eres participante de este hilo';
  END IF;

  SELECT status INTO v_offer_status
  FROM public.airport_offers
  WHERE request_id = p_request_id
    AND driver_id = p_driver_id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_offer_status IS NULL OR v_offer_status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Este hilo está cerrado';
  END IF;

  INSERT INTO public.negotiation_messages (
    request_id, driver_id, passenger_id, sent_by_user_id, message_text, message_type, is_read
  ) VALUES (
    p_request_id, p_driver_id, v_passenger_id, v_uid, p_text, p_type, false
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- ============================================================
-- 3. Marcar como leídos solo los mensajes que recibí en ese hilo.
--    Corrige el bug anterior: marcaba también los mensajes que yo envié.
-- ============================================================
DROP FUNCTION IF EXISTS public.mark_negotiation_messages_read(uuid);

CREATE OR REPLACE FUNCTION public.mark_chat_thread_read(p_request_id uuid, p_driver_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected integer;
BEGIN
  UPDATE public.negotiation_messages
  SET is_read = true
  WHERE request_id = p_request_id
    AND driver_id = p_driver_id
    AND sent_by_user_id <> auth.uid()
    AND auth.uid() IN (passenger_id, driver_id)
    AND is_read = false;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

-- ============================================================
-- 4. Lectura: los participantes ven su historial completo, incluso si el hilo ya cerró.
-- ============================================================
DROP POLICY IF EXISTS users_view_negotiation_messages ON public.negotiation_messages;
CREATE POLICY users_view_negotiation_messages ON public.negotiation_messages
  FOR SELECT TO authenticated
  USING (auth.uid() IN (passenger_id, driver_id));

-- Mensajes solo se escriben con send_chat_message.
DROP POLICY IF EXISTS users_send_negotiation_messages ON public.negotiation_messages;

-- Ofertas: el conductor puede rechazar la suya; la política de lectura se mantiene.
-- (driver_reject_own_offer sigue vigente.)
