-- ============================================================================
-- 🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE RESERVAS
-- Ejecutar este script en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1️⃣ VERIFICAR QUE LA RPC finalize_bookings_atomic EXISTE
-- ============================================================================
SELECT
  p.proname AS function_name,
  p.proargnames AS parameter_names,
  p.proargtypes AS parameter_types,
  pg_get_function_result(p.oid) AS return_type,
  CASE WHEN p.proiswindow THEN 'yes' ELSE 'no' END AS is_window,
  CASE WHEN p.proisstrict THEN 'yes' ELSE 'no' END AS is_strict,
  CASE WHEN p.proretset THEN 'yes' ELSE 'no' END AS returns_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'finalize_bookings_atomic'
AND n.nspname = 'public';

-- ============================================================================
-- 2️⃣ VERIFICAR TRIGGERS EN TABLA bookings
-- ============================================================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_reference_old_table,
  action_reference_new_table
FROM information_schema.triggers
WHERE event_object_table = 'bookings'
ORDER BY trigger_name;

-- ============================================================================
-- 3️⃣ VERIFICAR COLUMNAS dropoff_point EN bookings
-- ============================================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('dropoff_point', 'dropoff_point_custom', 'booking_status', 'payment_status')
ORDER BY column_name;

-- ============================================================================
-- 4️⃣ VERIFICAR FUNCIÓN DEL TRIGGER (update_route_available_seats)
-- ============================================================================
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'update_route_available_seats'
AND n.nspname = 'public';

-- ============================================================================
-- 5️⃣ ESTADO ACTUAL DE RUTAS (con disponibles)
-- ============================================================================
SELECT
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  r.status,
  (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed') AS confirmed_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'pending') AS pending_count,
  CASE
    WHEN r.available_seats = (r.total_seats - (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed'))
    THEN '✅ CONSISTENTE'
    ELSE '❌ INCONSISTENTE'
  END AS status_check
FROM routes r
ORDER BY r.created_at DESC
LIMIT 10;

-- ============================================================================
-- 6️⃣ BOOKINGS RECIENTES
-- ============================================================================
SELECT
  b.id,
  b.route_id,
  b.seat_number,
  b.booking_status,
  b.payment_status,
  b.dropoff_point,
  b.dropoff_point_custom,
  b.created_at
FROM bookings b
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7️⃣ PRUEBA MANUAL DE LA RPC (con bookings de prueba)
-- ============================================================================
-- Primero, obtener IDs de bookings pending para probar:
WITH pending_bookings AS (
  SELECT id FROM bookings
  WHERE booking_status = 'pending'
  LIMIT 3
)
SELECT
  'Ejecuta este query con tus bookings pending:' AS instruction,
  'SELECT * FROM finalize_bookings_atomic(ARRAY[' ||
  string_agg('''' || id || '''::uuid', ', ') ||
  '], ''cash'');' AS example_query
FROM pending_bookings;

-- ============================================================================
-- RESUMEN DE CHECKLIST
-- ============================================================================
SELECT
  'CHECKLIST DE VERIFICACIÓN' AS verification_summary,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'finalize_bookings_atomic' AND n.nspname = 'public'
    )
    THEN '✅ RPC finalize_bookings_atomic existe'
    ELSE '❌ RPC finalize_bookings_atomic NO existe'
  END AS rpc_check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_table = 'bookings'
      AND trigger_name = 'trigger_update_available_seats_on_booking_insert'
    )
    THEN '✅ TRIGGER insert existe'
    ELSE '❌ TRIGGER insert NO existe'
  END AS trigger_insert_check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_table = 'bookings'
      AND trigger_name = 'trigger_update_available_seats_on_booking_update'
    )
    THEN '✅ TRIGGER update existe'
    ELSE '❌ TRIGGER update NO existe'
  END AS trigger_update_check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'dropoff_point'
    )
    THEN '✅ Columna dropoff_point existe'
    ELSE '❌ Columna dropoff_point NO existe'
  END AS dropoff_column_check;