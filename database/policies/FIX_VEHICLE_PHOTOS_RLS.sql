-- FIX VEHICLE PHOTOS RLS POLICIES - WORKING VERSION
-- Execute this in Supabase SQL Editor to fix the "new row violates row-level security policy" error

-- Step 1: Drop ALL existing policies for vehicle-photos bucket
DROP POLICY IF EXISTS "Public access to vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "public-read-vehicle-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle photos" ON storage.objects;

-- Step 2: Create 3 clean policies for vehicle-photos bucket

-- Policy 1: Allow public to VIEW (SELECT) vehicle photos
CREATE POLICY "Anyone can view vehicle photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vehicle-photos');

-- Policy 2: Allow authenticated users to UPLOAD (INSERT) vehicle photos
-- This is the FIXED policy - allows ANY authenticated user to upload to ANY path
CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

-- Policy 3: Allow authenticated users to UPDATE their vehicle photos
CREATE POLICY "Authenticated users can update vehicle photos"
ON storage.objects
FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

-- Step 3: Verify policies are created
-- Run this query to check:
-- SELECT policyname, policyroles, qual, with_check FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage' 
-- AND policyname LIKE '%vehicle%';

