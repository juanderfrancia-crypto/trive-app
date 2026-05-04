-- Fix 10: RLS Policies completas para la tabla messages
-- Ejecutar en Supabase SQL editor
-- Cubre SELECT, INSERT, UPDATE, DELETE con reglas mínimas de privilegio

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LIMPIAR POLÍTICAS ANTIGUAS
-- ============================================================

DROP POLICY IF EXISTS "Users can view their messages"         ON public.messages;
DROP POLICY IF EXISTS "Users can send messages"               ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages"       ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages"       ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read"       ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants"          ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender"                ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender"                ON public.messages;
DROP POLICY IF EXISTS "messages_update_recipient_read"        ON public.messages;
DROP POLICY IF EXISTS "messages_delete_sender"                ON public.messages;

-- ============================================================
-- SELECT: Solo emisor y receptor pueden leer
-- ============================================================

CREATE POLICY "messages_select_participants"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id
  );

-- ============================================================
-- INSERT: Solo el emisor puede insertar (from_user_id = usuario actual)
-- ============================================================

CREATE POLICY "messages_insert_sender"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    from_user_id != to_user_id  -- no puede enviarse a sí mismo
  );

-- ============================================================
-- UPDATE: El emisor puede editar el contenido de su mensaje
-- ============================================================

CREATE POLICY "messages_update_sender"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = from_user_id);

-- ============================================================
-- UPDATE: El receptor puede marcar como leído (is_read, read_at)
-- Política separada para mínimo privilegio
-- ============================================================

CREATE POLICY "messages_update_recipient_read"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- ============================================================
-- DELETE: Solo el emisor puede eliminar sus mensajes directamente
-- (La eliminación de conversación usa RPC SECURITY DEFINER)
-- ============================================================

CREATE POLICY "messages_delete_sender"
  ON public.messages
  FOR DELETE
  USING (auth.uid() = from_user_id);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;
