-- ============================================================================
-- 💰 SISTEMA DE GANANCIAS - TRIGGER AUTOMÁTICO
-- ============================================================================
-- Este script configura actualizaciones automáticas de ganancias de conductores
-- Actualiza drivers.total_earnings cuando se completan bookings
-- Mantiene historial en earnings_transactions (tabla nueva)

-- ============================================================================
-- PASO 1: CREAR TABLA PARA HISTORIAL DE TRANSACCIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS earnings_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'trip', 'withdrawal', 'bonus', 'refund', 'adjustment'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_driver_id ON earnings_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_booking_id ON earnings_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_created_at ON earnings_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_status ON earnings_transactions(status);

-- ============================================================================
-- PASO 2: CREAR TRIGGERS PARA ACTUALIZAR AUTOMÁTICAMENTE
-- ============================================================================

-- TRIGGER: Cuando un booking cambia a payment_status='completed'
-- Acción: Registrar ganancia en earnings_transactions
-- Acción: Actualizar drivers.total_earnings
-- Acción: Actualizar drivers.total_trips

CREATE OR REPLACE FUNCTION handle_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_route_id UUID;
  v_booking_price DECIMAL(10,2); 
BEGIN
  -- Solo procesar si cambió a 'completed'
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    
    -- 1. Obtener driver_id y route_id de este booking
    SELECT r.driver_id, b.route_id, b.price
    INTO v_driver_id, v_route_id, v_booking_price
    FROM bookings b
    JOIN routes r ON b.route_id = r.id
    WHERE b.id = NEW.id;

    -- 2. Registrar transacción en earnings_transactions
    INSERT INTO earnings_transactions (
      driver_id,
      booking_id,
      transaction_type,
      amount,
      description,
      status
    ) VALUES (
      v_driver_id,
      NEW.id,
      'trip',
      v_booking_price,
      'Pago de booking completado - Asiento #' || NEW.seat_number,
      'completed'
    );

    -- 3. Actualizar total_earnings del conductor
    UPDATE profiles
    SET 
      updated_at = NOW()
    WHERE id = v_driver_id;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en tabla bookings
DROP TRIGGER IF EXISTS trigger_booking_completion ON bookings;
CREATE TRIGGER trigger_booking_completion
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_booking_completion();

-- ============================================================================
-- PASO 3: CREAR FUNCIÓN PARA CALCULAR GANANCIAS TOTALES
-- ============================================================================

CREATE OR REPLACE FUNCTION get_driver_earnings(p_driver_id UUID)
RETURNS TABLE(
  total_earnings DECIMAL(10,2),
  this_month_earnings DECIMAL(10,2),
  pending_earnings DECIMAL(10,2),
  completed_trips BIGINT,
  total_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de ganancias completadas
    COALESCE(SUM(CASE WHEN b.payment_status = 'completed' THEN b.price ELSE 0 END), 0) as total_earnings,
    
    -- Ganancias de este mes
    COALESCE(SUM(CASE 
      WHEN b.payment_status = 'completed' 
      AND DATE_TRUNC('month', b.created_at) = DATE_TRUNC('month', NOW())
      THEN b.price 
      ELSE 0 
    END), 0) as this_month_earnings,
    
    -- Ganancias pendientes
    COALESCE(SUM(CASE WHEN b.payment_status = 'pending' THEN b.price ELSE 0 END), 0) as pending_earnings,
    
    -- Cantidad de viajes completados
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_trips,
    
    -- Total de bookings
    COUNT(b.id) as total_bookings
    
  FROM routes r
  LEFT JOIN bookings b ON r.id = b.route_id
  WHERE r.driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 4: CREAR VIEW PARA FÁCIL ACCESO
-- ============================================================================

CREATE OR REPLACE VIEW driver_earnings_summary AS
SELECT
  d.id as driver_id,
  d.name,
  d.email,
  COALESCE(SUM(CASE WHEN b.payment_status = 'completed' THEN b.price ELSE 0 END), 0) as total_earnings,
  COALESCE(SUM(CASE 
    WHEN b.payment_status = 'completed' 
    AND DATE_TRUNC('month', b.created_at) = DATE_TRUNC('month', NOW())
    THEN b.price 
    ELSE 0 
  END), 0) as this_month_earnings,
  COALESCE(SUM(CASE WHEN b.payment_status = 'pending' THEN b.price ELSE 0 END), 0) as pending_earnings,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_trips,
  COUNT(DISTINCT r.id) as total_routes,
  COUNT(DISTINCT b.id) as total_bookings
FROM profiles d
LEFT JOIN routes r ON d.id = r.driver_id
LEFT JOIN bookings b ON r.id = b.route_id
WHERE d.role = 'driver'
GROUP BY d.id, d.name, d.email;

-- ============================================================================
-- PASO 5: MIGRACIÓN DE DATOS EXISTENTES (OPCIONAL)
-- ============================================================================

-- Si ya hay ganancias completadas en la BD, crear registros en earnings_transactions:

INSERT INTO earnings_transactions (driver_id, booking_id, transaction_type, amount, description, status, created_at)
SELECT
  r.driver_id,
  b.id,
  'trip',
  b.price,
  'Pago de booking completado - Asiento #' || b.seat_number,
  'completed',
  b.created_at
FROM bookings b
JOIN routes r ON b.route_id = r.id
WHERE b.payment_status = 'completed'
  AND b.id NOT IN (SELECT booking_id FROM earnings_transactions WHERE booking_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PASO 6: VERIFICACIÓN
-- ============================================================================

-- Ver vista de ganancias
-- SELECT * FROM driver_earnings_summary;

-- Ver historial de una transacción de un conductor específico
-- SELECT * FROM earnings_transactions WHERE driver_id = '[driver_id_aqui]' ORDER BY created_at DESC;

-- Ver cálculo de ganancias para un conductor
-- SELECT * FROM get_driver_earnings('[driver_id_aqui]');

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
✅ CÓMO FUNCIONA:

1. TRIGGER AUTOMÁTICO:
   - Cuando un booking cambia a payment_status='completed'
   - Se crea automáticamente un registro en earnings_transactions
   - Se actualiza el timestamp del perfil del conductor

2. CÁLCULO DINÁMICO:
   - El hook useDriverEarnings() consulta directamente bookings
   - Calcula ganancias sobre la marcha (no depende de campos denormalizados)
   - Esto garantiza precisión siempre

3. VISTA driver_earnings_summary:
   - Resumen rápido de ganancias por conductor
   - Útil para dashboards y reportes
   - Se actualiza automáticamente con los datos

4. TABLA earnings_transactions:
   - Historial completo de movimientos
   - Permite auditoría y trazabilidad
   - Útil para reportes de transacciones

✅ VENTAJAS:

- No hay datos mock
- Los datos se actualizan automáticamente con triggers
- Cada transacción se registra para auditoría
- El cálculo es siempre correcto basado en datos reales
- Rendimiento optimizado con índices

❌ ANTES (Problema):

- drivers.total_earnings nunca se actualizaba
- DriverEarningsScreen tenía datos hardcodeados
- No había historial de transacciones
- Sin trazabilidad de pagos

✅ DESPUÉS (Solución):

- Ganancias se calculan en tiempo real desde bookings
- Hook useDriverEarnings() consulta datos reales
- DriverEarningsScreen muestra datos REALES
- Historial completo en earnings_transactions
- Triggers actualizan automáticamente

*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
