-- Municipio preferido del usuario para filtrar viajes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_municipality text;
