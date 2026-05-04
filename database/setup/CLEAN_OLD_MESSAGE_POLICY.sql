-- 🧹 LIMPIAR: Eliminar política antigua que permite que el receptor actualice mensajes

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Verificar que solo quedó la política correcta
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'messages' AND cmd = 'UPDATE'
ORDER BY policyname;
