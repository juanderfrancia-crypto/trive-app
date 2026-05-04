-- 🔍 DIAGNÓSTICO: ¿POR QUÉ NO SE MUESTRAN LOS VIAJES ACTIVOS?
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- PASO 1: VER TODOS LOS BOOKINGS DEL USUARIO (reemplazar USER_ID)
-- ============================================================================

-- CAMBIA 'YOUR_USER_ID' por el ID real del usuario pasajero
SELECT 
  b.id,
  b.passenger_id,
  b.booking_status,
  b.route_id,
  b.seat_number,
  r.status as route_status,
  r.origin,
  r.destination,
  r.departure_time
FROM bookings b
LEFT JOIN routes r ON b.route_id = r.id
WHERE b.passenger_id = 'YOUR_USER_ID'  -- REEMPLAZAR CON ID REAL
ORDER BY b.created_at DESC;

-- ============================================================================
-- PASO 2: VER BOOKINGS CONFIRMADOS (lo que busca ActiveTripsScreen)
-- ============================================================================

SELECT COUNT(*) as bookings_confirmados
FROM bookings
WHERE passenger_id = 'YOUR_USER_ID'
AND booking_status = 'confirmed';

-- ============================================================================
-- PASO 3: VER RUTAS ACTIVAS (scheduled o in_progress)
-- ============================================================================

SELECT 
  r.id,
  r.origin,
  r.destination,
  r.status,
  r.departure_time,
  r.driver_id,
  COUNT(b.id) as booking_count
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id
WHERE r.status IN ('scheduled', 'in_progress')
GROUP BY r.id
ORDER BY r.departure_time;

-- ============================================================================
-- PASO 4: VERIFICAR RLS POLICIES EN BOOKINGS
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- ============================================================================
-- PASO 5: VERIFICAR RLS POLICIES EN ROUTES
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'routes'
ORDER BY policyname;

-- ============================================================================
-- QUÉ BUSCAR EN LOS RESULTADOS:
-- ============================================================================
--
-- ✅ PASO 1: Deberías ver bookings con:
--   - booking_status = 'confirmed'
--   - route_status = 'scheduled' O 'in_progress'
--   - Fechas futuras o actuales
--
-- ✅ PASO 2: Si el número es 0, entonces no hay bookings confirmados
--
-- ✅ PASO 3: Si hay rutas activas pero no aparecen en PASO 1,
--   significa que los bookings no se están asignando correctamente
--
-- ✅ PASO 4 & 5: Busca políticas que podrían estar bloqueando
--   la lectura de datos (usar auth.uid() = passenger_id)
--