-- Columnas para el sistema de referidos de conductores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by   TEXT;

-- Índice único para búsqueda eficiente por código
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;
