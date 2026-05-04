-- ===============================================
-- RACE CONDITION FIX - Ejecutar en Supabase SQL Editor
-- ===============================================
-- Este script arregla el problema: 2 usuarios pueden reservar el mismo asiento
-- IMPORTANTE: Ejecutar en orden, verificar que CADA statement funcione

-- ===============================================
-- PASO 1: Verificar constraint actual
-- ===============================================
-- Ejecuta esto PRIMERO para ver si el constraint ya existe
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'bookings';

-- Verifica especialmente si existe "unique_route_seat" o similar
-- Si ve: unique_route_seat → Ya existe, skip al PASO 2
-- Si NO ve nada relacionado con route+seat → Continuar PASO 1B


-- ===============================================
-- PASO 1B: Agregar constraint UNIQUE (si no existe)
-- ===============================================
-- IMPORTANTE: Ejecutar esta línea SOLO SI no existe el constraint del PASO 1

ALTER TABLE bookings
ADD CONSTRAINT unique_route_seat_confirmed 
UNIQUE (route_id, seat_number) 
WHERE booking_status != 'cancelled';

-- ⏳ Espera mensaje: "ALTER TABLE completed"
-- ✅ Si OK: El system ahora NO permitirá 2 bookings en mismo asiento
-- ❌ Si error "already exists": El constraint ya existe, es OK


-- ===============================================
-- PASO 2: Habilitar extensión pg_cron (CRITICAL!)
-- ===============================================
-- Si NO habilitai pg_cron, el auto-update de bookings NO funcionará

-- Primero verificar si ya está habilitada
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si output vacío → No está habilitada, ejecutar:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ⏳ Espera mensaje: "CREATE EXTENSION"
-- ✅ Si OK: pg_cron está habilitada


-- ===============================================
-- PASO 3: Crear función SQL para actualizar bookings vencidos
-- ===============================================
-- Esta función busca bookings 'confirmed' cuya ruta ya pasó
-- y los marca como 'completed' automáticamente

CREATE OR REPLACE FUNCTION update_completed_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET booking_status = 'completed'
  WHERE 
    booking_status = 'confirmed'
    AND route_id IN (
      SELECT id FROM routes 
      WHERE departure_time < NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ⏳ Espera mensaje: "CREATE FUNCTION"
-- ✅ Si OK: Función creada, lista para ser usada


-- ===============================================
-- PASO 4: Crear CRON JOB (auto-ejecutar cada 5 min)
-- ===============================================
-- IMPORTANTE: Supabase DEBE tener pg_cron habilitada (PASO 2)

SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/5 * * * *',  -- Cada 5 minutos
  'SELECT update_completed_bookings()'
);

-- ⏳ Espera mensaje: "SELECT 1439" (o número similar)
-- ✅ Si OK: Cron job creado y ejecutándose cada 5 minutos


-- ===============================================
-- PASO 5: VERIFICACIÓN - Listar todos cron jobs
-- ===============================================
-- Ejecuta esto para CONFIRMAR que todo está correcto

SELECT 
  jobid,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE command LIKE '%update_completed_bookings%';

-- Esperado output:
-- jobid    | schedule        | command                              | nodename | active
-- 1439     | */5 * * * *     | SELECT update_completed_bookings()   | localhost | t

-- ✅ Si ves esto: ¡PERFECTO! El cron job está activo y corriendo


-- ===============================================
-- PASO 6: Ver logs del último cron execution
-- ===============================================
-- Esto te muestra si el cron job se ejecutó sin errores

SELECT 
  jobid,
  command,
  start_time,
  end_time,
  success
FROM cron.job_run_details
WHERE command LIKE '%update_completed_bookings%'
ORDER BY start_time DESC
LIMIT 5;

-- ✅ Si ves rows con success=true: Todo funcionando
-- ❌ Si no ves nada: El job todavía no se ejecutó (espera 5 min)


-- ===============================================
-- PASO 7: Test manual - Crear booking de prueba
-- ===============================================
-- Este test verifica que el sistema funciona end-to-end

