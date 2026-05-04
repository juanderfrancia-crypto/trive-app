-- MEMBERSHIP SYSTEM SETUP
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columnas de membresía a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'free';
-- Enum: 'free', 'basic', 'premium', 'vip'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expiry TIMESTAMP NULL;
-- NULL = no expiry (lifetime), DATE = expira en esa fecha

-- 2. Crear índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_membership ON profiles(membership_type, membership_expiry);

-- 3. Función para verificar si membresía está activa
CREATE OR REPLACE FUNCTION is_membership_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN membership_type = 'free' THEN TRUE
      WHEN membership_expiry IS NULL THEN TRUE
      WHEN membership_expiry > NOW() THEN TRUE
      ELSE FALSE
    END
    FROM profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para obtener días restantes
CREATE OR REPLACE FUNCTION membership_days_remaining(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN membership_expiry IS NULL THEN -1
      WHEN membership_expiry > NOW() THEN EXTRACT(DAY FROM membership_expiry - NOW())::INTEGER
      ELSE 0
    END
    FROM profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar datos de prueba (opcional - descomentar si necesario)
-- UPDATE profiles SET membership_type = 'premium', membership_expiry = NOW() + INTERVAL '30 days' WHERE role = 'passenger' LIMIT 1;

-- Verificar
-- SELECT id, name, membership_type, membership_expiry FROM profiles LIMIT 5;
