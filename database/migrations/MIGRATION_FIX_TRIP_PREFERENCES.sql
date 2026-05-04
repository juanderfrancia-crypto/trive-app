-- 🔧 MIGRATION: Arreglar tabla trip_preferences
-- Agrega columnas faltantes que causan errores en la app
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- El problema:
-- ============================================================================
-- La app intenta cargar trip_preferences pero faltan columnas:
-- ERROR: column trip_preferences.user_id does not exist
-- ERROR: column trip_preferences.beverage_preference does not exist

-- ============================================================================
-- SOLUCIÓN: Agregar columnas faltantes
-- ============================================================================

-- Agregar columna user_id (relación con profiles)
ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Agregar preferencias de viaje
ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS beverage_preference TEXT DEFAULT 'none' CHECK (beverage_preference IN ('none', 'water', 'soda', 'coffee', 'tea'));

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS music_preference TEXT DEFAULT 'none' CHECK (music_preference IN ('none', 'pop', 'rock', 'reggaeton', 'classical', 'jazz', 'silence'));

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS temperature_preference INT DEFAULT 20 CHECK (temperature_preference BETWEEN 16 AND 28);

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS conversation_preference TEXT DEFAULT 'friendly' CHECK (conversation_preference IN ('quiet', 'friendly', 'talkative'));

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS smoking_allowed BOOLEAN DEFAULT false;

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT false;

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS luggage_space_needed INT DEFAULT 0 CHECK (luggage_space_needed BETWEEN 0 AND 5);

ALTER TABLE trip_preferences 
ADD COLUMN IF NOT EXISTS eating_allowed BOOLEAN DEFAULT false;

-- ============================================================================
-- Crear índices para mejor performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trip_preferences_user_id ON trip_preferences(user_id);

-- ============================================================================
-- Verificar
-- ============================================================================

-- Después de ejecutar, correr:
-- SELECT * FROM trip_preferences LIMIT 1;
-- Deberías ver todas las nuevas columnas

-- Si tu usuario ya existe:
-- SELECT * FROM trip_preferences WHERE user_id = 'tu-user-id';
