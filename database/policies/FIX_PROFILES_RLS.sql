-- ============================================================================
-- 🔒 FIX RLS POLICIES PARA PROFILES - VERSIÓN CORRECTA
-- ============================================================================

-- PASO 1: Eliminar políticas antiguas (si existen)
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- PASO 2: Crear políticas nuevas

-- ✅ POLÍTICA 1: Los usuarios pueden leer su PROPIO perfil
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- ✅ POLÍTICA 2: Los usuarios pueden ACTUALIZAR su PROPIO perfil
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ✅ POLÍTICA 3: Admin puede leer TODOS los perfiles
CREATE POLICY "Admin can read all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ✅ POLÍTICA 4: Admin puede actualizar TODOS los perfiles
CREATE POLICY "Admin can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver todas las políticas de profiles
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- Verificar que RLS está habilitado
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
