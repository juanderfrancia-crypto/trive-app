-- 📋 FLUJO COMPLETO DE RESERVA - FIX COMPLETO
-- Ejecutar PRIMERO: CREATE_AVAILABLE_SEATS_TRIGGER.sql
-- Luego: UPDATE la RPC finalize_bookings_atomic con el código nuevo

-- ============================================================================
-- ¿CUÁL ERA EL PROBLEMA?
-- ============================================================================

-- ANTES (INCORRECTO):
-- 1. reservePendingBookings inserta bookings con status='pending'
-- 2. finalizePendingBookings actualiza a 'confirmed' y DECREMENTA available_seats
-- 3. releasePendingBookings CANCELA e INCREMENTA available_seats
-- ❌ RACE CONDITION: Si 2 confirmaciones simultáneas:
--    - A: SELECT available_seats (5)
--    - B: SELECT available_seats (5) 
--    - A: available_seats = 5 - 1 = 4 ✓
--    - B: available_seats = 5 - 1 = 4 ✗ (debería ser 3!)

-- ============================================================================
-- ¿CUÁL ES LA SOLUCIÓN?
-- ============================================================================

-- 1️⃣ TRIGGER en DB que recalcula automáticamente:
--    available_seats = total_seats - COUNT(confirmed bookings)

-- 2️⃣ API simplificada - solo cambiar status de bookings:
--    - NO sumar/decrementar available_seats manualmente
--    - El TRIGGER se encarga

-- 3️⃣ RPC finalize_bookings_atomic recalcula con TRIGGER:
--    UPDATE routes SET available_seats = total_seats - COUNT(*)

-- RESULTADO:
-- ✅ Atómico a nivel DB
-- ✅ Sin race conditions
-- ✅ Simple y predecible
-- ✅ Funciona con múltiples confirmaciones simultáneas

-- ============================================================================
-- PASO A PASO DE EJECUCIÓN
-- ============================================================================

-- PASO 1: Ejecutar en Supabase SQL Editor
-- Copia TODO el contenido de: CREATE_AVAILABLE_SEATS_TRIGGER.sql
-- (Esto crea el TRIGGER que recalcula available_seats)

-- PASO 2: Verificar el TRIGGER
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'bookings';

-- Debería mostrar:
-- trigger_update_available_seats_on_booking_insert  | INSERT
-- trigger_update_available_seats_on_booking_update  | UPDATE
-- trigger_update_available_seats_on_booking_delete  | DELETE

-- PASO 3: Refrescar Expo
-- Close: Ctrl+C en terminal
-- Open: npm start o eas build:preview

-- ============================================================================
-- FLUJO ACTUALIZADO (CORRECTO)
-- ============================================================================

-- 1️⃣ USUARIO SELECCIONA ASIENTOS
-- SeatSelectionScreen.tsx:
-- - validaSaca que no estén reservados (check confirmed + pending)
-- - Llama: reservePendingBookings()

-- 2️⃣ RESERVAR COMO PENDING
-- useBookings.ts → reservePendingBookings():
-- INSERT bookings { status='pending', ... }
-- ✅ No toca available_seats (TRIGGER opcional para pending)
-- Retorna: booking IDs para BookingScreen

-- 3️⃣ USUARIO CONFIRMA EN BOOKING SCREEN  
-- BookingScreen.tsx → Selecciona parada + método de pago
-- Llama: finalizePendingBookings(bookingIds, paymentMethod)

-- 4️⃣ CONFIRMAR BOOKINGS
-- useBookings.ts → finalizePendingBookings():
-- Llama RPC: finalize_bookings_atomic({
--   p_booking_ids: [id1, id2, ...],
--   p_payment_method: 'cash' o 'card'
-- })

-- 5️⃣ RPC ATÓMICA
-- FIX_RACE_CONDITION_ATOMIC_BOOKING.sql → finalize_bookings_atomic():
-- a) LOCK routes (exclusivo)
-- b) Valida que bookings están en 'pending'
-- c) Valida que hay suficientes asientos
-- d) UPDATE bookings SET status='confirmed' (todos juntos)
-- e) UPDATE routes SET available_seats = total_seats - COUNT(confirmed) ← RECALCULA
-- f) Retorna: { success, message, updated_bookings_count, remaining_seats }
-- ✅ TRIGGER actualiza también si cambia status

