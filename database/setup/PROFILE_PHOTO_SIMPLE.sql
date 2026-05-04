-- PROFILE PHOTO SETUP - SOLUCIÓN RÁPIDA
-- Ejecuta TODOS estos comandos en el SQL Editor de Supabase

-- 1. Agregar columna si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 2. Crear índice
CREATE INDEX IF NOT EXISTS idx_profiles_photo ON profiles(profile_photo_url);

-- 3. OPCIÓN A: Deshabilitar RLS completamente (más simple pero menos seguro)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. OPCIÓN B: Crear función con SECURITY DEFINER (más seguro - ejecuta esto SI mantienes RLS habilitado)
-- Descomenta las siguientes líneas SOLO si no deshabilitaste RLS arriba
/*
CREATE OR REPLACE FUNCTION update_profile_photo(user_id UUID, photo_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET profile_photo_url = photo_url
  WHERE id = user_id AND auth.uid() = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- INSTRUCCIONES:
-- 1. Ejecuta TODOS los comandos arriba en tu SQL Editor de Supabase
-- 2. Crea el bucket 'profile-photos':
--    - Storage > Create a new bucket
--    - Nombre: profile-photos
--    - Tipo: Public
-- 3. Recarga la app (presiona r en el bundler)
-- 4. Intenta subir una foto de perfil nuevamente

-- Para verificar:
-- SELECT id, name, profile_photo_url FROM profiles LIMIT 5;

