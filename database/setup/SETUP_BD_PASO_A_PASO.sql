-- ===========================================
-- PASO 1: VERIFICAR QUE LAS TABLAS EXISTAN
-- ===========================================
-- Si obtienes errores aquí, el DATABASE_SETUP.sql no fue ejecutado

-- Ejecuta primero el DATABASE_SETUP.sql completo en tu Supabase SQL Editor
-- Luego cuando las tablas existan, ejecuta esto:

-- ===========================================
-- PASO 2: CREAR RUTAS DE PRUEBA ARMENIA-CALI
-- ===========================================

-- Primero, obtén el ID de un conductor (reemplaza con un ID real de tu BD)
SELECT id, email, role FROM profiles WHERE role = 'driver' LIMIT 5;

-- Una vez tengas un driver_id, ejecuta estos INSERTs:
-- IMPORTANTE: Reemplaza 'YOUR_DRIVER_UUID_HERE' con el ID real del conductor

INSERT INTO routes (
  driver_id, 
  origin, 
  destination, 
  departure_time, 
  arrival_time, 
  price_per_seat, 
  total_seats, 
  available_seats, 
  vehicle_make, 
  vehicle_model, 
  vehicle_year, 
  vehicle_plate, 
  vehicle_color,
  status
) VALUES (
  'YOUR_DRIVER_UUID_HERE'::uuid, 
  'Armenia', 
  'Cali', 
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '8 hours',
  45000, 
  4, 
  4, 
  'Toyota', 
  'Corolla',
  2023,
  'ABC-123',
  'Blanco',
  'scheduled'
);

-- Verificar que se creó correctamente
SELECT 
  id,
  origin,
  destination,
  total_seats,
  available_seats,
  price_per_seat,
  departure_time
FROM routes 
WHERE origin = 'Armenia' AND destination = 'Cali'
ORDER BY created_at DESC;

-- ===========================================
-- PASO 3: SI YA EXISTEN RUTAS, CORREGIR PUESTOS
-- ===========================================

-- Ver todas las rutas Armenia-Cali
SELECT 
  id,
  total_seats,
  available_seats,
  CURRENT_TIMESTAMP
FROM routes 
WHERE origin ILIKE '%armenia%' AND destination ILIKE '%cali%'
ORDER BY created_at DESC;

-- Si alguna tiene más de 4 puestos y no tiene reservas, actualizar:
UPDATE routes 
SET total_seats = 4, available_seats = 4
WHERE origin ILIKE '%armenia%' 
  AND destination ILIKE '%cali%'
  AND total_seats > 4
  AND available_seats = total_seats;

-- Verificar resultado
SELECT 
  id,
  total_seats,
  available_seats
FROM routes 
WHERE origin ILIKE '%armenia%' AND destination ILIKE '%cali%';
