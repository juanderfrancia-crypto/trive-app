-- Agregar columna push_token a la tabla profiles (si no existe)
-- NOTA: Ejecutar esta migración en Supabase cuando sea necesario

ALTER TABLE profiles 
ADD COLUMN push_token TEXT;

-- Crear índice para queries más rápidas del token
CREATE INDEX idx_push_token ON profiles(push_token);

-- Agregar columna notification_preferences (JSON) para guardar preferencias
ALTER TABLE profiles 
ADD COLUMN notification_preferences JSONB DEFAULT '{"push": true, "email": true, "sms": false}';

-- ROLLBACK (si es necesario)
-- ALTER TABLE profiles DROP COLUMN push_token;
-- DROP INDEX idx_push_token;
-- ALTER TABLE profiles DROP COLUMN notification_preferences;
