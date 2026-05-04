-- 🧪 SCRIPT COMPLETO DE SETUP PARA TESTING
-- Ejecuta TODO este script en Supabase SQL Editor

-- ============================================================================
-- ⚠️ IMPORTANTE: ANTES DE EJECUTAR ESTE SCRIPT
-- ============================================================================
-- 1. Crea 3 cuentas en Supabase Authentication:
--    - Email: conductor1@test.com, Password: Test123!@#, Role: driver
--    - Email: pasajero1@test.com, Password: Test123!@#, Role: passenger
--    - Email: pasajero2@test.com, Password: Test123!@#, Role: passenger
--
-- 2. Abre la tabla "auth.users" en Supabase y copia los IDs (UUID) de cada usuario
-- 3. Reemplaza los UUIDs abajo en el script
-- 4. Luego ejecuta este script

-- ============================================================================
-- FASE 1: CREAR PERFILES USANDO IDs DE auth.users
-- ============================================================================

-- INSTRUCCIONES:
-- 1. En Supabase Auth, busca los usuarios creados
-- 2. Copia sus IDs UUID
-- 3. Reemplaza los valores abajo:

-- Reemplaza AQUI por el UUID del usuario conductor1@test.com
-- Reemplaza AQUI por el UUID del usuario pasajero1@test.com  
-- Reemplaza AQUI por el UUID del usuario pasajero2@test.com

-- Insertar perfiles de prueba
INSERT INTO public.profiles 
  (id, name, email, phone, role, total_trips, rating, is_driver_verified, created_at)
VALUES
  (
    '47ceabb7-0850-4cac-b436-d8170f7ab5c2',
    'Juan Conductor Testing',
    'conductor1@test.com',
    '+573001234567',
    'driver',
    0,
    5.0,
    true,
    NOW()
  ),
  (
    '930d68a3-3076-40a4-9509-be7fa687a677',
    'Carlos Pasajero 1',
    'pasajero1@test.com',
    '+573009876543',
    'passenger',
    0,
    5.0,
    false,
    NOW()
  ),
  (
    'ac12b62d-9320-410e-b2e6-1b59753c18c2',
    'María Pasajero 2',
    'pasajero2@test.com',
    '+573005555555',
    'passenger',
    0,
    5.0,
    false,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FASE 2: CREAR RUTAS DE PRUEBA
-- ============================================================================

-- Ruta 1: Bogotá → Cali (4 asientos)
INSERT INTO public.routes 
  (
    driver_id, 
    origin, 
    destination, 
    departure_time, 
    arrival_time,
    total_seats, 
    available_seats, 
    price_per_seat, 
    vehicle_make, 
    vehicle_model,
    vehicle_year,
    vehicle_color,
    vehicle_plate,
    status,
    created_at
  )
VALUES
  (
    '47ceabb7-0850-4cac-b436-d8170f7ab5c2',
    'Bogotá',
    'Cali',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '7 hours',
    4,
    4,
    50000,
    'Toyota',
    'Camry',
    2024,
    'Blanco',
    'ABC-1234',
    'scheduled',
    NOW()
  )
RETURNING id AS route1_id;

-- Ruta 2: Bogotá → Medellín (3 asientos)
INSERT INTO public.routes 
  (
    driver_id, 
    origin, 
    destination, 
    departure_time, 
    arrival_time,
    total_seats, 
    available_seats, 
    price_per_seat, 
    vehicle_make, 
    vehicle_model,
    vehicle_year,
    vehicle_color,
    vehicle_plate,
    status,
    created_at
  )
VALUES
  (
    '47ceabb7-0850-4cac-b436-d8170f7ab5c2',
    'Bogotá',
    'Medellín',
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '9 hours',
    3,
    3,
    45000,
    'Toyota',
    'Camry',
    2024,
    'Blanco',
    'ABC-1234',
    'scheduled',
    NOW()
  )
RETURNING id AS route2_id;

-- ============================================================================
-- VERIFICAR QUE LOS DATOS SE CREARON
-- ============================================================================

SELECT 'USUARIOS CREADOS' as section;
SELECT id, name, email, role FROM profiles 
WHERE email IN ('conductor1@test.com', 'pasajero1@test.com', 'pasajero2@test.com');

SELECT 'RUTAS CREADAS' as section;
SELECT id, origin, destination, total_seats, available_seats, status, departure_time 
FROM routes 
WHERE driver_id IN (
  SELECT id FROM profiles WHERE email = 'conductor1@test.com'
)
ORDER BY created_at DESC;

-- ============================================================================
-- DATOS PARA GUARDAR PARA TESTING (SE GENERARÁN AUTOMÁTICAMENTE)
-- ============================================================================

-- Después de ejecutar:
-- 1. Anota los IDs de las rutas que aparecen en el resultado (route1_id, route2_id)
-- 2. Abre la app y login como:
--    - conductor1@test.com (Test123!@#)
--    - pasajero1@test.com (Test123!@#)
--    - pasajero2@test.com (Test123!@#)
-- 3. Continúa con el testing en QA_TESTING_MASTER_GUIDE.md