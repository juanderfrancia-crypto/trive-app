-- DRIVER VERIFICATION STATUS TABLE
-- Add driver verification status to profiles table

-- 1. Add driver_verified column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_verified_at TIMESTAMP NULL;

-- 2. Create index for quick queries
CREATE INDEX IF NOT EXISTS idx_profiles_driver_verified ON profiles(driver_verified);

-- 3. Update RLS Policies to restrict route creation to verified drivers
-- Routes can only be created by verified drivers
CREATE POLICY "Only verified drivers can create routes"
  ON routes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'driver'
      AND profiles.driver_verified = TRUE
    )
  );

-- 4. Function to check if all documents are verified
CREATE OR REPLACE FUNCTION check_all_documents_verified(driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) = 5
    FROM driver_documents
    WHERE driver_id = driver_id
    AND document_type IN ('cedula', 'licencia', 'soat', 'tecnomecanica', 'antecedentes')
    AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to update driver verification status
CREATE OR REPLACE FUNCTION update_driver_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a document is approved, check if all documents are now verified
  IF NEW.status = 'verified' THEN
    IF check_all_documents_verified(NEW.driver_id) THEN
      UPDATE profiles
      SET driver_verified = TRUE, driver_verified_at = NOW()
      WHERE id = NEW.driver_id;
    END IF;
  END IF;
  
  -- When a document is rejected or reset, mark driver as not verified
  IF NEW.status IN ('rejected', 'verifying', 'pending') THEN
    UPDATE profiles
    SET driver_verified = FALSE
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update driver status
DROP TRIGGER IF EXISTS trigger_update_driver_verification ON driver_documents;
CREATE TRIGGER trigger_update_driver_verification
AFTER INSERT OR UPDATE ON driver_documents
FOR EACH ROW
EXECUTE PROCEDURE update_driver_verification_status();

-- 7. Function to manually verify a driver (for admin if needed)
CREATE OR REPLACE FUNCTION mark_driver_verified(driver_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET driver_verified = TRUE, driver_verified_at = NOW()
  WHERE id = driver_id AND role = 'driver';
END;
$$ LANGUAGE plpgsql;

-- 8. Function to unverify a driver
CREATE OR REPLACE FUNCTION mark_driver_unverified(driver_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET driver_verified = FALSE
  WHERE id = driver_id;
END;
$$ LANGUAGE plpgsql;

-- EXECUTION STEPS:
-- 1. Execute this SQL in Supabase dashboard → SQL Editor
-- 2. After execution, the driver_verified field will auto-update when documents are approved
-- 3. Check status: SELECT id, role, driver_verified, driver_verified_at FROM profiles WHERE role = 'driver';
