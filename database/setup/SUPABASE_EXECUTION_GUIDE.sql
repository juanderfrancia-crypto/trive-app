-- ✅ GUÍA EJECUCIÓN - PASO A PASO
-- Total de pasos: 3
-- Tiempo estimado: 5 minutos

-- ====================================================================================
-- PASO 1: CREAR EL TRIGGER QUE RECALCULA available_seats AUTOMÁTICAMENTE
-- ====================================================================================

-- ⏱️ Tiempo: 2 minutos
-- 📍 Ubicación: Supabase Dashboard → SQL Editor
-- 🎯 Objetivo: Que available_seats se recalcule solo cuando hay cambios en bookings

-- 1️⃣ Abre Supabase y ve a SQL Editor
-- 2️⃣ Copia TODO lo de abajo (desde CREATE OR REPLACE hasta el último $$)
-- 3️⃣ Pega en SQL Editor
-- 4️⃣ Click "Run" (o Ctrl+Enter)
-- 5️⃣ Deberías ver: "Success" sin errores

-- COPIAR Y EJECUTAR ESTO:

CREATE OR REPLACE FUNCTION update_route_available_seats()
RETURNS TRIGGER AS $$
DECLARE
  v_route_id UUID;
  v_total_seats INT;
  v_confirmed_count INT;
BEGIN
  v_route_id := COALESCE(NEW.route_id, OLD.route_id);
  
  SELECT total_seats INTO v_total_seats
  FROM routes WHERE id = v_route_id;
  
  IF v_total_seats IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT COUNT(*) INTO v_confirmed_count
  FROM bookings
  WHERE route_id = v_route_id
  AND booking_status = 'confirmed';
  
  UPDATE routes
  SET available_seats = GREATEST(0, v_total_seats - v_confirmed_count),
      updated_at = NOW()
  WHERE id = v_route_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Ahora crear los 3 TRIGGERS:

CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_insert
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_route_available_seats();

CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_update
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.booking_status != NEW.booking_status)
EXECUTE FUNCTION update_route_available_seats();

CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_delete
AFTER DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_route_available_seats();

-- ✅ Si ves "Success" en los 4 comandos, continúa al PASO 2

-- ====================================================================================
-- PASO 2: LIMPIAR DATOS EXISTENTES (una sola vez)
-- ====================================================================================

-- ⏱️ Tiempo: 1 minuto
-- 🎯 Objetivo: Que available_seats actual sea correcto en todas las rutas

-- COPIAR Y EJECUTAR ESTO:

UPDATE routes r
SET available_seats = r.total_seats - (
  SELECT COALESCE(COUNT(*), 0)
  FROM bookings
  WHERE route_id = r.id
  AND booking_status = 'confirmed'
),
updated_at = NOW();

-- ✅ Deberías ver: "X rows updated" (donde X es el número de rutas)

-- ====================================================================================
-- PASO 3: VERIFICAR QUE TODO FUNCIONA
-- ====================================================================================

-- ⏱️ Tiempo: 1 minuto
-- 🎯 Objetivo: Confirmar que el TRIGGER recalcula correctamente

-- COPIAR Y EJECUTAR ESTO:

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
    THEN '✅ OK'
    ELSE '❌ INCORRECTO'
  END as verificacion
FROM routes r
ORDER BY r.created_at DESC
LIMIT 5;

-- ✅ Todos deberían mostrar ✅ OK en la columna "verificacion"
-- Si alguno muestra ❌ INCORRECTO, ejecuta de nuevo PASO 1 y PASO 2

-- ====================================================================================
-- PASO 4: RECARGAR EXPO
-- ====================================================================================

-- Después de ejecutar todo lo de arriba en Supabase:
-- 1️⃣ Ve a tu terminal donde está Expo
-- 2️⃣ Presiona: Ctrl+C (para detener)
-- 3️⃣ Espera 3 segundos
-- 4️⃣ Escribe: npm start
-- 5️⃣ Abre tu app nuevamente

-- ====================================================================================
-- LISTO! AHORA PRUEBA EL FLUJO COMPLETO
-- ====================================================================================

-- 1. Abre la app
-- 2. Busca una ruta con asientos disponibles
-- 3. Selecciona 2-3 asientos
-- 4. Confirma la reserva
-- 5. Abre otra ventana/usuario (o inspector de Chrome)
-- 6. Ve al DriverPanel
-- 7. Debería ver esos 2-3 pasajeros nuevos ✅
-- 8. available_seats debería disminuir ✅

-- ====================================================================================
-- SI ALGO NO FUNCIONA
-- ====================================================================================

-- ❌ ERROR: "relation does not exist"
-- Solución: Verifica que las tablas bookings y routes existen en Supabase

-- ❌ ERROR: "TRIGGER no actualiza"
-- Solución: Ve a Extensions → Realtime, y revisa que los triggers estén activos

-- ❌ ERROR: "available_seats sigue siendo incorrecto"
-- Solución: 
-- a) Ejecuta de nuevo el PASO 1 (recrear función y triggers)
-- b) Ejecuta de nuevo el PASO 2 (limpiar datos)
-- c) Verifica con el PASO 3

-- ❌ DriverPanel muestra 0 pasajeros
-- Solución: Verifica que bookings tienen status='confirmed'
-- SELECT * FROM bookings WHERE route_id = 'tu-ruta-uuid' LIMIT 5;

-- ====================================================================================
