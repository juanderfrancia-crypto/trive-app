-- Fix 7: sequence_number para ordenar mensajes de forma fiable
-- Ejecutar en Supabase SQL editor
-- Problema: dos mensajes insertados en el mismo milisegundo tienen el mismo created_at
-- Solución: BIGSERIAL garantiza orden de inserción único y monotónico

-- ============================================================
-- 1. AGREGAR COLUMNA sequence_number
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL;

-- ============================================================
-- 2. ÍNDICE para consultas ordenadas por conversación
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_sequence
  ON public.messages (
    LEAST(from_user_id, to_user_id),
    GREATEST(from_user_id, to_user_id),
    sequence_number ASC
  );

-- Índice adicional para queries directas por conversación
CREATE INDEX IF NOT EXISTS idx_messages_from_to_seq
  ON public.messages (from_user_id, to_user_id, sequence_number ASC);

-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================
-- Verificar que la columna existe y se asignaron valores:
-- SELECT id, sequence_number, created_at FROM public.messages ORDER BY sequence_number LIMIT 20;

-- Verificar que no hay dos mensajes con el mismo sequence_number:
-- SELECT sequence_number, COUNT(*) FROM public.messages GROUP BY sequence_number HAVING COUNT(*) > 1;
