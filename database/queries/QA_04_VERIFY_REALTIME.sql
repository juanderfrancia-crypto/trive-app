-- 🧪 QA TESTING - FASE 4: VERIFICAR ACTUALIZACIÓN EN TIEMPO REAL

SELECT '══════════════════════════════════════════' as "=";
SELECT 'FASE 4: ACTUALIZACIÓN EN TIEMPO REAL' as "TEST";
SELECT '══════════════════════════════════════════' as "=";

-- ANTES DE EJECUTAR:
-- Pasajero 2 DEBE haber reservado Asiento 3 en Ruta 1 (Bogotá → Cali)
-- Esperar a que se actualice en BD (trigger ejecuta en <1 segundo)

-- Test 4.1: Verificar que ambos pasajeros tienen reservas
SELECT 
  p.name as passenger_name,
  COUNT(*) as asientos_reservados
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
WHERE b.route_id = (
  SELECT id FROM routes 
  WHERE origin = 'Bogotá' AND destination = 'Cali'
  AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  LIMIT 1
)
AND b.booking_status = 'confirmed'
GROUP BY p.name
ORDER BY p.name;

-- Test 4.2: Verificar lista completa de asientos (ocupados vs disponibles)
SELECT 
  CASE WHEN b.id IS NOT NULL THEN '🔴 OCUPADO' ELSE '🟢 DISPONIBLE' END as status,
  GENERATE_SERIES(1, 4) as seat_number,
  COALESCE(p.name, 'Vacío') as passenger_or_empty,
  COALESCE(b.id, 'N/A') as booking_id
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) AS seats(n)
LEFT JOIN (
  SELECT b.seat_number, b.id, p.name
  FROM bookings b
  LEFT JOIN profiles p ON b.passenger_id = p.id
  WHERE b.route_id = (
    SELECT id FROM routes 
    WHERE origin = 'Bogotá' AND destination = 'Cali'
    AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    LIMIT 1
  )
  AND b.booking_status = 'confirmed'
) AS booked ON seats.n = booked.seat_number
ORDER BY seats.n;

-- Test 4.3: Verificar que available_seats se actualizó a 1 (4 - 3 ocupados)
SELECT 
  available_seats as asientos_disponibles_esperado_1,
  total_seats as total_asientos_4,
  (total_seats - available_seats) as asientos_ocupados_3
FROM routes
WHERE origin = 'Bogotá' AND destination = 'Cali'
AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
LIMIT 1;

-- Test 4.4: Verificar en available_rides view (consistencia para pasajeros)
SELECT 
  seats_available_count as asientos_disponibles_en_view,
  total_seats as total_en_view,
  departure_time
FROM available_rides
WHERE origin = 'Bogotá' AND destination = 'Cali'
AND driver_user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
LIMIT 1;

-- Test 4.5: Medir tiempo desde última actualización (para confirmar realtime)
SELECT 
  MAX(b.created_at) as ultima_reserva,
  NOW() as tiempo_actual,
  EXTRACT(SECOND FROM (NOW() - MAX(b.created_at))) as segundos_desde_ultima_reserva
FROM bookings b
WHERE b.route_id = (
  SELECT id FROM routes 
  WHERE origin = 'Bogotá' AND destination = 'Cali'
  AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  LIMIT 1
);

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
--
-- Pasajeros:
-- - Carlos Pasajero 1: 2 asientos
-- - María Pasajero 2: 1 asiento
--
-- Asientos:
-- - Seat 1: 🔴 OCUPADO (Carlos)
-- - Seat 2: 🔴 OCUPADO (Carlos)
-- - Seat 3: 🔴 OCUPADO (María)
-- - Seat 4: 🟢 DISPONIBLE
--
-- Available seats: 1 (4 - 3 ocupados)
-- Available rides view: 1 asiento disponible
--
-- Segundos desde última reserva: < 5 segundos (indica realtime funciona)
--
-- ✅ SI TODOS LOS VALORES SON CORRECTOS, PASA FASE 4
-- ❌ SI FALLA, REVISAR REALTIME SUBSCRIPTIONS
--