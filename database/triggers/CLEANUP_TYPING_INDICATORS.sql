-- Fix 5: Trigger para limpiar typing_indicators automáticamente
-- Ejecutar en Supabase SQL editor

-- ============================================================
-- TRIGGER 1: Limpiar typing indicator cuando el usuario envía un mensaje
-- (el usuario dejó de escribir porque ya envió)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_typing_on_send_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE from_user_id = NEW.from_user_id
    AND to_user_id   = NEW.to_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_typing_on_send ON public.messages;
CREATE TRIGGER cleanup_typing_on_send
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_typing_on_send_fn();

-- ============================================================
-- TRIGGER 2: Al insertar un typing indicator, limpiar los viejos
-- del mismo usuario (evita duplicados y huérfanos)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_typing_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Eliminar indicadores del mismo usuario que tengan más de 8 segundos
  DELETE FROM public.typing_indicators
  WHERE from_user_id = NEW.from_user_id
    AND created_at < NOW() - INTERVAL '8 seconds'
    AND id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_old_typing ON public.typing_indicators;
CREATE TRIGGER cleanup_old_typing
  AFTER INSERT OR UPDATE ON public.typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_typing_fn();

-- ============================================================
-- OPCIONAL: pg_cron para limpiar cada minuto (si tienes pg_cron)
-- ============================================================
-- SELECT cron.schedule(
--   'cleanup-stale-typing-indicators',
--   '* * * * *',
--   'DELETE FROM public.typing_indicators WHERE created_at < NOW() - INTERVAL ''10 seconds'''
-- );

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT trigger_name, event_object_table, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- AND trigger_name LIKE '%typing%';
