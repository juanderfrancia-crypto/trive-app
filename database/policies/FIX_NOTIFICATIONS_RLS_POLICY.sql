-- 🔧 FIX NOTIFICATIONS RLS POLICY
-- Error: "new row violates row-level security policy for table notifications"
-- 
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- PROBLEMA:
-- ============================================================================
-- La política "System can create notifications" WITH CHECK (true) está siendo
-- bloqueada porque RLS requiere que el usuario sea el propietario de la fila
-- pero estamos creando notificaciones para OTHER USERS (los pasajeros)
--
-- El conductor crea notificaciones para pasajeros:
--   INSERT notifications { user_id: pasajero_id, ... }
-- Pero auth.uid() = conductor_id ≠ pasajero_id
-- Entonces RLS bloquea el INSERT

-- ============================================================================
-- SOLUCIÓN: Hacer RLS más permisiva para INSERT
-- ============================================================================

-- 1️⃣ DESHABILITAR RLS (opción más simple)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2️⃣ O Si prefieres MANTENER RLS, usar esto en lugar:
-- Primero, remover la política restrictiva
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Crear nueva política que permite INSERT sin restricción
CREATE POLICY "Anyone can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);  -- Permite cualquier insert

-- Y mantener SELECT restringido
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Y mantener UPDATE restringido
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICAR
-- ============================================================================

-- Ejecutar esto para confirmar que RLS está ok:
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'notifications';

-- Si rowsecurity = true, la RLS está habilitada (pero permisiva)
-- Si rowsecurity = false, está deshabilitada (más permisivo)

-- ============================================================================
-- DESPUÉS: Recargar Expo
-- ============================================================================
-- Ctrl+C en terminal
-- npm start
-- Intenta iniciar viaje nuevamente