-- 7A: Crear ruta con departure_time en el PASADO
INSERT INTO routes (
  driver_id,
  origin, 
  destination,
  departure_time,
  arrival_time,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  available_seats,
  price_per_seat,
  route_status
)
VALUES (
  'YOUR_DRIVER_ID_HERE',  -- Reemplaza con driver real
  'Cali',
  'Bogotá',
  NOW() - INTERVAL '1 day',  -- 1 día en el PASADO
  NOW() - INTERVAL '1 day' + INTERVAL '5 hours',
  'Toyota',
  'Camry',
  2025,
  4,
  50000,
  'active'
)
RETURNING id;

-- ⏳ Copia el ID de la ruta (salida: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)


-- 7B: Crear booking en esa ruta
INSERT INTO bookings (
  route_id,
  passenger_id,
  seat_number,
  price,
  payment_method,
  payment_status,
  booking_status
)
VALUES (
  'ROUTE_ID_FROM_STEP_7A',  -- Pega el ID de la ruta
  'YOUR_PASSENGER_ID_HERE',  -- Reemplaza con passenger real
  1,
  50000,
  'cash',
  'pending',
  'confirmed'  -- Este debe cambiar a 'completed' después
)
RETURNING id, booking_status;

-- ⏳ Espera output: booking_status debe ser 'confirmed'


-- 7C: Esperar 5-6 minutos O ejecutar función manualmente
-- OPCIÓN A: Esperar (cron job ejecuta cada 5 min)
-- OPCIÓN B: Ejecutar inmediatamente (testing)

SELECT update_completed_bookings();

-- ⏳ Espera mensaje: "SELECT 1"


-- 7D: VERIFICAR - Booking debe estar 'completed' ahora
SELECT id, booking_status, booking_created_at
FROM bookings
WHERE id = 'BOOKING_ID_FROM_STEP_7B';

-- ✅ Esperado: booking_status = 'completed'
-- ❌ Si aún es 'confirmed': Algo falló, revisar logs


-- ===============================================
-- RESUMEN - Comandos en ORDEN
-- ===============================================
-- 1. PASO 1: Verificar constraint
-- 2. PASO 1B: Agregar constraint (si no existe)
-- 3. PASO 2: Habilitar pg_cron
-- 4. PASO 3: Crear función update_completed_bookings()
-- 5. PASO 4: Crear cron job (ejecuta cada 5 min)
-- 6. PASO 5: Verificar cron.job table
-- 7. PASO 6: Ver logs de ejecución (opcional)
-- 8. PASO 7: Test manual end-to-end

-- ===============================================
-- TROUBLESHOOTING
-- ===============================================

-- ❌ ERROR: "pg_cron extension not available"
-- FIX: Ir a Supabase Dashboard → Settings → Extensions → Buscar pg_cron y habilitar

-- ❌ ERROR: "constraint already exists"
-- FIX: Es OK, significa ya está creado. Skip ese paso.

-- ❌ ERROR: "function update_completed_bookings() already exists"
-- FIX: Es OK, reemplázalo con: CREATE OR REPLACE FUNCTION (ya está arriba)

-- ❌ Cron job no se ejecuta
-- FIX: 
--   a) Verificar que pg_cron está habilitada (Extension en Supabase)
--   b) Verificar que función SQL existe: SELECT * FROM information_schema.routines
--   c) Esperar 5 minutos (cron ejecuta cada 5 min)
--   d) Si aún no funciona: Contactar soporte Supabase

-- ===============================================
-- ROLLBACK (si algo sale mal)
-- ===============================================

-- Para deshacer el cron job:
-- SELECT cron.unschedule('update_completed_bookings_job');

-- Para eliminar constraint:
-- ALTER TABLE bookings DROP CONSTRAINT unique_route_seat_confirmed;

-- Para eliminar función:
-- DROP FUNCTION IF EXISTS update_completed_bookings();

-- ===============================================
