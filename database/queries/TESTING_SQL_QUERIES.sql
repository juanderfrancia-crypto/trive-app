-- 🔍 QUERIES DE VERIFICACIÓN PARA TESTING

-- ============================================================================
-- PASO 1: VERIFICAR RUTAS CREADAS
-- ============================================================================

-- Ver todas las rutas programadas del conductor
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.departure_time,
  r.status,
  r.total_seats,
  r.available_seats,
  r.price_per_seat,
  r.driver_id,
  p.name as driver_name
FROM routes r
LEFT JOIN profiles p ON r.driver_id = p.id
WHERE r.status IN ('scheduled', 'in_progress', 'completed')
ORDER BY r.departure_time DESC
LIMIT 10;

-- ============================================================================
-- PASO 2: VERIFICAR BOOKINGS (RESERVAS)
-- ============================================================================

-- Ver todos los bookings confirmados
SELECT 
  b.id,
  b.route_id,
  b.passenger_id,
  b.booking_status,
  b.seat_number,
  b.price,
  b.created_at,
  p.name as passenger_name,
  r.origin,
  r.destination
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
LEFT JOIN routes r ON b.route_id = r.id
WHERE b.booking_status IN ('confirmed', 'completed')
ORDER BY b.created_at DESC
LIMIT 20;

-- ============================================================================
-- PASO 3: VERIFICAR ASIENTOS DISPONIBLES POR RUTA
-- ============================================================================

-- Para una ruta específica, ver ocupación de asientos
-- (Reemplaza 'ROUTE_ID' con el ID real)
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  COUNT(b.id) as booked_seats,
  (r.total_seats - COUNT(b.id)) as seats_remaining,
  STRING_AGG(b.seat_number::text, ', ') as occupied_seats
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id 
  AND b.booking_status IN ('confirmed', 'completed')
WHERE r.id = 'ROUTE_ID'  -- ← REEMPLAZA CON ROUTE_ID
GROUP BY r.id;

-- ============================================================================
-- PASO 4: VERIFICAR PASAJEROS EN UNA RUTA
-- ============================================================================

-- Ver todos los pasajeros que han reservado en una ruta
SELECT 
  p.name as passenger_name,
  p.phone,
  p.email,
  b.seat_number,
  b.booking_status,
  b.price,
  b.created_at,
  b.dropoff_point
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
WHERE b.route_id = 'ROUTE_ID'  -- ← REEMPLAZA CON ROUTE_ID
AND b.booking_status IN ('confirmed', 'completed')
ORDER BY b.seat_number;

-- ============================================================================
-- PASO 5: VERIFICAR CANCELACIONES
-- ============================================================================

-- Ver bookings cancelados (para verificar que se liberan asientos)
SELECT 
  b.id,
  b.route_id,
  b.passenger_id,
  b.seat_number,
  b.booking_status,
  b.created_at,
  p.name as passenger_name,
  r.origin,
  r.destination
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
LEFT JOIN routes r ON b.route_id = r.id
WHERE b.booking_status = 'cancelled'
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- PASO 6: VERIFICAR NOTIFICATIONS
-- ============================================================================

-- Ver notificaciones enviadas (debe haber cuando:
-- - Se inicia viaje
-- - Se cancela viaje
-- - Etc)
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- PASO 7: VERIFICAR ESTADO DE UNA RUTA ESPECÍFICA
-- ============================================================================

-- Estado completo de una ruta (reemplaza 'ROUTE_ID')
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.departure_time,
  r.status,
  r.total_seats,
  r.available_seats,
  r.price_per_seat,
  p.name as driver_name,
  COUNT(CASE WHEN b.booking_status = 'confirmed' THEN 1 END) as confirmed_passengers,
  COUNT(CASE WHEN b.booking_status = 'completed' THEN 1 END) as completed_passengers,
  COUNT(CASE WHEN b.booking_status = 'cancelled' THEN 1 END) as cancelled_bookings
FROM routes r
LEFT JOIN profiles p ON r.driver_id = p.id
LEFT JOIN bookings b ON r.id = b.route_id
WHERE r.id = 'ROUTE_ID'  -- ← REEMPLAZA CON ROUTE_ID
GROUP BY r.id, p.id;

-- ============================================================================
-- PASO 8: VERIFICAR VISTA available_rides (para pasajeros)
-- ============================================================================

-- Esto es lo que ven los pasajeros
SELECT *
FROM available_rides
WHERE departure_time > NOW()
AND departure_time < NOW() + INTERVAL '24 hours'
ORDER BY departure_time
LIMIT 10;

-- ============================================================================
-- PASO 9: VERIFICAR RLS POLICIES (SEGURIDAD)
-- ============================================================================

-- Verificar que las políticas RLS están correctas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('routes', 'bookings', 'notifications')
ORDER BY tablename, policyname;

-- ============================================================================
-- PASO 10: LIMPIAR DATOS DE PRUEBA (CUANDO HAYAS TERMINADO)
-- ============================================================================

-- CUIDADO: Esto eliminará datos

-- Opción 1: Eliminar específicas
-- DELETE FROM bookings WHERE route_id = 'ROUTE_ID';
-- DELETE FROM routes WHERE id = 'ROUTE_ID';

-- Opción 2: Eliminar un usuario completamente
-- DELETE FROM bookings WHERE passenger_id = 'USER_ID';
-- DELETE FROM routes WHERE driver_id = 'USER_ID';
-- DELETE FROM profiles WHERE id = 'USER_ID';

-- ============================================================================
-- TIPS PARA TESTING
-- ============================================================================
--
-- 1. Copia cada query en Supabase SQL Editor
-- 2. Reemplaza valores como ROUTE_ID, USER_ID según necesites
-- 3. Ejecuta después de cada prueba para verificar datos
-- 4. Verifica que los números coincidan:
--    - Total seats = confirmed + available seats
--    - Bookings confirmados aparecen en available_rides view
--    - No hay bookings "hung" (sin status)
--
-- ============================================================================