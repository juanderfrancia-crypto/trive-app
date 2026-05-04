-- Script para configurar el bucket de fotos de vehículos en Supabase
-- Esto debe ejecutarse en la SQL Editor de Supabase Console

-- 1. Crear bucket si no existe (puedes hacer esto desde UI directamente)
-- Ve a: Storage → New bucket → vehicle-photos → Make it public (toggle ON)

-- 2. Crear política de lectura pública en Supabase (esto es lo importante)
-- Ejecuta esto en SQL Editor:

-- Permitir cualquier persona a acceder a las fotos (GET/HEAD)
DROP POLICY IF EXISTS "public-read-vehicle-photos" ON storage.objects;
CREATE POLICY "public-read-vehicle-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-photos');

-- Si fallida la política anterior (si ya existe), esta alternativa:
-- INSERT into storage.buckets (id, name, public) values ('vehicle-photos', 'vehicle-photos', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. O mejor aún, usa una URL con token firmado de corta duración:
-- En código RN puedes generar URLs firmadas válidas por X tiempo

-- 4. Verifica que el bucket existe:
-- SELECT id, name, public FROM storage.buckets WHERE id = 'vehicle-photos';

-- 5. Verifica las políticas:
-- SELECT * FROM storage.policies WHERE relation_id IN (
--   SELECT oid FROM pg_class WHERE relname = 'objects' AND relnamespace IN (
--     SELECT oid FROM pg_namespace WHERE nspname = 'storage'
--   )
-- ) AND definition LIKE '%vehicle-photos%';
