-- ADMIN DOCUMENTS VERIFICATION SYSTEM
-- Add admin field to profiles and update RLS policies

-- 1. Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 3. Update RLS Policies for driver_documents to allow admins to verify

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view all documents" ON driver_documents;
DROP POLICY IF EXISTS "Admins can update documents" ON driver_documents;

-- Create new admin policies
-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON driver_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Admins can update documents (for verification)
CREATE POLICY "Admins can update all documents"
  ON driver_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Public read access to document storage (optional - for verified documents only)
-- Admins can view storage files
-- Already handled by RLS policies on the bucket

-- Create admin audit table (optional but recommended)
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(50), -- 'approved', 'rejected'
  document_id UUID NOT NULL REFERENCES driver_documents(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_document_id ON admin_actions(document_id);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin actions
CREATE POLICY "Admins can view admin actions"
  ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Admins can insert admin actions
CREATE POLICY "Admins can insert admin actions"
  ON admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- HOW TO USE:
-- 1. Execute this SQL in Supabase dashboard
-- 2. Set a user as admin:
--    UPDATE profiles SET is_admin = TRUE WHERE id = 'user-id-here';
-- 3. That user can now view and verify documents
