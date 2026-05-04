-- PROFILE PHOTO FIX - Execute this in Supabase SQL Editor
-- This fixes the RLS issue by dropping and recreating the function with SECURITY DEFINER

-- Step 1: Drop the existing function (if it exists)
DROP FUNCTION IF EXISTS update_profile_photo(UUID, TEXT);

-- Step 2: Ensure the column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Step 3: Create a function with SECURITY DEFINER (runs with admin privileges)
CREATE OR REPLACE FUNCTION update_profile_photo(user_id UUID, photo_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET profile_photo_url = photo_url,
      updated_at = NOW()
  WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_profile_photo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_photo(UUID, TEXT) TO anon;
