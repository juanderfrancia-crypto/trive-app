-- ============================================================================
-- TEST USERS CREATION - Push Notifications & Features Testing
-- Date: 8 de Abril de 2026
-- Purpose: Create test users for APK testing
-- ============================================================================

-- USER 1: test1@trive.local
-- Email: test1@trive.local
-- Password: Test123!@#
-- Role: passenger
-- Expected UID: [Generar en Supabase Auth]

-- USER 2: test2@trive.local  
-- Email: test2@trive.local
-- Password: Test123!@#
-- Role: driver (para full testing de ambos lados)
-- Expected UID: [Generar en Supabase Auth]

-- ============================================================================
-- MANUAL STEPS IN SUPABASE:
-- ============================================================================

-- 1. Go to: Supabase Dashboard → Your Project → Authentication → Users
-- 2. Click "Add user"
-- 3. Fill in:
--    - Email: test1@trive.local
--    - Password: Test123!@#
--    - Auto confirm email: YES
-- 4. Click "Create User"
-- 5. Copy the UID (UUID format)
-- 6. Repeat for test2@trive.local

-- ============================================================================
-- AFTER USERS ARE CREATED IN AUTH:
-- ============================================================================

-- Insert into profiles table (REPLACE UID_1 and UID_2 with actual UUIDs):

INSERT INTO public.profiles (
  id, 
  name, 
  email, 
  phone, 
  role, 
  is_admin,
  rating,
  avatar_url,
  created_at,
  updated_at
)
VALUES
(
  'UID_1', -- Replace with actual UUID from User 1
  'Test User 1',
  'test1@trive.local',
  '3001234567',
  'passenger',
  false,
  4.5,
  NULL,
  NOW(),
  NOW()
),
(
  'UID_2', -- Replace with actual UUID from User 2
  'Test User 2 (Driver)',
  'test2@trive.local',
  '3009876543',
  'driver',
  false,
  4.8,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- OPTIONAL: Add test data
-- ============================================================================

-- If needed, add test routes, create sample bookings, etc.
-- Contact support for full test data population if needed.

-- ============================================================================
-- RETRIEVE UIDS (para guardar en notas):
-- ============================================================================

-- Run this query to get the UUIDs:
SELECT id, email, role, created_at 
FROM public.profiles 
WHERE email LIKE 'test%@trive.local'
ORDER BY created_at DESC;

-- Expected Output:
-- | id (UUID)                          | email                | role       | created_at         |
-- |-------------------------------------|----------------------|------------|-------------------|
-- | xxxxxxxx-xxxx-xxxx-xxxx-xxxx (UID) | test2@trive.local    | driver     | 2026-04-08 ...     |
-- | xxxxxxxx-xxxx-xxxx-xxxx-xxxx (UID) | test1@trive.local    | passenger  | 2026-04-08 ...     |
