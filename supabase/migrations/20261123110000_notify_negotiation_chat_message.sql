-- send_chat_message (chat de negociacion de "viaje a pedido"/aeropuerto) guardaba
-- el mensaje en negotiation_messages pero nunca avisaba a la otra persona -- ni
-- notificacion ni push, para ninguno de los dos roles. No hay trigger en esa tabla
-- que lo compensara. El chat de viajes normales si tiene esto (notify_trip_message);
-- aqui se agrega el mismo mecanismo: se avisa a quien no envio el mensaje.

CREATE OR REPLACE FUNCTION public.send_chat_message(p_request_id uuid, p_driver_id uuid, p_text text, p_type text DEFAULT 'text'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger_id uuid;
  v_request_status text;
  v_offer_status text;
  v_reason text;
  v_message_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT passenger_id, status INTO v_passenger_id, v_request_status
  FROM public.airport_requests WHERE id = p_request_id;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF v_uid <> v_passenger_id AND v_uid <> p_driver_id THEN
    RAISE EXCEPTION 'No eres participante de este hilo';
  END IF;

  SELECT status INTO v_offer_status
  FROM public.airport_offers
  WHERE request_id = p_request_id AND driver_id = p_driver_id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_offer_status IS NULL OR v_offer_status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Este hilo está cerrado';
  END IF;

  IF v_request_status NOT IN ('accepted', 'in_progress') THEN
    v_reason := public.chat_contains_contact(p_text);
    IF v_reason IS NOT NULL THEN
      INSERT INTO public.chat_policy_flags (user_id, request_id, reason)
      VALUES (v_uid, p_request_id, v_reason);
      RETURN jsonb_build_object(
        'ok', false,
        'message', 'Por tu seguridad, antes de aceptar el viaje no se pueden compartir ' || v_reason || ' en el chat. La conversación se queda en Trive.'
      );
    END IF;
  END IF;

  INSERT INTO public.negotiation_messages (
    request_id, driver_id, passenger_id, sent_by_user_id, message_text, message_type, is_read
  ) VALUES (
    p_request_id, p_driver_id, v_passenger_id, v_uid, p_text, p_type, false
  )
  RETURNING id INTO v_message_id;

  v_recipient_id := CASE WHEN v_uid = v_passenger_id THEN p_driver_id ELSE v_passenger_id END;
  SELECT name INTO v_sender_name FROM public.profiles WHERE id = v_uid;

  PERFORM public.notify_user(
    v_recipient_id, 'message', 'Mensaje de ' || COALESCE(v_sender_name, 'Usuario'),
    p_text,
    jsonb_build_object('request_id', p_request_id, 'sender_id', v_uid, 'sender_name', v_sender_name)
  );

  RETURN jsonb_build_object('ok', true, 'id', v_message_id);
END;
$function$;
