-- ============================================================================
-- MIGRATION: Add Tables for Additional Features (Favorites, Analytics)
-- Date: 2025-04-08
-- Purpose: Support new features: Favorites, Analytics, History
-- ============================================================================

-- 1. Favorite Routes Table
-- Allows users to save and organize favorite routes
CREATE TABLE IF NOT EXISTS favorite_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  -- Constraints
  UNIQUE(user_id, route_id),
  
  -- Indexes
  CONSTRAINT favorite_routes_valid_user CHECK (user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_favorite_routes_user ON favorite_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_routes_route ON favorite_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_favorite_routes_saved_at ON favorite_routes(saved_at DESC);

-- 2. Enhanced Cancellation Records (view for analysis)
-- This is a view combining bookings cancellation data
CREATE OR REPLACE VIEW cancellation_history AS
SELECT 
  b.id,
  b.route_id,
  b.passenger_id,
  b.cancelled_at,
  b.cancellation_reason,
  b.refund_amount,
  b.refund_percentage,
  r.origin,
  r.destination,
  r.departure_time,
  r.driver_id,
  EXTRACT(EPOCH FROM (b.cancelled_at - r.departure_time)) / 3600 as hours_until_departure,
  CASE 
    WHEN b.refund_percentage = 100 THEN 'Full Refund'
    WHEN b.refund_percentage > 0 THEN 'Partial Refund'
    ELSE 'No Refund'
  END as refund_type
FROM bookings b
JOIN routes r ON b.route_id = r.id
WHERE b.cancelled_at IS NOT NULL
ORDER BY b.cancelled_at DESC;

-- 3. Rating Analytics Table (daily snapshots for trend analysis)
CREATE TABLE IF NOT EXISTS rating_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_reviews INT NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  five_star_count INT DEFAULT 0,
  four_star_count INT DEFAULT 0,
  three_star_count INT DEFAULT 0,
  two_star_count INT DEFAULT 0,
  one_star_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(date),
  CONSTRAINT rating_snapshots_valid_avg CHECK (average_rating >= 0 AND average_rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_rating_snapshots_date ON rating_snapshots(date DESC);

-- 4. Travel Preferences Table (for better personalization)
CREATE TABLE IF NOT EXISTS travel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Route preferences
  preferred_times TEXT, -- JSON: ["06:00", "07:00", "17:00", "18:00"]
  preferred_routes TEXT, -- JSON: ["Cali->Bogota", "Cali->Medellin"]
  avoid_routes TEXT, -- JSON: routes to avoid
  
  -- Travel preferences
  smoking_allowed BOOLEAN DEFAULT FALSE,
  music_preference VARCHAR(50), -- 'none', 'quiet', 'moderate', 'loud'
  ac_preference VARCHAR(50), -- 'cold', 'cool', 'normal', 'warm'
  luggage_restriction VARCHAR(50), -- 'strict', 'moderate', 'flexible'
  
  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT TRUE,
  price_alert_threshold DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT travel_preferences_unique_user UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_preferences_user ON travel_preferences(user_id);

-- 5. Trip Preferences (to store route-specific preferences)
CREATE TABLE IF NOT EXISTS trip_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  seat_preference VARCHAR(50), -- 'window', 'aisle', 'middle', 'any'
  temperature_preference VARCHAR(50),
  music_ok BOOLEAN DEFAULT FALSE,
  silence_preferred BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT trip_preferences_unique_booking UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_preferences_booking ON trip_preferences(booking_id);

-- ============================================================================
-- ROLLBACK Instructions (if needed):
-- ============================================================================
-- DROP VIEW IF EXISTS cancellation_history CASCADE;
-- DROP TABLE IF EXISTS favorite_routes CASCADE;
-- DROP TABLE IF EXISTS rating_snapshots CASCADE;
-- DROP TABLE IF EXISTS travel_preferences CASCADE;
-- DROP TABLE IF EXISTS trip_preferences CASCADE;
-- ============================================================================
