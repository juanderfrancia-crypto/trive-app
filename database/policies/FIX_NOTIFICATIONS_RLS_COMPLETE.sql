-- 🔧 DIAGNÓSTICO Y FIX COMPLETO PARA RLS NOTIFICATIONS
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DE RLS
-- ============================================================================

-- Ver si RLS está habilitada
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notifications';

-- Ver todas las políticas actuales
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- ============================================================================
-- PASO 2: LIMPIAR POLÍTICAS PROBLEMÁTICAS
-- ============================================================================

-- Eliminar TODAS las políticas existentes que puedan estar causando conflicto
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- ============================================================================
-- PASO 3: DESHABILITAR RLS COMPLETAMENTE (SOLUCIÓN TEMPORAL)
-- ============================================================================

-- Para MVP, deshabilitar RLS completamente en notifications
-- Esto permite que cualquier operación se ejecute sin restricciones
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 4: VERIFICAR QUE FUNCIONÓ
-- ============================================================================

-- Verificar que RLS está deshabilitada
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notifications';

-- Verificar que no hay políticas
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'notifications';

-- ============================================================================
-- PASO 5: PRUEBA MANUAL (opcional)
-- ============================================================================

-- Si quieres probar manualmente que funciona:
-- INSERT INTO notifications (user_id, type, title, message)
-- VALUES ('test-user-id', 'test', 'Test', 'Test message');

-- SELECT * FROM notifications WHERE user_id = 'test-user-id';

-- DELETE FROM notifications WHERE user_id = 'test-user-id';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
--
-- 1. RLS DESHABILITADA = MENOS SEGURIDAD pero funcionalidad inmediata
-- 2. Para producción, necesitarás políticas RLS más sofisticadas
-- 3. Las notificaciones son datos sensibles - considera encriptación
-- 4. Este fix es temporal hasta implementar RLS correcta
--
-- ============================================================================
-- ROLLBACK (si necesitas volver atrás):
-- ============================================================================
--
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can see own notifications" ON public.notifications
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can update own notifications" ON public.notifications
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own notifications" ON public.notifications
--   FOR DELETE USING (auth.uid() = user_id);
-- CREATE POLICY "Allow insert notifications" ON public.notifications
--   FOR INSERT WITH CHECK (true);