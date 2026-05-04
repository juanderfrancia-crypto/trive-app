-- 🧪 QA TESTING - FASE 3: VERIFICAR RESERVAS (DESPUÉS DE PASAJERO RESERVA 2 ASIENTOS EN RUTA 1)

SELECT '══════════════════════════════════════════' as "=";
SELECT 'FASE 3: VERIFICACIÓN DE RESERVAS' as "TEST";
SELECT '══════════════════════════════════════════' as "=";

-- ANTES DE EJECUTAR ESTA QUERY:
-- Pasajero 1 DEBE haber reservado 2 asientos en Ruta Bogotá → Cali

-- Test 3.1: Verificar que se creó el booking
SELECT 
  COUNT(*) as total_bookings_creados,
  COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN passenger_id = 'a1234567-89ab-cdef-0123-456789abcdef' THEN 1 END) as bookings_pasajero_1
FROM bookings b
WHERE b.route_id = (
  SELECT id FROM routes 
  WHERE origin = 'Bogotá' AND destination = 'Cali'
  AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  LIMIT 1
);

-- Test 3.2: Ver detalles de los bookings creados
SELECT 
  b.id as booking_id,
  p.name as passenger_name,
  b.seat_number,
  b.booking_status,
  b.price,
  b.created_at,
  CASE WHEN b.booking_status = 'confirmed' THEN '✅ Confirmado' ELSE '❌ ' || b.booking_status END as status_check
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
WHERE b.route_id = (
  SELECT id FROM routes 
  WHERE origin = 'Bogotá' AND destination = 'Cali'
  AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  LIMIT 1
)
ORDER BY b.seat_number;

-- Test 3.3: Verificar que available_seats se actualizó correctamente
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  COUNT(b.id) as occupied_seats,
  (r.total_seats - COUNT(b.id)) as calculated_available,
  CASE 
    WHEN r.available_seats = (r.total_seats - COUNT(b.id)) THEN '✅ Correcto'
    ELSE '❌ INCONSISTENCIA'
  END as consistency_check
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id 
  AND b.booking_status IN ('confirmed', 'completed')
WHERE r.origin = 'Bogotá' AND r.destination = 'Cali'
  AND r.driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
GROUP BY r.id;

-- Test 3.4: Verificar en available_rides view (lo que ve el pasajero)
SELECT 
  *
FROM available_rides
WHERE origin = 'Bogotá' AND destination = 'Cali'
AND driver_user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
LIMIT 1;

-- Test 3.5: Verificar precio total pagado (2 asientos × $50,000)
SELECT 
  SUM(b.price) as total_pagado_esperado_100000,
  COUNT(*) as asientos_reservados_esperado_2,
  AVG(b.price) as precio_promedio_esperado_50000
FROM bookings b
WHERE b.passenger_id = 'a1234567-89ab-cdef-0123-456789abcdef'
AND b.booking_status = 'confirmed'
AND b.route_id = (
  SELECT id FROM routes 
  WHERE origin = 'Bogotá' AND destination = 'Cali'
  AND driver_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  LIMIT 1
);

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
--
-- Total bookings: 2
-- Confirmed: 2
-- Pasajero 1: 2 bookings
--
-- Bookings:
-- - Asiento 1: Pasajero 1, confirmed, $50,000
-- - Asiento 2: Pasajero 1, confirmed, $50,000
--
-- Ruta status:
-- - Total seats: 4
-- - Available seats: 2 (4 - 2 ocupados)
-- - Consistency: ✅ Correcto
--
-- Available rides view: Muestra 2 asientos disponibles
--
-- Precio total: $100,000 (2 × $50,000)
--
-- ✅ SI TODOS LOS VALORES SON CORRECTOS, PASA FASE 3
-- ❌ SI FALLA, REVISAR TRIGGERS Y RLS POLICIES
--