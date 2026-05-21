-- Agregar contacto de emergencia al perfil del usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact jsonb;
