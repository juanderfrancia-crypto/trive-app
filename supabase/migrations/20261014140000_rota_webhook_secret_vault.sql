-- ============================================================
-- Rotación de WEBHOOK_SECRET y endurecimiento del trigger de
-- notificaciones push: antes el secreto (y un JWT de service_role
-- que la función send-push ni siquiera usa) quedaban escritos en
-- texto plano en la propia definición del trigger, visibles con
-- pg_get_triggerdef (ver docs/ESTADO_ACTUAL.md, pendiente #2).
--
-- Esta migración reemplaza supabase_functions.http_request (que
-- requiere los headers como argumento literal) por una función
-- propia que lee el secreto de Supabase Vault en cada ejecución.
-- El valor del secreto se rotó y se guardó en Vault y como secreto
-- de la Edge Function (npx supabase secrets set) antes de aplicar esto.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
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
    RAISE WARNING 'webhook_secret_send_push no existe en Vault; no se envía push';
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
    url := 'https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/send-push',
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

REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS "push-notificaciones" ON public.notifications;

CREATE TRIGGER "push-notificaciones"
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

-- ============================================================
-- Dos lugares más tenían el JWT de service_role embebido en texto
-- plano (encontrado al revisar todos los triggers/cron con JWT):
-- ninguna de las dos funciones usa el header Authorization para nada
-- (cada una crea su propio cliente con SUPABASE_SERVICE_ROLE_KEY desde
-- su propio entorno); el header solo pasaba la verificación de JWT del
-- gateway de Edge Functions, que acepta cualquier JWT válido del
-- proyecto — se reemplaza por la clave anon (pública, sin riesgo).
-- Probado con curl antes de aplicar: ambas responden 200/400 (lógica
-- de la función), nunca 401 (rechazo del gateway).
-- ============================================================

DROP TRIGGER IF EXISTS on_trip_message_insert ON public.trip_messages;

CREATE TRIGGER on_trip_message_insert
  AFTER INSERT ON public.trip_messages
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/notify-message',
    'POST',
    '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3NDksImV4cCI6MjA5MDg0Njc0OX0.ZNxwFnhTQOWKiLrdtTWsJDNLXRmc9T3tDtmE87HxrVA"}',
    '{}',
    '5000'
  );

-- El cron job check-document-expiry-daily se corrigió aparte, con
-- cron.alter_job (no es una migración DDL versionable del mismo modo;
-- queda registrado aquí para no perder el rastro): su header
-- Authorization ahora usa la misma clave anon en vez de service_role.
