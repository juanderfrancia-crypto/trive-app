-- TEST DATA: Membership Updates
-- Ejecuta esto en Supabase SQL Editor DESPUÉS de MEMBERSHIP_SETUP.sql

-- 1. Actualizar un usuario con Membresía Premium (30 días)
UPDATE profiles 
SET membership_type = 'premium', 
    membership_expiry = NOW() + INTERVAL '30 days'
WHERE role = 'passenger' 
LIMIT 1;

-- 2. Actualizar otro usuario con Membresía VIP (Ilimitada)
UPDATE profiles 
SET membership_type = 'vip', 
    membership_expiry = NULL
WHERE role = 'passenger' 
LIMIT 1 OFFSET 1;

-- 3. Actualizar conductor con Membresía Basic (7 días)
UPDATE profiles 
SET membership_type = 'basic', 
    membership_expiry = NOW() + INTERVAL '7 days'
WHERE role = 'driver' 
LIMIT 1;

-- 4. Dejar usuarios con Free (default - sin actualizar)

-- Verificar cambios
SELECT id, name, email, role, membership_type, membership_expiry FROM profiles ORDER BY created_at DESC LIMIT 5;
