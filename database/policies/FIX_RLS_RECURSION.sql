-- ============================================================================
-- 🔒 FIX: ELIMINAR RECURSIÓN EN RLS POLICIES
-- ============================================================================

-- PASO 1: Desactivar RLS temporalmente en profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar TODAS las políticas problemáticas
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- PASO 3: RE-ACTIVAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas SIMPLES sin recursión

-- ✅ POLÍTICA 1: Usuarios pueden LEER su propio perfil
CREATE POLICY "Users read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- ✅ POLÍTICA 2: Usuarios pueden ACTUALIZAR su propio perfil
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver todas las políticas de profiles
-- SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'profiles';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
