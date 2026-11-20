-- Antes, cada mensaje de un viaje creaba una fila nueva en notifications, así
-- que una conversación activa llenaba Alertas de varias tarjetas idénticas
-- ("Mensaje de X: ...") que no aportaban nada nuevo frente al push + el
-- contador de "Viajes". Ahora, si ya existe una alerta SIN LEER de esa misma
-- conversación, se actualiza en el lugar (mensaje, título, fecha) en vez de
-- insertar otra -- una sola tarjeta por conversación pendiente. En cuanto el
-- destinatario la lee (o entra al chat), el siguiente mensaje sí crea una
-- alerta nueva, porque ya no queda ninguna pendiente de ese viaje.

CREATE OR REPLACE FUNCTION public.notify_trip_message(p_trip_id uuid, p_to_user_id uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_title text;
  v_existing_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_trip_chat(p_trip_id, p_to_user_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT name INTO v_sender_name FROM public.profiles WHERE id = auth.uid();
  v_title := 'Mensaje de ' || COALESCE(v_sender_name, 'Usuario');

  SELECT id INTO v_existing_id
  FROM public.notifications
  WHERE user_id = p_to_user_id
    AND type = 'message'
    AND is_read = false
    AND data->>'trip_id' = p_trip_id::text
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.notifications
    SET message = p_message,
        title = v_title,
        created_at = NOW(),
        data = jsonb_build_object('sender_id', auth.uid(), 'sender_name', v_sender_name, 'trip_id', p_trip_id)
    WHERE id = v_existing_id;
  ELSE
    PERFORM public.notify_user(
      p_to_user_id, 'message', v_title, p_message,
      jsonb_build_object('sender_id', auth.uid(), 'sender_name', v_sender_name, 'trip_id', p_trip_id)
    );
  END IF;
END;
$$;
