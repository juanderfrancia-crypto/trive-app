-- ============================================================================
-- MIGRATION: Add Refund Tracking to Bookings Table
-- Date: 2025-04-08
-- Purpose: Enable intelligent refund calculation and tracking for cancellations
-- ============================================================================

-- Add new columns to track refund information
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

-- Create indices for performance on cancellation queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_cancelled ON bookings(booking_status, cancelled_at);

-- ============================================================================
-- ROLLBACK Instructions (if needed):
-- ============================================================================
-- ALTER TABLE bookings
-- DROP COLUMN IF EXISTS refund_amount,
-- DROP COLUMN IF EXISTS refund_percentage,
-- DROP COLUMN IF EXISTS cancelled_at,
-- DROP COLUMN IF EXISTS cancellation_reason;
--
-- DROP INDEX IF EXISTS idx_bookings_cancelled_at;
-- DROP INDEX IF EXISTS idx_bookings_status_cancelled;
-- ============================================================================
