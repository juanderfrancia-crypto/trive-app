-- 🔧 MIGRATION: Add 'recommend' column to reviews table
-- Date: 2026-04-25
-- Purpose: Support user recommendation feature for ratings

-- Add 'recommend' column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS recommend BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN public.reviews.recommend IS 'Whether the reviewer recommends the reviewee (driver/passenger)';

-- Create index for better query performance on recommend field
CREATE INDEX IF NOT EXISTS idx_reviews_recommend ON public.reviews(recommend) WHERE recommend = true;

-- Create index for combined queries
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_rating ON public.reviews(reviewee_id, rating);

-- ✅ Migration complete
-- Test: SELECT * FROM reviews LIMIT 1; should show 'recommend' column
