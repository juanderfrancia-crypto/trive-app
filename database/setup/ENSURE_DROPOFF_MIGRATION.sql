-- ============================================================================
-- ENSURE DROPOFF COLUMNS EXIST (ejecutar en Supabase SQL Editor)
-- ============================================================================
-- Esta migración es idempotente y segura de ejecutar múltiples veces

-- 1️⃣ Verificar si la columna ya existe antes de agregarla
DO $$ 
BEGIN
    -- Agregar columna dropoff_point si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'dropoff_point'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN dropoff_point VARCHAR(255);
        
        CREATE INDEX idx_bookings_dropoff ON bookings(dropoff_point);
        
        RAISE NOTICE 'Agregada columna dropoff_point a bookings table';
    ELSE
        RAISE NOTICE 'Columna dropoff_point ya existe';
    END IF;

    -- Agregar columna dropoff_point_custom si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'dropoff_point_custom'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN dropoff_point_custom BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Agregada columna dropoff_point_custom a bookings table';
    ELSE
        RAISE NOTICE 'Columna dropoff_point_custom ya existe';
    END IF;

END $$;

-- ============================================================================
-- VERIFICACIÓN: Confirmar que las columnas existen
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- ============================================================================
-- TEST: Verificar RPC funciona correctamente
-- ============================================================================
-- Descomentar y ejecutar con IDs reales de la BD:
-- SELECT * FROM finalize_bookings_atomic(
--   ARRAY['uuid-del-booking-1'::uuid, 'uuid-del-booking-2'::uuid],
--   'cash'
-- );
