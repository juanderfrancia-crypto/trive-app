-- PROFILE PHOTO SETUP
-- Ejecuta este script en el SQL Editor de Supabase para agregar la funcionalidad de fotos de perfil

-- 1. Agregar columna profile_photo_url a la tabla profiles (si no existe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 2. Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_photo ON profiles(profile_photo_url);

-- 3. Crear función SQL que actualice la foto de perfil (evita problemas de RLS)
CREATE OR REPLACE FUNCTION update_profile_photo(user_id UUID, photo_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET profile_photo_url = photo_url
  WHERE id = user_id AND auth.uid() = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear política RLS para permitir que los usuarios usen la función
-- Esta emite el error, ejecutaremos sin ella primero
-- CREATE POLICY "Users can update own profile photo"
--   ON public.profiles FOR UPDATE
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);

-- INSTRUCCIONES DE EJECUCIÓN:
--
-- 1. Ejecuta este script completo en el SQL Editor de Supabase
-- 2. Luego crea el bucket 'profile-photos':
--    - Abre el dashboard de Supabase
--    - Ve a Storage > Create a new bucket
--    - Nombre: profile-photos
--    - Tipo: Public
-- 3. Ya puedes usar la funcionalidad en la app
--
-- Para verificar:
-- SELECT id, name, profile_photo_url FROM profiles WHERE profile_photo_url IS NOT NULL LIMIT 5;
