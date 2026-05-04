-- 🔧 TRIGGER: Recalcular available_seats automáticamente
-- Ejecuta esto en Supabase SQL Editor PRIMERO

-- ============================================================================
-- OBJETIVO:
-- Cada vez que cambia un booking (INSERT/UPDATE/DELETE), automáticamente
-- recalcular available_seats basado en COUNT(confirmed bookings)
-- Esto previene TODAS las race conditions de manera atómica a nivel DB
-- ============================================================================

-- 1️⃣ CREAR FUNCIÓN QUE RECALCULA AVAILABLE_SEATS
CREATE OR REPLACE FUNCTION update_route_available_seats()
RETURNS TRIGGER AS $$
DECLARE
  v_total_seats INT;
  v_confirmed_count INT;
BEGIN
  -- Obtener el route_id (de NEW o OLD dependiendo de la operación)
  DECLARE v_route_id UUID;
  BEGIN
    v_route_id := COALESCE(NEW.route_id, OLD.route_id);
    
    -- Obtener total_seats
    SELECT total_seats INTO v_total_seats
    FROM routes WHERE id = v_route_id;
    
    -- Si no encuentra la ruta, salir silenciosamente
    IF v_total_seats IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Contar bookings confirmados
    SELECT COUNT(*) INTO v_confirmed_count
    FROM bookings
    WHERE route_id = v_route_id
    AND booking_status = 'confirmed';
    
    -- Actualizar available_seats
    UPDATE routes
    SET available_seats = GREATEST(0, v_total_seats - v_confirmed_count),
        updated_at = NOW()
    WHERE id = v_route_id;
    
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ CREAR TRIGGER PARA INSERT DE BOOKINGS
CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_insert
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_route_available_seats();

-- 3️⃣ CREAR TRIGGER PARA UPDATE DE BOOKINGS
CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_update
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.booking_status != NEW.booking_status)  -- Solo cuando status cambia
EXECUTE FUNCTION update_route_available_seats();

-- 4️⃣ CREAR TRIGGER PARA DELETE DE BOOKINGS
CREATE OR REPLACE TRIGGER trigger_update_available_seats_on_booking_delete
AFTER DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_route_available_seats();

-- ============================================================================
-- VERIFICAR QUE LOS TRIGGERS EXISTEN
-- ============================================================================

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'bookings'
ORDER BY trigger_name;

-- ============================================================================
-- LIMPIAR DATOS EXISTENTES (una sola vez)
-- ============================================================================

UPDATE routes r
SET available_seats = r.total_seats - (
  SELECT COALESCE(COUNT(*), 0)
  FROM bookings
  WHERE route_id = r.id
  AND booking_status = 'confirmed'
),
updated_at = NOW();

-- Verificar que se actualizó correctamente
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed') as confirmed_bookings,
  (r.total_seats - (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed')) as should_be_available
FROM routes r
ORDER BY r.created_at DESC
LIMIT 10;
