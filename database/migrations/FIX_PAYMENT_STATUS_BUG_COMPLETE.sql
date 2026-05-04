-- FIX PAYMENT STATUS BUG: Migración completa de datos
-- ============================================================================
-- PROBLEMA: 107 bookings tienen payment_status='cash' en lugar de 'completed'
-- SOLUCIÓN: Corregir todos los estados y crear triggers correctos
-- ============================================================================

-- PASO 1: BACKUP de datos actuales (por seguridad)
-- CREATE TABLE bookings_backup_before_fix AS SELECT * FROM bookings;

-- ============================================================================
-- PASO 2: CORREGIR BOOKINGS CON payment_status='cash'
-- ============================================================================
-- Si la ruta está COMPLETED → payment_status debe ser 'completed'
UPDATE bookings b
SET 
  payment_status = 'completed',
  updated_at = NOW()
FROM routes r
WHERE b.route_id = r.id
  AND b.payment_status = 'cash'
  AND r.status = 'completed'
  AND b.booking_status = 'confirmed';

-- Si la ruta NO está completada → mantenemos 'pending' pero cambiamos a cash confirmado
UPDATE bookings b
SET 
  payment_status = 'pending',
  payment_method = 'cash',
  updated_at = NOW()
FROM routes r
WHERE b.route_id = r.id
  AND b.payment_status = 'cash'
  AND r.status != 'completed';

-- ============================================================================
-- PASO 3: CORREGIR BOOKINGS CON payment_status='pending' y payment_method='cash'
-- ============================================================================
UPDATE bookings b
SET 
  payment_status = 'completed',
  updated_at = NOW()
FROM routes r
WHERE b.route_id = r.id
  AND b.payment_status = 'pending'
  AND b.payment_method = 'cash'
  AND r.status = 'completed'
  AND b.booking_status = 'confirmed';

-- ============================================================================
-- PASO 4: CORREGIR BOOKINGS CON payment_status='expired'
-- ============================================================================
-- Opción A: Si la ruta está completada y es cash → marcar como completed
UPDATE bookings b
SET 
  payment_status = 'completed',
  payment_method = COALESCE(b.payment_method, 'cash'),
  updated_at = NOW()
FROM routes r
WHERE b.route_id = r.id
  AND b.payment_status = 'expired'
  AND r.status = 'completed'
  AND b.booking_status = 'confirmed';

-- Opción B: Si la ruta está completada pero payment_method es null → refund
UPDATE bookings b
SET 
  payment_status = 'refunded',
  booking_status = 'cancelled',
  updated_at = NOW()
FROM routes r
WHERE b.route_id = r.id
  AND b.payment_status = 'expired'
  AND b.payment_method IS NULL;

-- ============================================================================
-- PASO 5: CORREGIR payment_method='pending' (esto no debería existir)
-- ============================================================================
UPDATE bookings
SET 
  payment_method = 'cash',
  payment_status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM routes r 
      WHERE r.id = bookings.route_id 
      AND r.status = 'completed'
    ) THEN 'completed'
    ELSE 'pending'
  END,
  updated_at = NOW()
WHERE payment_method = 'pending';

-- ============================================================================
-- PASO 6: CORREGIR payment_method=null en bookings 'completed'
-- ============================================================================
UPDATE bookings
SET 
  payment_method = 'cash',
  updated_at = NOW()
WHERE payment_status = 'completed'
  AND (payment_method IS NULL OR payment_method = '');

-- ============================================================================
-- VERIFICACIÓN POST-FIX
-- ============================================================================
-- Ejecutar esto para confirmar que se arregló
SELECT 
  payment_status,
  payment_method,
  COUNT(*) as total,
  SUM(price) as total_amount
FROM bookings
GROUP BY payment_status, payment_method
ORDER BY total DESC;

-- Los estados VALIDOS ahora deben ser:
-- payment_status: 'pending', 'completed', 'refunded'
-- payment_method: 'cash', 'card', 'wallet'
-- NO debe haber: 'expired' en payment_status, 'pending' en payment_method

-- ============================================================================
-- VERIFICAR GANANCIAS TOTALES DESPUÉS
-- ============================================================================
SELECT 
  COUNT(DISTINCT driver_id) as total_drivers,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.payment_status = 'completed' THEN b.id END) as completed_bookings,
  SUM(CASE WHEN b.payment_status = 'completed' THEN b.price ELSE 0 END) as total_earnings,
  SUM(CASE WHEN b.payment_status = 'pending' THEN b.price ELSE 0 END) as pending_earnings,
  SUM(CASE WHEN b.payment_status = 'refunded' THEN b.price ELSE 0 END) as refunded_amount
FROM bookings b
JOIN routes r ON b.route_id = r.id;
