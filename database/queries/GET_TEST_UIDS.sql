-- ============================================================================
-- GET TEST USERS UIDs - Run this in Supabase SQL Editor
-- ============================================================================

SELECT 
  id as UID,
  email,
  role,
  created_at
FROM public.profiles 
WHERE email IN ('test1@trive.local', 'test2@trive.local')
ORDER BY email;

-- ============================================================================
-- EXPECTED OUTPUT (ejemplo):
-- ============================================================================
-- UID                                  | email                | role       | created_at
-- xxxxxxxx-1111-2222-3333-xxxx1234     | test1@trive.local    | passenger  | 2026-04-08 10:00:00
-- xxxxxxxx-5555-6666-7777-xxxx5678     | test2@trive.local    | driver     | 2026-04-08 10:01:00

-- ============================================================================
-- GUARDAR ESTOS UIDs EN UN LUGAR SEGURO PARA REFERENCIA
-- ============================================================================
