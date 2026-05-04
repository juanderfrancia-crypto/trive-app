-- ============================================================================
-- 🔒 FIX: RLS POLICIES PARA STORAGE BUCKETS
-- ============================================================================
-- Ejecuta ESTO en Supabase SQL Editor
-- El error es en el STORAGE, no en la tabla profiles

-- ============================================================================
-- LIMPIAR POLÍTICAS ANTIGUAS
-- ============================================================================

DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own profile photos" ON storage.objects;

DROP POLICY IF EXISTS "Users read vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete vehicle photos" ON storage.objects;

-- ============================================================================
-- BUCKET: profile-photos
-- ============================================================================

-- ✅ POLÍTICA 1: Usuarios pueden LEER su propia foto de perfil
CREATE POLICY "Users read own profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ POLÍTICA 2: Usuarios pueden SUBIR su propia foto de perfil
CREATE POLICY "Users upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ✅ POLÍTICA 3: Usuarios pueden ACTUALIZAR su propia foto de perfil
CREATE POLICY "Users update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ POLÍTICA 4: Usuarios pueden BORRAR su propia foto de perfil
CREATE POLICY "Users delete own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- BUCKET: vehicle-photos (si existe)
-- ============================================================================

-- ✅ POLÍTICA 1: Usuarios pueden LEER fotos de vehículos
CREATE POLICY "Users read vehicle photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ POLÍTICA 2: Usuarios pueden SUBIR fotos de vehículos
CREATE POLICY "Users upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ✅ POLÍTICA 3: Usuarios pueden ACTUALIZAR fotos de vehículos
CREATE POLICY "Users update vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ POLÍTICA 4: Usuarios pueden BORRAR fotos de vehículos
CREATE POLICY "Users delete vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- NOTAS
-- ============================================================================

/*
✅ storage.foldername(name) extrae el primer nivel de carpeta del path
   - Ejemplo: 'drivers/6f469580-07e6.../vehicle.jpg' → ['drivers', '6f469580-07e6...', 'vehicle.jpg']
   - [1] obtiene el UID del conductor
   - auth.uid()::text compara con el UID autenticado

✅ POLÍTICAS CREADAS:
   - profile-photos: Usuarios pueden subir/leer/actualizar/borrar sus propias fotos de perfil
   - vehicle-photos: Usuarios pueden subir/leer/actualizar/borrar sus propias fotos de vehículos

❌ PROBLEMA ANTERIOR: El bucket tenía RLS pero SIN políticas → bloqueaba todo
✅ SOLUCIÓN: Crear políticas que permitan acceso solo a archivos del usuario
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
