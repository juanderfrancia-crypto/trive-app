-- 🧪 QA TESTING - FASE 5: VERIFICACIÓN COMPLETA DEL SISTEMA

SELECT '════════════════════════════════════════════════════════════════' as "=";
SELECT '🧪 QA TESTING DASHBOARD - VERIFICACIÓN COMPLETA DEL SISTEMA' as "DASHBOARD";
SELECT '════════════════════════════════════════════════════════════════' as "=";

-- ============================================================================
-- SECCIÓN 1: USUARIOS
-- ============================================================================
SELECT '
📱 SECCIÓN 1: USUARIOS DE PRUEBA' as section;

SELECT 
  id,
  name,
  email,
  role,
  CASE WHEN is_verified = true THEN '✅ Verificado' ELSE '⚠️ No verificado' END as status
FROM profiles 
WHERE email IN ('conductor1@test.com', 'pasajero1@test.com', 'pasajero2@test.com')
ORDER BY role DESC;

-- ============================================================================
-- SECCIÓN 2: RUTAS CREADAS
-- ============================================================================
SELECT '
🚗 SECCIÓN 2: RUTAS CREADAS' as section;

SELECT 
  id,
  origin || ' → ' || destination as route,
  total_seats as total,
  available_seats as available,
  CASE 
    WHEN total_seats = available_seats THEN '🟢 Todos disponibles'
    WHEN available_seats = 0 THEN '🔴 LLENO'
    ELSE '🟡 Parcialmente ocupado'
  END as availability_status,
  price_per_seat as price,
  status,
  TO_CHAR(departure_time, 'HH24:MI') as departure_time
FROM routes 
WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY departure_time ASC;

-- ============================================================================
-- SECCIÓN 3: BOOKINGS Y OCUPACIÓN
-- ============================================================================
SELECT '
📋 SECCIÓN 3: BOOKINGS Y OCUPACIÓN' as section;

SELECT 
  (SELECT origin || ' → ' || destination FROM routes WHERE id = b.route_id LIMIT 1) as route,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN booking_status = 'cancelled' THEN 1 END) as cancelled,
  SUM(CASE WHEN booking_status = 'confirmed' THEN b.price ELSE 0 END) as total_revenue
FROM bookings b
WHERE b.route_id IN (
  SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
)
GROUP BY b.route_id;

-- ============================================================================
-- SECCIÓN 4: DETALLE DE BOOKINGS POR PASAJERO
-- ============================================================================
SELECT '
👥 SECCIÓN 4: BOOKINGS DETALLADO' as section;

SELECT 
  p.name as passenger,
  (SELECT origin || ' → ' || destination FROM routes WHERE id = b.route_id LIMIT 1) as route,
  b.seat_number as seat,
  b.booking_status as status,
  b.price,
  TO_CHAR(b.created_at, 'HH24:MI:SS') as created_at
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
WHERE b.route_id IN (
  SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
)
ORDER BY b.route_id, b.seat_number;

-- ============================================================================
-- SECCIÓN 5: DISPONIBILIDAD EN TIEMPO REAL
-- ============================================================================
SELECT '
📊 SECCIÓN 5: VISTA DISPONIBLE RIDES (Lo que ven pasajeros)' as section;

SELECT 
  id,
  origin || ' → ' || destination as route,
  seats_available_count as available,
  total_seats as total,
  ROUND((seats_available_count::float / total_seats::float * 100), 1) as occupancy_percent,
  price_per_seat as price,
  driver_name as driver,
  TO_CHAR(departure_time, 'HH24:MI') as departure
FROM available_rides
WHERE driver_user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY departure_time ASC;

-- ============================================================================
-- SECCIÓN 6: CONSISTENCIA DE DATOS
-- ============================================================================
SELECT '
🔍 SECCIÓN 6: VERIFICACIÓN DE CONSISTENCIA' as section;

SELECT 
  r.id,
  r.origin || ' → ' || r.destination as route,
  r.total_seats,
  r.available_seats as db_available,
  (r.total_seats - COUNT(CASE WHEN b.booking_status IN ('confirmed', 'completed') THEN 1 END)) as calculated_available,
  COUNT(CASE WHEN b.booking_status IN ('confirmed', 'completed') THEN 1 END) as occupied_seats,
  CASE 
    WHEN r.available_seats = (r.total_seats - COUNT(CASE WHEN b.booking_status IN ('confirmed', 'completed') THEN 1 END)) 
    THEN '✅ CONSISTENTE'
    ELSE '❌ INCONSISTENCIA'
  END as consistency_check
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id
WHERE r.driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
GROUP BY r.id;

-- ============================================================================
-- SECCIÓN 7: NOTIFICACIONES
-- ============================================================================
SELECT '
🔔 SECCIÓN 7: NOTIFICACIONES' as section;

SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
  type,
  MAX(created_at) as latest_notification
FROM notifications
WHERE user_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'a1234567-89ab-cdef-0123-456789abcdef',
  'b2345678-90ab-cdef-0123-456789abcdef'
)
GROUP BY type;

-- ============================================================================
-- SECCIÓN 8: RESUMEN EJECUTIVO DE TESTING
-- ============================================================================
SELECT '
📈 SECCIÓN 8: RESUMEN EJECUTIVO' as section;

SELECT 
  'Rutas Creadas' as metric,
  COUNT(*) as value
FROM routes 
WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

UNION ALL

SELECT 'Total Bookings', COUNT(*)
FROM bookings
WHERE route_id IN (SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479')

UNION ALL

SELECT 'Bookings Confirmados', COUNT(*)
FROM bookings
WHERE route_id IN (SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
AND booking_status = 'confirmed'

UNION ALL

SELECT 'Asientos Ocupados', COUNT(*)
FROM bookings
WHERE route_id IN (SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
AND booking_status IN ('confirmed', 'completed')

UNION ALL

SELECT 'Revenue Total', 
  COALESCE(SUM(price), 0)
FROM bookings
WHERE route_id IN (SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
AND booking_status = 'confirmed';

-- ============================================================================
-- SECCIÓN 9: ESTADO DE RLS Y SEGURIDAD
-- ============================================================================
SELECT '
🔐 SECCIÓN 9: ESTADO DE RLS Y SEGURIDAD' as section;

SELECT 
  tablename,
  rowsecurity as rls_enabled,
  COUNT(*) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename IN ('routes', 'bookings', 'notifications', 'profiles')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

SELECT '════════════════════════════════════════════════════════════════' as "=";
SELECT '✅ TESTING COMPLETO - REVISA LOS RESULTADOS ARRIBA' as "STATUS";
SELECT '════════════════════════════════════════════════════════════════' as "=";