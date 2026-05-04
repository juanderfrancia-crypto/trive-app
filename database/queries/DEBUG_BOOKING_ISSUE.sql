-- ============================================================================
-- DEBUG: Revisar estado actual de bookings y rutas
-- ============================================================================

-- 1️⃣ Ver todas las rutas disponibles
SELECT 
  id,
  origin,
  destination,
  departure_time,
  total_seats,
  available_seats,
  occupied_seats,
  status,
  created_at
FROM routes
ORDER BY created_at DESC
LIMIT 5;

-- 2️⃣ Ver bookings recientes
SELECT 
  id,
  route_id,
  passenger_id,
  seat_number,
  booking_status,
  payment_status,
  payment_method,
  dropoff_point,
  dropoff_point_custom,
  created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;

-- 3️⃣ Ver bookings pending específicamente
SELECT 
  COUNT(*) as pending_count,
  route_id
FROM bookings
WHERE booking_status = 'pending'
GROUP BY route_id;

-- 4️⃣ Ver estructura de la tabla bookings (verificar si dropoff_point existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 5️⃣ Verificar estado de la tabla routes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'routes'
ORDER BY ordinal_position;

-- 6️⃣ Intentar ejecutar la función RPC manualmente (reemplaza los IDs con los reales)
-- SELECT * FROM finalize_bookings_atomic(
--   ARRAY['uuid-booking-1', 'uuid-booking-2']::uuid[],
--   'cash'
-- );

-- ============================================================================
-- INFORMACIÓN ÚTIL PARA DEBUGGING
-- ============================================================================
-- Si dropoff_point no existe, ejecutar:
-- ALTER TABLE bookings 
-- ADD COLUMN dropoff_point VARCHAR(255),
-- ADD COLUMN dropoff_point_custom BOOLEAN DEFAULT FALSE;
--
-- CREATE INDEX IF NOT EXISTS idx_bookings_dropoff ON bookings(dropoff_point);
