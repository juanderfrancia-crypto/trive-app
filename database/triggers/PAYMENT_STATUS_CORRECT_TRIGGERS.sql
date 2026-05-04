-- TRIGGERS CORRECTOS para Payment Status
-- ============================================================================
-- DESPUÉS DE EJECUTAR: FIX_PAYMENT_STATUS_BUG_COMPLETE.sql
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: Al confirmar un booking, payment_status debe ser 'pending'
-- NO debe asumir 'cash' o 'card' como payment_status
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_booking_confirm_correct_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando booking_status cambia a 'confirmed':
  -- payment_status debe ser 'pending' (esperando confirmación del conductor o pago)
  -- payment_method debe ser 'cash', 'card', 'wallet' (método de PAGO, no estado)
  
  IF NEW.booking_status = 'confirmed' AND OLD.booking_status != 'confirmed' THEN
    -- Validar que payment_method es un valor válido
    IF NEW.payment_method NOT IN ('cash', 'card', 'wallet') THEN
      NEW.payment_method := 'cash'; -- Default a cash si no se especifica
    END IF;
    
    -- payment_status debe ser 'pending' hasta que:
    -- - Si cash: hasta que el conductor confirme el viaje completado
    -- - Si card: hasta que Wompi procese el pago
    NEW.payment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_confirm_correct_payment_status ON bookings;
CREATE TRIGGER trg_booking_confirm_correct_payment_status
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_booking_confirm_correct_payment_status();

-- ============================================================================
-- TRIGGER 2: Cuando una RUTA se completa y payment_method='cash'
-- Entonces payment_status DEBE cambiar a 'completed'
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_route_completion_mark_cash_payments_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando ruta cambia a 'completed', todos los bookings confirmados en CASH
  -- deben marcar payment_status = 'completed' (dinero entregado físicamente)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE bookings
    SET 
      payment_status = 'completed',
      updated_at = NOW()
    WHERE 
      route_id = NEW.id
      AND booking_status = 'confirmed'
      AND payment_method = 'cash'
      AND payment_status IN ('pending', 'expired'); -- Cambiar solo si estaba pending o expired
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_completion_mark_cash_payments_completed ON routes;
CREATE TRIGGER trg_route_completion_mark_cash_payments_completed
AFTER UPDATE ON routes
FOR EACH ROW
EXECUTE FUNCTION trg_route_completion_mark_cash_payments_completed();

-- ============================================================================
-- TRIGGER 3: Validación: payment_status y payment_method deben ser válidos
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_validate_payment_status_and_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar payment_status
  IF NEW.payment_status NOT IN ('pending', 'completed', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %. Must be: pending, completed, or refunded', NEW.payment_status;
  END IF;
  
  -- Validar payment_method (si está definido)
  IF NEW.payment_method IS NOT NULL 
     AND NEW.payment_method NOT IN ('cash', 'card', 'wallet') THEN
    RAISE EXCEPTION 'Invalid payment_method: %. Must be: cash, card, or wallet', NEW.payment_method;
  END IF;
  
  -- Si está 'completed', debe tener un payment_method definido
  IF NEW.payment_status = 'completed' AND NEW.payment_method IS NULL THEN
    NEW.payment_method := 'cash'; -- Asumir cash si no está definido
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_payment_status_and_method ON bookings;
CREATE TRIGGER trg_validate_payment_status_and_method
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_validate_payment_status_and_method();

-- ============================================================================
-- TRIGGER 4: Logging - Rastrear cambios en payment status
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_status_changelog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_payment_status VARCHAR(50),
  new_payment_status VARCHAR(50),
  old_payment_method VARCHAR(50),
  new_payment_method VARCHAR(50),
  changed_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_log_payment_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status != OLD.payment_status OR NEW.payment_method != OLD.payment_method THEN
    INSERT INTO payment_status_changelog (
      booking_id,
      old_payment_status,
      new_payment_status,
      old_payment_method,
      new_payment_method,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.payment_status,
      NEW.payment_status,
      OLD.payment_method,
      NEW.payment_method,
      current_user,
      'Automatic trigger update'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_payment_status_changes ON bookings;
CREATE TRIGGER trg_log_payment_status_changes
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_log_payment_status_changes();

-- ============================================================================
-- DOCUMENTO: Flujos de Pago Correctos
-- ============================================================================
/*

FLUJO 1: PAGO EN EFECTIVO (Cash)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
booking_status          payment_status          payment_method
─────────────────────────────────────────────────────────────
pending                 pending                 null
  ↓
confirmed (conductor acepta) → pending           cash
  ↓
[Viaje inicia]
  ↓
[Viaje completa] → route.status = 'completed'
  ↓
✅ completed           completed               cash
💰 Dinero en mano del conductor

FLUJO 2: PAGO POR TRANSFERENCIA/CARD (Wompi)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
booking_status          payment_status          payment_method
─────────────────────────────────────────────────────────────
pending                 pending                 null
  ↓
confirmed → pending                 card
  ↓
[Viaje completa]
  ↓
[Wompi procesa] → pending                 card (esperando respuesta)
  ↓
✅ completed           completed               card
💰 Dinero en cuenta del conductor

FLUJO 3: CANCELACIÓN/RECHAZO
━━━━━━━━━━━━━━━━━━━━━━━
booking_status          payment_status          payment_method
─────────────────────────────────────────────────────────────
confirmed → cancelled    refunded               cash/card
💔 Devolución a pasajero

*/

-- ============================================================================
-- ÍNDICES para mejor performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status_method ON bookings(payment_status, payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_changelog_booking ON payment_status_changelog(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_changelog_created ON payment_status_changelog(created_at);
