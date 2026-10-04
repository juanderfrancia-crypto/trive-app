-- Fase 2q: política del chat. Antes de aceptar un viaje, la conversación se queda en Trive:
-- no se aceptan teléfonos, enlaces ni redes sociales. Cada intento queda registrado.
-- Después de aceptar, el chat es libre (ya hubo cobro de comisión).

CREATE TABLE IF NOT EXISTS public.chat_policy_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_policy_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_policy_flags FROM anon, authenticated;
GRANT SELECT ON public.chat_policy_flags TO authenticated;

DROP POLICY IF EXISTS chat_policy_flags_admin_read ON public.chat_policy_flags;
CREATE POLICY chat_policy_flags_admin_read ON public.chat_policy_flags
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- Detecta datos de contacto o redes en un mensaje.
CREATE OR REPLACE FUNCTION public.chat_contains_contact(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text text := lower(COALESCE(p_text, ''));
  v_digits text := regexp_replace(v_text, '\D', '', 'g');
BEGIN
  IF length(v_digits) >= 7 THEN
    RETURN 'número de teléfono';
  END IF;
  IF v_text ~ '(https?://|www\.|\.com|\.co\b)' THEN
    RETURN 'enlace';
  END IF;
  IF v_text ~ '(whatsapp|wsp|wpp|telegram|instagram|facebook|tiktok|llamame|llámame|escribeme|escríbeme|nequi|daviplata|@)' THEN
    RETURN 'contacto o red social';
  END IF;
  RETURN NULL;
END;
$$;

-- Devuelve {ok, id} o {ok:false, message}. No lanza error después de registrar un intento,
-- porque PostgreSQL deshace los cambios de una transacción fallida y el registro se perdería.
DROP FUNCTION IF EXISTS public.send_chat_message(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_request_id uuid,
  p_driver_id uuid,
  p_text text,
  p_type text DEFAULT 'text'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_passenger_id uuid;
  v_request_status text;
  v_offer_status text;
  v_reason text;
  v_message_id uuid;
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

  RETURN jsonb_build_object('ok', true, 'id', v_message_id);
END;
$$;

-- Patrón de desvío para revisión: pares conductor-pasajero con varios viajes aceptados.
CREATE OR REPLACE FUNCTION public.repeated_driver_passenger_pairs(p_min_trips integer DEFAULT 2)
RETURNS TABLE(driver_id uuid, passenger_id uuid, accepted_trips bigint, last_trip timestamptz, flags bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT ar.driver_id, ar.passenger_id, COUNT(*)::bigint, MAX(ar.accepted_at),
         (SELECT COUNT(*) FROM public.chat_policy_flags f
           WHERE f.user_id IN (ar.driver_id, ar.passenger_id))::bigint
  FROM public.airport_requests ar
  WHERE ar.driver_id IS NOT NULL
    AND ar.status IN ('accepted', 'in_progress', 'completed')
  GROUP BY ar.driver_id, ar.passenger_id
  HAVING COUNT(*) >= p_min_trips
  ORDER BY COUNT(*) DESC;
END;
$$;
