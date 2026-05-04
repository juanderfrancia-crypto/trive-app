-- TRIVE APP - Test Data Seeds for End-to-End Testing
-- Run this script in Supabase SQL Editor after setting up DATABASE_SETUP.sql

-- ============================================
-- 1. CREATE TEST DRIVER USER (via Supabase CLI or Auth)
-- Manual Step: Create these users in Supabase Dashboard > Auth > Users
-- Email: conductor@test.com, Password: TestPass123!
-- Email: pasajero@test.com, Password: TestPass123!
-- ============================================

-- After creating auth users, insert their profiles
-- IMPORTANT: Replace UUIDs with actual user IDs from Supabase Auth

-- Example: Get user IDs from Supabase Dashboard > Auth > Users
-- conductor_uuid = "replace-with-actual-conductor-uuid"
-- passenger_uuid = "replace-with-actual-passenger-uuid"

-- INSERT DRIVER PROFILE
INSERT INTO profiles (id, name, email, phone, role, rating, total_trips, is_driver_verified)
VALUES (
  'conductor-uuid-here',
  'Rodrigo Vargas',
  'conductor@test.com',
  '+573001234567',
  'driver',
  4.8,
  124,
  TRUE
) ON CONFLICT(id) DO UPDATE SET updated_at = NOW();

-- INSERT DRIVER DETAILS
INSERT INTO drivers (id, license_number, license_expiry, vehicle_registration, vehicle_insurance_expiry, verified, total_trips, total_earnings, average_rating)
VALUES (
  'conductor-uuid-here',
  'CC1234567890',
  '2027-12-31',
  'PTX-234',
  '2027-12-31',
  TRUE,
  124,
  15600000,
  4.8
) ON CONFLICT(id) DO UPDATE SET updated_at = NOW();

-- INSERT TEST ROUTES (for conductor)
-- Route 1: Puerto Tejada to Cali
INSERT INTO routes (
  id,
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
  description,
  status
) VALUES (
  'route-uuid-1',
  'conductor-uuid-here',
  'Puerto Tejada',
  'Cali',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  5500,
  5,
  5,
  'Nissan',
  'Urvan',
  2023,
  'PTX-234',
  'Gris',
  'Vehículo cómodo con aire acondicionado',
  'scheduled'
) ON CONFLICT DO NOTHING;

-- Route 2: Cali to Bogotá
INSERT INTO routes (
  id,
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
  description,
  status
) VALUES (
  'route-uuid-2',
  'conductor-uuid-here',
  'Cali',
  'Bogotá',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days 8 hours',
  45000,
  4,
  4,
  'Toyota',
  'Hiace',
  2022,
  'PTX-890',
  'Blanco',
  'Vehículo seguro para viajes largos',
  'scheduled'
) ON CONFLICT DO NOTHING;

-- Route 3: Cali to Medellín
INSERT INTO routes (
  id,
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
  description,
  status
) VALUES (
  'route-uuid-3',
  'conductor-uuid-here',
  'Cali',
  'Medellín',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 7 hours',
  38000,
  6,
  6,
  'Mercedes-Benz',
  'Sprinter',
  2021,
  'MED-456',
  'Negro',
  'Vehículo premium con WiFi',
  'scheduled'
) ON CONFLICT DO NOTHING;

-- INSERT PASSENGER PROFILE
INSERT INTO profiles (id, name, email, phone, role, rating, total_trips, total_spent)
VALUES (
  'passenger-uuid-here',
  'María García',
  'pasajero@test.com',
  '+573009876543',
  'passenger',
  4.5,
  8,
  87500
) ON CONFLICT(id) DO UPDATE SET updated_at = NOW();

-- ============================================
-- SQL COMMANDS TO RUN IN SUPABASE:
-- ============================================
/*
1. Go to Supabase Dashboard
2. Create auth users:
   - Email: conductor@test.com, Password: TestPass123!
   - Email: pasajero@test.com, Password: TestPass123!
3. Copy the UUID of each user from Auth > Users
4. Replace 'conductor-uuid-here' and 'passenger-uuid-here' with actual UUIDs
5. Run this entire script in SQL Editor
6. Verify: Go to tables and see profiles, drivers, routes populated
*/

-- ============================================
-- VERIFY DATA AFTER INSERTING
-- ============================================
-- Run these queries to confirm:
-- SELECT * FROM profiles;
-- SELECT * FROM drivers;
-- SELECT id, origin, destination, vehicle_model, price_per_seat, available_seats FROM routes;
-- SELECT COUNT(*) as total_routes FROM routes;
