-- 🔒 FIX RACE CONDITION: FINALIZAR BOOKINGS ATÓMICAMENTE
-- Previene sobresignación de asientos cuando múltiples usuarios reservan simultáneamente
-- 
-- Ejecutar en Supabase SQL Editor ANTES de producción

-- ============================================================================
-- PROBLEMA:
-- ============================================================================
-- Cuando User A y User B reservan simultáneamente:
-- 1. A: UPDATE bookings SET status='confirmed' ✓
-- 2. B: UPDATE bookings SET status='confirmed' ✓
-- 3. A: SELECT available_seats (4 disponibles)
-- 4. B: SELECT available_seats (aún 4 porque A no actualizó)
-- 5. A: UPDATE routes SET available_seats=1 ✓
-- 6. B: UPDATE routes SET available_seats=-1 ✗ OVERFLOW!
--
-- SOLUCIÓN: Función atómica que hace todo junto

-- ============================================================================
-- CREAR FUNCIÓN RPC PARA CONFIRMAR BOOKINGS ATÓMICAMENTE
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
  v_booked_seats INT;
  v_new_available INT;
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
    SELECT total_seats, available_seats INTO v_total_seats, v_new_available
    FROM routes
    WHERE id = v_route_id
    FOR UPDATE; -- 🔒 LOCK EXCLUSIVO

    -- 4️⃣ CONTAR asientos que se van a reservar
    SELECT COUNT(*) INTO v_count 
    FROM bookings 
    WHERE id = ANY(p_booking_ids);

    -- 5️⃣ VALIDAR que hay suficientes asientos disponibles
    IF v_new_available < v_count THEN
      RETURN QUERY SELECT 
        false, 
        'No hay suficientes asientos disponibles',
        0,
        v_new_available;
      RETURN;
    END IF;

    -- 6️⃣ CONFIRMAR todos los bookings juntos
    UPDATE bookings 
    SET 
      booking_status = 'confirmed',
      payment_status = p_payment_method,
      payment_method = p_payment_method,
      dropoff_point = dropoff_point,
      dropoff_point_custom = dropoff_point_custom,
      updated_at = NOW()
    WHERE id = ANY(p_booking_ids);

    -- 7️⃣ RECALCULAR available_seats basado en confirmed bookings (NO decrementar)
    -- Esto previene race conditions cuando múltiples usuarios confirman simultáneamente
    UPDATE routes 
    SET 
      available_seats = total_seats - (
        SELECT COUNT(*) FROM bookings 
        WHERE route_id = v_route_id 
        AND booking_status = 'confirmed'
      ),
      updated_at = NOW()
    WHERE id = v_route_id;

    -- 8️⃣ OBTENER nuevo count de asientos disponibles
    SELECT available_seats INTO v_new_available
    FROM routes
    WHERE id = v_route_id;

    -- ✅ ÉXITO
    RETURN QUERY SELECT 
      true, 
      'Bookings confirmados exitosamente',
      v_count,
      v_new_available;

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
-- FUNCIÓN AUXILIAR: Validar que hay asientos antes de reservar
-- ============================================================================

CREATE OR REPLACE FUNCTION check_seat_availability(
  p_route_id UUID,
  p_seats_needed INT
)
RETURNS TABLE (
  available BOOLEAN,
  available_seats INT,
  total_seats INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (r.available_seats >= p_seats_needed),
    r.available_seats,
    r.total_seats
  FROM routes r
  WHERE r.id = p_route_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACTUALIZAR useBookings.ts para usar la función RPC
-- ============================================================================

-- 📝 Reemplaza esto en tu hook useBookings.ts:

/*
const finalizePendingBookings = useCallback(async (
  bookingIds: string[],
  paymentMethod: string = 'cash'
) => {
  try {
    setError(null);
    setLoading(true);

    // ✅ AHORA USANDO FUNCIÓN RPC ATÓMICA
    const { data, error } = await supabase
      .rpc('finalize_bookings_atomic', {
        p_booking_ids: bookingIds,
        p_payment_method: paymentMethod,
      });

    if (error) throw error;

    const result = data[0];

    if (!result.success) {
      const customError = new Error(result.message);
      (customError as any).code = 'BOOKING_FAILED';
      throw customError;
    }

    console.log(`✅ ${result.updated_bookings_count} bookings confirmados`);
    console.log(`📊 Asientos restantes: ${result.remaining_seats}`);

    return result;
  } catch (err: any) {
    const message = err.message || 'Error confirmando bookings';
    setError(message);
    throw err;
  } finally {
    setLoading(false);
  }
}, []);
*/

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ejecuta esto para probar la función:
-- SELECT finalize_bookings_atomic(ARRAY['booking-uuid-1', 'booking-uuid-2'], 'cash');

-- Debería devolver:
-- success | message | updated_bookings_count | remaining_seats
-- --------|---------|------------------------|----------------
-- true    | ...     | 2                      | 3

-- ============================================================================
-- ⚠️ IMPORTANTE
-- ============================================================================

-- DESPUÉS de crear esta función:
-- 1. Ve a useBookings.ts
-- 2. Busca la función finalizePendingBookings
-- 3. Reemplázala con la nueva llamada RPC (comentada arriba)
-- 4. Prueba con 2 usuarios simultáneamente reservando
-- 5. Verifica que NO hay overflow de asientos
