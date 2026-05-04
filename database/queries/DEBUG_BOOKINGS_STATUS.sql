-- ============================================================================
-- DEBUGGEAR ESTADO DE BOOKINGS
-- ============================================================================

-- 1️⃣ Ver todos los bookings con su estado
SELECT 
  id,
  route_id,
  passenger_id,
  seat_number,
  booking_status,
  payment_status,
  dropoff_point,
  dropoff_point_custom,
  created_at,
  updated_at
FROM bookings
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 2️⃣ Ver RESUMEN: Contar bookings por estado
SELECT 
  booking_status,
  COUNT(*) as count
FROM bookings
GROUP BY booking_status;

-- ============================================================================
-- 3️⃣ Ver estado de las rutas
SELECT 
  id,
  origin,
  destination,
  total_seats,
  available_seats,
  status,
  created_at
FROM routes
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 4️⃣ Debugging: Para CADA ruta, contar sus bookings confirmados
SELECT 
  r.id as route_id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  COUNT(b.id) as confirmed_bookings,
  (r.total_seats - r.available_seats) as expected_booked_seats
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id AND b.booking_status = 'confirmed'
GROUP BY r.id
ORDER BY r.created_at DESC
LIMIT 10;

-- ============================================================================
-- 5️⃣ Ver si hay bookings PENDIENTES (no confirmados)
SELECT 
  id,
  route_id,
  passenger_id,
  seat_number,
  booking_status,
  dropoff_point,
  created_at
FROM bookings
WHERE booking_status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
