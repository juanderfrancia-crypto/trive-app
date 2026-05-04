-- Migration: add vehicle_photo_url column to profiles for vehicle photo uploads

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_vehicle_photo ON profiles(vehicle_photo_url);
