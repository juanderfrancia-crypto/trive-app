-- Fix 4: Índice para mejorar performance de subscribeToReadStatus
-- Ejecutar en Supabase SQL editor
-- La lectura bidireccional ya funciona con la tabla messages existente (is_read, read_at).
-- Este archivo agrega el índice necesario para que la suscripción realtime sea eficiente.

-- ============================================================
-- 1. ÍNDICE para consultas de is_read por emisor
-- Necesario para que subscribeToReadStatus() sea eficiente
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_from_user_read
  ON public.messages (from_user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_from_to_read
  ON public.messages (from_user_id, to_user_id, is_read);

-- ============================================================
-- 2. VERIFICAR que read_at existe en la tabla messages
-- ============================================================
-- Si la columna read_at no existe aún, descomenta y ejecuta:
-- ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ============================================================
-- 3. VERIFICAR REALTIME está habilitado en messages
-- ============================================================
-- En Supabase Dashboard → Database → Replication
-- Asegurarse que la tabla 'messages' tiene Realtime habilitado
-- con INSERT y UPDATE activados.

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'messages';
