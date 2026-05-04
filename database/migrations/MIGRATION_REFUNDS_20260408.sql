-- ============================================
-- MIGRATION: Agregar campos de refund a bookings
-- ============================================
-- Esta migración agrega soporte para cancelaciones inteligentes
-- con refunds basados en tiempo de cancelación

-- Agregar columnas a la tabla bookings (si no existen)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

-- Crear índice para búsquedas rápidas de cancelaciones
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_cancelled ON bookings(booking_status, cancelled_at);

-- Verificar que las columnas fueron creadas
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' ORDER BY ordinal_position;

-- ROLLBACK (si es necesario):
-- ALTER TABLE bookings DROP COLUMN IF EXISTS refund_amount;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS refund_percentage;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS cancelled_at;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS cancellation_reason;
-- DROP INDEX IF EXISTS idx_bookings_cancelled_at;
-- DROP INDEX IF EXISTS idx_bookings_status_cancelled;
