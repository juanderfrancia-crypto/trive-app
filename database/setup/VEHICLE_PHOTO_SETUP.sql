-- VEHICLE PHOTO SETUP
-- Ejecuta este script en el SQL Editor de Supabase para agregar la funcionalidad de fotos de vehísculo

-- 1. Agregar columna vehicle_photo_url a la tabla routes (si no existe)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

-- 1.a Agregar columna vehicle_photo_url a la tabla profiles (si no existe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

-- 2. Ver las columnas actuales de la tabla routes
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'routes';

-- 3. Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_photo ON routes(vehicle_photo_url);

-- 4. Se debe crear el bucket 'vehicle-photos' desde el dashboard de Storage:
-- - Ir a Storage > Create a new bucket
-- - Nombre: vehicle-photos
-- - Configurar como PRIVATE
-- - Luego aplicar estas políticas RLS:

-- 5. Políticas para el bucket vehicle-photos (ejecutar después de crear el bucket):

-- Política 1: Permitir que los usuarios suban sus propias fotos
DROP POLICY IF EXISTS "Users can upload their own vehicle photos" ON storage.objects;
CREATE POLICY "Users can upload their own vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND auth.uid() IS NOT NULL
);

-- Política 2: Permitir que los usuarios actualicen sus propias fotos
DROP POLICY IF EXISTS "Users can update their own vehicle photos" ON storage.objects;
CREATE POLICY "Users can update their own vehicle photos"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND auth.uid() IS NOT NULL
);

-- Política 3: Permitir lectura pública de fotos de vehículos
DROP POLICY IF EXISTS "Public access to vehicle photos" ON storage.objects;
CREATE POLICY "Public access to vehicle photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-photos'
);

-- INSTRUCCIONES DE EJECUCIÓN:
--
-- 1. Ejecuta este script completo en el SQL Editor de Supabase
-- 2. Luego crea el bucket 'vehicle-photos':
--    - Abre el dashboard de Supabase
--    - Ve a Storage > Create a new bucket
--    - Nombre: vehicle-photos
--    - Tipo: Private (será accesible por URL pública pero sin enlistar archivos)
-- 3. Después de crear el bucket, las políticas RLS se aplicarán automáticamente
-- 4. Ya puedes usar la funcionalidad en la app
--
-- Para verificar:
-- SELECT * FROM routes WHERE vehicle_photo_url IS NOT NULL LIMIT 5;
