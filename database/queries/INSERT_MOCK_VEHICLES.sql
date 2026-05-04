-- ============================================
-- MOCK DATA PARA TESTING DE VEHÍCULOS
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'driver-test-uuid-1' con el ID real del conductor de prueba
-- 2. Reemplaza 'user-test-uuid-1' con el ID real del usuario
-- 3. Ejecuta estos comandos en Supabase SQL Editor
--
-- NOTAS:
-- - Los vehículos se insertan como rutas activas
-- - El query en ProfileScreen obtiene el primer vehículo con LIMIT 1
-- - Estos datos son solo para testing, después puedes borrarlos

-- ============================================
-- OPCIÓN 1: Si ya tienes un usuario/conductor
-- ============================================

-- Insertar Auto de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status,
  created_at
) VALUES (
  'driver-test-uuid-1', -- ← Reemplaza con el ID del conductor
  'Carrera 7 #45-89, Bogotá',
  'Bogotá',
  'Carrera 50 #10-50, Medellín',
  'Medellín',
  '08:00:00',
  '12:00:00',
  4,
  3,
  45000,
  'Toyota Corolla',
  2022,
  'ABC-123',
  'Blanco',
  'auto',
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar Minibus de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status,
  created_at
) VALUES (
  'driver-test-uuid-2', -- ← Reemplaza con ID del segundo conductor
  'Terminal central, Bogotá',
  'Bogotá',
  'Centro comercial, Cali',
  'Cali',
  '06:00:00',
  '14:00:00',
  15,
  10,
  50000,
  'Hyundai H350',
  2021,
  'XYZ-789',
  'Azul marino',
  'minibus',
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar Bus de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status,
  created_at
) VALUES (
  'driver-test-uuid-3', -- ← Reemplaza con ID del tercer conductor
  'Terminal norte, Bogotá',
  'Bogotá',
  'Terminal sur, Bucaramanga',
  'Bucaramanga',
  '05:00:00',
  '13:00:00',
  80,
  45,
  35000,
  'Mercedes Benz O-500',
  2020,
  'BUS-001',
  'Amarillo escolar',
  'bus',
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar Taxi de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status,
  created_at
) VALUES (
  'driver-test-uuid-4', -- ← Reemplaza con ID del cuarto conductor
  'Avenida paseo, Bogotá',
  'Bogotá',
  'Zona G, Bogotá',
  'Bogotá',
  '10:00:00',
  '11:00:00',
  4,
  2,
  30000,
  'Chevrolet Aveo',
  2023,
  'TAX-456',
  'Amarillo taxi',
  'taxi',
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar Moto de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status,
  created_at
) VALUES (
  'driver-test-uuid-5', -- ← Reemplaza con ID del quinto conductor
  'Centro, Bogotá',
  'Bogotá',
  'Norte, Bogotá',
  'Bogotá',
  '09:00:00',
  '09:30:00',
  2,
  1,
  20000,
  'Honda CB150',
  2023,
  'MOT-789',
  'Negro',
  'moto',
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAR LOS DATOS INSERTADOS
-- ============================================
-- Ejecuta esto para ver los vehículos que insertaste:
-- SELECT id, driver_id, vehicle_make, vehicle_plate, vehicle_type FROM routes 
-- WHERE vehicle_type IS NOT NULL 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ============================================
-- LIMPIAR DATOS DE PRUEBA
-- ============================================
-- Si quieres borrar todos los datos de prueba después, usa:
-- DELETE FROM routes 
-- WHERE driver_id IN ('driver-test-uuid-1', 'driver-test-uuid-2', 'driver-test-uuid-3', 'driver-test-uuid-4', 'driver-test-uuid-5');
