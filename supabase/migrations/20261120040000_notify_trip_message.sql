-- Causa real del bug "los mensajes de un viaje normal nunca llegan a Alertas":
-- el cliente insertaba la notificación directo con `supabase.from('notifications').insert(...)`
-- para OTRO usuario (el destinatario del mensaje). Eso chocaba con RLS -- confirmado en vivo
-- con el error real "new row violates row-level security policy for table notifications".
--
-- Todos los demás tipos de notificación que sí funcionan (booking, trip_update, trip_confirm,
-- review_received, etc.) se crean desde una función del servidor con SECURITY DEFINER
-- (notify_user), que no depende de RLS. Esta función sigue el mismo patrón, pero
-- acotada a avisar de un mensaje de un viaje puntual, validando con can_trip_chat
-- (la misma función que ya protege el insert en trip_messages) que quien llama de
-- verdad es participante de ese viaje con ese destinatario -- así no se puede usar
-- para mandar notificaciones falsas a cualquiera.

CREATE OR REPLACE FUNCTION public.notify_trip_message(p_trip_id uuid, p_to_user_id uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_trip_chat(p_trip_id, p_to_user_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT name INTO v_sender_name FROM public.profiles WHERE id = auth.uid();

  PERFORM public.notify_user(
    p_to_user_id, 'message', 'Mensaje de ' || COALESCE(v_sender_name, 'Usuario'),
    p_message,
    jsonb_build_object('sender_id', auth.uid(), 'sender_name', v_sender_name, 'trip_id', p_trip_id)
  );
END;
$$;
