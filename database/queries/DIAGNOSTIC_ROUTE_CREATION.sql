-- ============================================================================
-- 🔍 DIAGNÓSTICO COMPLETO: FLUJO DE CREACIÓN DE RUTAS
-- ============================================================================

-- Ejecuta esta query en Supabase SQL Editor para diagnosticar problemas

-- ============================================================================
-- PASO 1: Ver todas las rutas creadas (últimas 10)
-- ============================================================================

SELECT 
  id,
  driver_id,
  origin,
  destination,
  departure_time,
  status,
  total_seats,
  available_seats,
  created_at,
  NOW() as tiempo_actual,
  CASE 
    WHEN departure_time > NOW() THEN '✅ FUTURA'
    ELSE '❌ PASADA'
  END as estado_temporal
FROM routes
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- PASO 2: Ver si la VIEW available_rides existe
-- ============================================================================

SELECT EXISTS(
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = 'public' AND table_name = 'available_rides'
) AS view_exists;

-- ============================================================================
-- PASO 3: Ver rutas en la VIEW (lo que ven los pasajeros)
-- ============================================================================

SELECT 
  id,
  origin,
  destination,
  departure_time,
  driver_name,
  status,
  total_seats,
  seats_available_count
FROM available_rides
ORDER BY departure_time ASC
LIMIT 20;

-- ============================================================================
-- PASO 4: Verificar si el conductor está verificado
-- ============================================================================

SELECT 
  id,
  email,
  role,
  driver_status,
  is_verified,
  created_at
FROM profiles
WHERE role = 'driver'
LIMIT 5;

-- ============================================================================
-- PASO 5: Comparar rutas en tabla vs VIEW
-- ============================================================================

-- Rutas en tabla routes
WITH routes_table AS (
  SELECT COUNT(*) as total_routes_table
  FROM routes
  WHERE status = 'scheduled' AND departure_time > NOW()
),

-- Rutas en VIEW
view_available_rides AS (
  SELECT COUNT(*) as total_available_rides
  FROM available_rides
)

SELECT 
  rt.total_routes_table,
  vr.total_available_rides,
  CASE 
    WHEN rt.total_routes_table = vr.total_available_rides THEN '✅ COINCIDE'
    WHEN rt.total_routes_table > vr.total_available_rides THEN '❌ VIEW FILTRA MÁS RUTAS'
    ELSE '⚠️ DIFERENCIA INESPERADA'
  END as estado
FROM routes_table rt
CROSS JOIN view_available_rides vr;

-- ============================================================================
-- PASO 6: Ver la definición de la VIEW
-- ============================================================================

SELECT view_definition
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'available_rides';

-- ============================================================================
-- PASO 7: Verificar políticas RLS en tabla routes
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as condicion,
  with_check as validacion
FROM pg_policies
WHERE tablename = 'routes'
ORDER BY policyname;

-- ============================================================================
-- PASO 8: Si la ruta no aparece, esto te dice por qué
-- ============================================================================

-- Reemplaza 'TU_ROUTE_ID' con el ID de la ruta que creaste

SELECT 
  r.id,
  r.origin,
  r.destination,
  r.departure_time,
  r.status,
  r.total_seats,
  r.available_seats,
  NOW() as ahora,
  CASE 
    WHEN r.departure_time IS NULL THEN '❌ departure_time es NULL'
    WHEN r.status != 'scheduled' THEN '❌ status no es "scheduled"'
    WHEN r.status = 'scheduled' AND r.departure_time IS NOT NULL AND r.departure_time <= NOW() THEN '❌ La hora ya pasó'
    WHEN r.total_seats - COALESCE((SELECT COUNT(*) FROM bookings WHERE route_id = r.id AND booking_status != 'cancelled'), 0) = 0 THEN '❌ No hay asientos disponibles'
    WHEN r.departure_time > NOW() AND r.status = 'scheduled' THEN '✅ DEBERÍA APARECER EN available_rides'
    ELSE '⚠️ Problema desconocido'
  END as por_que_no_aparece
FROM routes r
WHERE r.id = 'TU_ROUTE_ID'
LIMIT 1;

-- ============================================================================
-- PASO 9: Test de timestamp correcto
-- ============================================================================

-- Esto verifica si los timestamps se están guardando en formato correcto

SELECT 
  id,
  departure_time,
  arrival_time,
  EXTRACT(YEAR FROM departure_time) as año,
  EXTRACT(MONTH FROM departure_time) as mes,
  EXTRACT(DAY FROM departure_time) as dia,
  EXTRACT(HOUR FROM departure_time) as hora,
  EXTRACT(MINUTE FROM departure_time) as minutos,
  CASE 
    WHEN EXTRACT(HOUR FROM departure_time) IS NULL THEN '❌ Timestamp sin hora'
    WHEN EXTRACT(HOUR FROM departure_time) > 23 THEN '❌ Hora fuera de rango'
    WHEN EXTRACT(MINUTE FROM departure_time) > 59 THEN '❌ Minutos fuera de rango'
    ELSE '✅ Formato correcto'
  END as validacion_timestamp
FROM routes
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- PASO 10: Ver si hay errores en los logs (si tu app los registra)
-- ============================================================================

-- Si tienes tabla de logs, puedes revisar errores aquí
-- SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 20;
