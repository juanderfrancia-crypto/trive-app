-- SQL para implementar sistema de roles dual en Trive

-- 1. Agregar columnas a tabla profiles para soportar roles dual
-- Si ya existe is_driver, se sobrescribe. Si no, se crea.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_passenger BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS driver_active BOOLEAN DEFAULT false;

-- 2. Actualizar registros existentes para mantener compatibilidad
UPDATE profiles 
SET 
  is_driver = (role = 'driver'),
  is_passenger = (role = 'passenger' OR role = 'driver'),
  driver_active = false
WHERE role IS NOT NULL AND (is_driver IS NULL OR is_passenger IS NULL);

-- 3. Crear índices para mejor rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_profiles_is_driver ON profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_active ON profiles(driver_active);

-- Verificar cambios
SELECT id, is_driver, is_passenger, driver_active, role FROM profiles LIMIT 5;
