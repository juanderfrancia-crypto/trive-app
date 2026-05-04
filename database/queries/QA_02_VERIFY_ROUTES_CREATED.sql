-- 🧪 QA TESTING - FASE 2: VERIFICAR RUTAS PUBLICADAS
-- Después de que el conductor cree las rutas en la app

SELECT '══════════════════════════════════════════' as "=";
SELECT 'FASE 2: VERIFICACIÓN DE RUTAS CREADAS' as "TEST";
SELECT '══════════════════════════════════════════' as "=";

-- Test 2.1: Ambas rutas existen en la BD
SELECT 
  COUNT(*) as total_rutas,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_rutas,
  COUNT(CASE WHEN total_seats = 4 THEN 1 END) as rutas_4_asientos,
  COUNT(CASE WHEN total_seats = 3 THEN 1 END) as rutas_3_asientos
FROM routes 
WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Test 2.2: Verificar detalles de cada ruta
SELECT 
  id,
  origin,
  destination,
  total_seats,
  available_seats,
  price_per_seat,
  status,
  departure_time,
  CASE WHEN total_seats = available_seats THEN '✅ Todos disponibles' ELSE '❌ Inconsistencia' END as asientos_status
FROM routes 
WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY departure_time ASC;

-- Test 2.3: Verificar que aparecen en available_rides view
SELECT 
  COUNT(*) as rutas_en_view_disponibles,
  COUNT(CASE WHEN available_seats_count > 0 THEN 1 END) as con_asientos_libres
FROM available_rides 
WHERE driver_user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Test 2.4: Verificar que no hay bookings aún
SELECT 
  (SELECT COUNT(*) FROM bookings WHERE route_id IN (
    SELECT id FROM routes WHERE driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  )) as total_bookings_esperado_0;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
--
-- Total rutas: 2
-- Scheduled: 2
-- Rutas con 4 asientos: 1
-- Rutas con 3 asientos: 1
-- 
-- Detalles:
-- - Ruta 1: Bogotá → Cali, 4 asientos, $50,000, scheduled
-- - Ruta 2: Bogotá → Medellín, 3 asientos, $45,000, scheduled
--
-- En available_rides: 2 rutas con asientos libres
-- Bookings: 0
--
-- ✅ SI TODOS ESTOS VALORES SON CORRECTOS, PASA FASE 2
-- ❌ SI ALGO FALLA, REVISAR BD O APP LOGS
--