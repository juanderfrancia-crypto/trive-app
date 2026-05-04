-- DRIVER DOCUMENTS TABLE - Document Upload and Verification System
-- Copy and paste this in the SQL Editor of your Supabase dashboard

-- Create driver_documents table
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'cedula', 'licencia', 'soat', 'tecnomecanica', 'antecedentes'
  file_path VARCHAR(500), -- Path in Supabase Storage: drivers/{driver_id}/{document_type}/{filename}
  file_name VARCHAR(255),
  file_size INT, -- in bytes
  file_type VARCHAR(50), -- mime type: 'application/pdf', 'image/jpeg', etc
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' (nuevo), 'verifying' (procesando), 'verified' (aprobado), 'rejected' (rechazado)
  rejection_reason TEXT, -- Reason if rejected
  uploaded_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP, -- When it was approved
  expiry_date DATE, -- Expiration date (if applicable)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(driver_id, document_type) -- Un documento por tipo por conductor
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_document_type ON driver_documents(document_type);

-- Enable RLS
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Drivers can see their own documents
CREATE POLICY "Drivers can view their own documents"
  ON driver_documents
  FOR SELECT
  USING (driver_id = auth.uid());

-- Drivers can insert their own documents
CREATE POLICY "Drivers can upload their own documents"
  ON driver_documents
  FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- Drivers can update their own documents (upload new version)
CREATE POLICY "Drivers can update their own documents"
  ON driver_documents
  FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Admins can view all documents (optional - for verification dashboard)
-- CREATE POLICY "Admins can view all documents"
--   ON driver_documents
--   FOR SELECT
--   USING (auth.jwt() ->> 'role' = 'admin');

-- Set up Supabase Storage bucket for driver documents
-- Note: You need to do this manually in the Supabase dashboard:
-- 1. Go to Storage → New Bucket
-- 2. Bucket name: "driver-documents"
-- 3. Privacy: PRIVATE
-- 4. Add RLS policies to allow drivers to upload/view their own docs

-- Example RLS policy for storage (set in Supabase dashboard):
-- Authenticated users can upload to their driver folder
-- auth.uid() = (storage.foldername)[0]
-- Authenticated users can download their own files
-- auth.uid() = (storage.foldername)[0]
