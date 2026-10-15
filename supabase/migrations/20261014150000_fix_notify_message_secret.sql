-- ============================================================
-- notify-message no tenía ningún chequeo de secreto compartido
-- (a diferencia de send-push, que ya usa x-webhook-secret): cualquiera
-- con la clave anon (pública) podía llamarla directo y disparar una
-- notificación push falsa a cualquier usuario, suplantando a Trive.
--
-- Se le agregó el mismo chequeo x-webhook-secret a la función (ver
-- supabase/functions/notify-message/index.ts, ya redesplegada con
-- --no-verify-jwt) y ahora el trigger lee el secreto de Vault en vez
-- de llevarlo como argumento literal — mismo patrón que
-- public.trigger_push_notification() en la migración anterior.
-- Reutiliza el mismo secreto de Vault ('webhook_secret_send_push').
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_trip_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_payload jsonb;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_secret_send_push';

  IF v_secret IS NULL THEN
    RAISE WARNING 'webhook_secret_send_push no existe en Vault; no se envía notificación de mensaje';
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'old_record', to_jsonb(OLD),
    'record', to_jsonb(NEW),
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA
  );

  PERFORM net.http_post(
    url := 'https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/notify-message',
    body := v_payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_trip_message_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_trip_message_insert ON public.trip_messages;

CREATE TRIGGER on_trip_message_insert
  AFTER INSERT ON public.trip_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_trip_message_notification();