-- 6️⃣ CONDUCTOR VE PASAJEROS
-- DriverPanelScreen.tsx:
-- Polling cada 2 segundos (no 1):
-- SELECT * FROM routes WHERE driver_id = ? AND status IN ('scheduled', 'in_progress')
-- SELECT * FROM bookings WHERE route_id = ? AND status = 'confirmed'
-- Muestra: passengers agrupados por dropoff_point
-- ✅ available_seats siempre correcto por el TRIGGER

-- 7️⃣ LIBERACIÓN DE PENDING (Ej: usuario no pagó)
-- useBookings.ts → releasePendingBookings():
-- UPDATE bookings SET status='cancelled' WHERE id IN (...)
-- ✅ TRIGGER automáticamente recalcula available_seats
-- No hace más manual updates

-- 8️⃣ CANCELACIÓN DE CONFIRMED
-- useBookings.ts → cancelBooking():
-- UPDATE bookings SET status='cancelled' WHERE id = ?
-- ✅ TRIGGER automáticamente recalcula available_seats
-- Asiento vuelve a estar disponible

-- ============================================================================
-- VERIFICACIÓN: COMPROBAR QUE FUNCIONA
-- ============================================================================

-- Query para verificar que available_seats es correcto:
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  (SELECT COUNT(*) FROM bookings b 
   WHERE b.route_id = r.id AND b.booking_status = 'confirmed'
  ) as confirmed_bookings,
  (r.total_seats - (SELECT COUNT(*) FROM bookings b 
    WHERE b.route_id = r.id AND b.booking_status = 'confirmed')
  ) as should_be_available,
  CASE 
    WHEN r.available_seats = (r.total_seats - (SELECT COUNT(*) FROM bookings b 
      WHERE b.route_id = r.id AND b.booking_status = 'confirmed'))
    THEN '✅ CORRECTO'
    ELSE '❌ INCORRECTO'
  END as status
FROM routes r
ORDER BY r.created_at DESC
LIMIT 5;

-- Todos deberían mostrar ✅ CORRECTO

-- ============================================================================
-- VENTAJAS DE ESTE DISEÑO
-- ============================================================================

-- 1. ATOMICIDAD A NIVEL DB
--    - No hay race conditions
--    - TRIGGER ejecuta después de cada cambio

-- 2. SIMPLICIDAD EN API
--    - Solo cambiar booking_status
--    - available_seats se recalcula automático

-- 3. CONSISTENCIA GARANTIZADA
--    - available_seats = total_seats - COUNT(confirmed)
--    - SIEMPRE verdad, sin excepciones

-- 4. ESCALABLE
--    - Funciona con N confirmaciones simultáneas
--    - Funciona con N liberaciones simultáneas

-- 5. SIN ESTADO MANUAL EN APP
--    - DriverPanel solo lee from DB
--    - No necesita cache complejo

-- ============================================================================
-- SI ALGO FALLA
-- ============================================================================

-- ERROR: "available_seats < 0"
-- Solución: Ejecutar de nuevo CREATE_AVAILABLE_SEATS_TRIGGER.sql

-- ERROR: "TRIGGER no actualiza"
-- Verificar: SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'bookings'
-- Debería mostrar 3 triggers

-- ERROR: "DriverPanel muestra 0 asientos cuando hay pasajeros"
-- Verificar: SELECT * FROM routes WHERE id = 'route-uuid'
-- available_seats debería = total_seats - passengers.count

-- ============================================================================
-- PRÓXIMOS PASOS
-- ============================================================================

-- 1. Ejecutar CREATE_AVAILABLE_SEATS_TRIGGER.sql en Supabase
-- 2. Verificar que los 3 triggers existen
-- 3. Limpiar datos con el UPDATE que recalcula
-- 4. npm start / Reopen Expo
-- 5. Probar:
--    - Seleccionar 2 asientos en SeatSelectionScreen
--    - Confirmar en BookingScreen
--    - Ver en DriverPanel que aparecen esos 2 pasajeros
--    - Verificar que available_seats disminuye

-- ============================================================================
