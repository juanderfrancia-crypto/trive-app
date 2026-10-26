-- Agrupa el envío de notificaciones push para no agotar el tope de invocaciones
-- de Edge Functions. Antes: cada publicación de ruta insertaba una notificación
-- POR CADA pasajero coincidente, una por una (PERFORM ... FROM profiles), y el
-- trigger de notifications disparaba una invocación de send-push POR FILA. Con
-- el volumen real del corredor Puerto Tejada↔Cali (ver docs/ESTADO_ACTUAL.md
-- sección "-7"), eso agotaba el plan gratuito de Supabase en menos de una semana.
--
-- Ahora: un solo INSERT múltiple en vez de un loop, y el trigger pasa de
-- "por fila" a "por sentencia" (con tabla de transición), así que una
-- publicación que notifica a 50 pasajeros dispara UNA sola llamada a send-push
-- con las 50 notificaciones adentro, no 50 llamadas separadas.

CREATE OR REPLACE FUNCTION public.notify_passengers_new_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  SELECT
    p.id,
    'trip_published',
    'Nueva ruta publicada',
    NEW.origin || ' → ' || NEW.destination || ' · ' || to_char(NEW.departure_time, 'HH24:MI'),
    jsonb_build_object(
      'route_id', NEW.id,
      'origin', NEW.origin,
      'destination', NEW.destination
    ),
    false
  FROM public.profiles p
  WHERE p.id <> NEW.driver_id
    AND p.preferred_municipality IS NOT NULL
    AND (NEW.origin ILIKE '%' || p.preferred_municipality || '%'
         OR NEW.destination ILIKE '%' || p.preferred_municipality || '%');

  RETURN NEW;
END;
$$;

-- El trigger de push pasa de FOR EACH ROW a FOR EACH STATEMENT con tabla de
-- transición: dispara una sola vez por sentencia INSERT, con acceso a TODAS
-- las filas nuevas de esa sentencia (sea 1 fila de una confirmación normal, o
-- decenas de una publicación de ruta). Transparente para todo el código
-- existente que inserta de a una fila (notify_user) — sigue funcionando igual,
-- solo que ahora agrupa cuando hay varias filas en la misma sentencia.
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

  SELECT jsonb_agg(to_jsonb(n)) INTO v_records FROM new_table n;

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

DROP TRIGGER IF EXISTS "push-notificaciones" ON public.notifications;

CREATE TRIGGER "push-notificaciones"
  AFTER INSERT ON public.notifications
  REFERENCING NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_push_notification();
