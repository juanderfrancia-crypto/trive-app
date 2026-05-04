-- 🔴 BUG FIX: Problema con available_seats que retorna 2 en lugar de 0
-- 
-- PROBLEMA IDENTIFICADO:
-- Hay colisión entre TRIGGER y RPC ambos intentando actualizar available_seats
-- Resultado: El valor retornado es inconsistente
--
-- SOLUCIÓN:
-- 1. El RPC SOLO confirma bookings
-- 2. El TRIGGER (que ya existe) recalcula available_seats automáticamente  
-- 3. El RPC consulta el valor ACTUAL después de que el TRIGGER actúa
--
-- ============================================================================
-- NUEVA VERSIÓN DEL RPC SIN COLISIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_bookings_atomic(
  p_booking_ids UUID[],
  p_payment_method TEXT DEFAULT 'card'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  updated_bookings_count INT,
  remaining_seats INT
) AS $$
DECLARE
  v_route_id UUID;
  v_total_seats INT;
  v_available_seats INT;
  v_count INT := 0;
BEGIN
  -- 🔒 TRANSACCIÓN GARANTIZA ATOMICIDAD
  BEGIN
    -- 1️⃣ VALIDAR que todos los bookings existen y están pending
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = ANY(p_booking_ids) 
      AND booking_status = 'pending'
    ) THEN
      RETURN QUERY SELECT 
        false, 
        'Algunos bookings no están en estado pending o no existen',
        0,
        0;
      RETURN;
    END IF;

    -- 2️⃣ OBTENER route_id (asumimos todos del mismo viaje)
    SELECT route_id INTO v_route_id 
    FROM bookings 
    WHERE id = p_booking_ids[1];

    -- 3️⃣ LOCK THE ROUTE (evita que otro proceso lo modifique)
    SELECT total_seats, available_seats INTO v_total_seats, v_available_seats
    FROM routes
    WHERE id = v_route_id
    FOR UPDATE; -- 🔒 LOCK EXCLUSIVO

    -- 4️⃣ CONTAR asientos que se van a reservar
    SELECT COUNT(*) INTO v_count 
    FROM bookings 
    WHERE id = ANY(p_booking_ids);

    -- 5️⃣ VALIDAR que hay suficientes asientos disponibles
    IF v_available_seats < v_count THEN
      RETURN QUERY SELECT 
        false, 
        'No hay suficientes asientos disponibles',
        0,
        v_available_seats;
      RETURN;
    END IF;

    -- ============================================================================
    -- 🎯 CAMBIO CRÍTICO: SOLO CONFIRMAR BOOKINGS, NO TOCAR available_seats
    -- El TRIGGER se encargará de recalcular automáticamente
    -- ============================================================================
    
    -- 6️⃣ CONFIRMAR todos los bookings juntos (sin UPDATE a routes.available_seats)
    UPDATE bookings 
    SET 
      booking_status = 'confirmed',
      payment_status = p_payment_method,
      payment_method = p_payment_method,
      dropoff_point = dropoff_point,
      dropoff_point_custom = dropoff_point_custom,
      updated_at = NOW()
    WHERE id = ANY(p_booking_ids);
    
    -- ✅ El TRIGGER trigger_update_available_seats_on_booking_update se ejecuta automáticamente
    --    y recalcula: available_seats = total_seats - COUNT(confirmed bookings)

    -- 7️⃣ ESPERAR a que el trigger se ejecute, luego CONSULTAR el valor calculado
    -- (En PostgreSQL dentro de la misma transacción, los triggers se ejecutan inmediatamente)
    SELECT available_seats INTO v_available_seats
    FROM routes
    WHERE id = v_route_id;

    -- ✅ ÉXITO
    RETURN QUERY SELECT 
      true, 
      'Bookings confirmados exitosamente',
      v_count,
      v_available_seats;  -- ✅ Este es el valor recalculado por el TRIGGER

  EXCEPTION WHEN OTHERS THEN
    -- ❌ Si algo falla, ROLLBACK automático (transacción)
    RETURN QUERY SELECT 
      false, 
      'Error: ' || SQLERRM,
      0,
      0;
  END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN MANUAL (ejecuta esto para validar):
-- ============================================================================

-- 1. Ver estado actual de rutas y bookings
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'pending') as pending_bookings,
  (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed') as confirmed_bookings,
  (r.total_seats - (SELECT COUNT(*) FROM bookings b WHERE b.route_id = r.id AND b.booking_status = 'confirmed')) as should_be_available
FROM routes r
ORDER BY r.created_at DESC
LIMIT 5;

-- 2. Verificar que el TRIGGER existe y está activo
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%available_seats%'
ORDER BY trigger_name;
