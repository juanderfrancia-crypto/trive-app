-- 🏆 MIGRATION: Reputation System Tables
-- Date: 2026-04-25
-- Purpose: Add achievements, badges, and weighted rating system

-- =====================================
-- 1. ACHIEVEMENTS TABLE (Available badges)
-- =====================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50) NOT NULL,
  min_trips INT DEFAULT 0,
  min_rating DECIMAL(2,1) DEFAULT 0,
  min_recommendations_percent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- 2. DRIVER ACHIEVEMENTS (User badges)
-- =====================================
CREATE TABLE IF NOT EXISTS driver_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(driver_id, achievement_id)
);

-- =====================================
-- 3. RATING WEIGHTS CONFIG
-- =====================================
CREATE TABLE IF NOT EXISTS rating_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  weight_average DECIMAL(3,2) DEFAULT 0.50,
  weight_consistency DECIMAL(3,2) DEFAULT 0.20,
  weight_recency DECIMAL(3,2) DEFAULT 0.15,
  weight_recommendations DECIMAL(3,2) DEFAULT 0.15,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- 4. DEFAULT ACHIEVEMENTS
-- =====================================
INSERT INTO achievements (code, name, description, icon_name, min_trips, min_rating, min_recommendations_percent) 
VALUES 
  ('beginner', 'Principiante', 'Completó 5 viajes', 'star-outline', 5, 0, 0),
  ('reliable', 'Confiable', '10 viajes con rating ≥ 4.0', 'checkmark-circle', 10, 4.0, 0),
  ('excellent', 'Excelente', '30 viajes con rating ≥ 4.5', 'star', 30, 4.5, 0),
  ('recommended', 'Recomendado', '50% recomendaciones (20+ viajes)', 'heart', 20, 0, 50),
  ('premium', 'Premium', '100 viajes con rating ≥ 4.7 y 80% recomendaciones', 'crown', 100, 4.7, 80)
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 5. DEFAULT RATING CONFIG
-- =====================================
INSERT INTO rating_config (name, weight_average, weight_consistency, weight_recency, weight_recommendations)
VALUES ('default', 0.50, 0.20, 0.15, 0.15)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================
CREATE INDEX IF NOT EXISTS idx_driver_achievements_driver_id ON driver_achievements(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_achievements_achievement_id ON driver_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_driver_achievements_unlocked_at ON driver_achievements(unlocked_at);

-- =====================================
-- 7. VIEW: DRIVER REPUTATION SUMMARY
-- =====================================
DROP VIEW IF EXISTS driver_reputation_summary CASCADE;
CREATE VIEW driver_reputation_summary AS
SELECT 
  p.id as driver_id,
  p.name,
  COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) as avg_rating,
  COUNT(r.id) as total_reviews,
  COALESCE(ROUND(STDDEV(r.rating)::NUMERIC, 2), 0) as rating_consistency,
  COALESCE(SUM(CASE WHEN r.recommend = true THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(r.id), 0) * 100, 0) as recommend_percent,
  COUNT(DISTINCT rt.id) as completed_trips,
  COUNT(da.id) as achievement_count,
  ARRAY_AGG(DISTINCT a.code) FILTER (WHERE a.code IS NOT NULL) as achievement_codes
FROM profiles p
LEFT JOIN reviews r ON r.reviewee_id = p.id
LEFT JOIN routes rt ON rt.driver_id = p.id AND rt.status = 'completed'
LEFT JOIN driver_achievements da ON da.driver_id = p.id
LEFT JOIN achievements a ON a.id = da.achievement_id
GROUP BY p.id, p.name;

-- =====================================
-- 8. COMMENTS
-- =====================================
COMMENT ON TABLE achievements IS 'Available badges/achievements for drivers';
COMMENT ON TABLE driver_achievements IS 'User unlocked achievements/badges';
COMMENT ON TABLE rating_config IS 'Configuration for weighted rating calculation';
COMMENT ON VIEW driver_reputation_summary IS 'Aggregated reputation metrics for each driver';

-- ✅ Migration complete
