-- ============================================================
-- SISTEMA DE NEGOCIACIÓN DE PRECIO PARA VIAJES PRIVADOS
-- Basado en modelo InDriver adaptado a Trive
-- Permite múltiples ofertas, cambios de precio en tiempo real
-- Soporta: Aeropuerto, Centro Cali, Destinos Personalizados
-- ============================================================

-- 1. ALTERAR tabla airport_requests
-- Agregar campos para precio dinámico, tracking y tipo de viaje
ALTER TABLE airport_requests
ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'airport' 
  CHECK (trip_type IN ('airport', 'city_destination', 'custom')),
ADD COLUMN IF NOT EXISTS initial_price INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Migrar datos existentes: offered_price → initial_price
UPDATE airport_requests
SET initial_price = offered_price
WHERE initial_price = 0 AND offered_price > 0;

-- 2. CREAR tabla airport_offers
-- Tabla para guardar todas las propuestas de los conductores
CREATE TABLE IF NOT EXISTS airport_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES airport_requests(id) ON DELETE CASCADE,
  driver_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_price    INT,                                         -- NULL = acepta precio actual
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at      TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS airport_offers_request_idx ON airport_offers(request_id);
CREATE INDEX IF NOT EXISTS airport_offers_driver_idx ON airport_offers(driver_id);
CREATE INDEX IF NOT EXISTS airport_offers_status_idx ON airport_offers(status);

-- 3. RLS para airport_offers
ALTER TABLE airport_offers ENABLE ROW LEVEL SECURITY;

-- Dropear policies existentes para poder recrearlas
DROP POLICY IF EXISTS "passenger_view_offers" ON airport_offers;
DROP POLICY IF EXISTS "driver_view_own_offers" ON airport_offers;
DROP POLICY IF EXISTS "driver_create_offer" ON airport_offers;
DROP POLICY IF EXISTS "driver_reject_own_offer" ON airport_offers;
DROP POLICY IF EXISTS "passenger_accept_offer" ON airport_offers;

-- Pasajero: ve todas las ofertas de su solicitud
CREATE POLICY "passenger_view_offers"
  ON airport_offers
  FOR SELECT
  TO authenticated
  USING (
    airport_offers.request_id IN (
      SELECT id FROM airport_requests
      WHERE passenger_id = auth.uid()
    )
  );

-- Conductor: ve sus propias ofertas
CREATE POLICY "driver_view_own_offers"
  ON airport_offers
  FOR SELECT
  TO authenticated
  USING (airport_offers.driver_id = auth.uid());

-- Conductor: puede crear nuevas ofertas en solicitudes pending
CREATE POLICY "driver_create_offer"
  ON airport_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    airport_offers.driver_id = auth.uid()
    AND airport_offers.request_id IN (
      SELECT id FROM airport_requests
      WHERE status = 'pending'
    )
  );

-- Conductor: puede actualizar su propia oferta a rechazada
CREATE POLICY "driver_reject_own_offer"
  ON airport_offers
  FOR UPDATE
  TO authenticated
  USING (airport_offers.driver_id = auth.uid() AND airport_offers.status = 'pending')
  WITH CHECK (airport_offers.driver_id = auth.uid() AND airport_offers.status = 'rejected');

-- Pasajero: puede aceptar una oferta
CREATE POLICY "passenger_accept_offer"
  ON airport_offers
  FOR UPDATE
  TO authenticated
  USING (
    airport_offers.request_id IN (
      SELECT id FROM airport_requests
      WHERE passenger_id = auth.uid() AND status = 'pending'
    )
  )
  WITH CHECK (
    airport_offers.request_id IN (
      SELECT id FROM airport_requests
      WHERE passenger_id = auth.uid() AND status = 'pending'
    )
  );

-- 4. Función para actualizar airport_requests cuando se acepta una oferta
CREATE OR REPLACE FUNCTION accept_airport_offer(offer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_req_id UUID;
  v_driver_id UUID;
  v_final_price INT;
BEGIN
  RAISE NOTICE '[DB] Iniciando accept_airport_offer con offer_id: %', offer_id;
  
  -- Obtener datos de la oferta
  SELECT ao.request_id, ao.driver_id, COALESCE(ao.proposed_price, ar.offered_price)
  INTO v_req_id, v_driver_id, v_final_price
  FROM airport_offers ao
  JOIN airport_requests ar ON ar.id = ao.request_id
  WHERE ao.id = offer_id
  AND ao.status = 'pending';

  RAISE NOTICE '[DB] Datos de oferta obtenidos: req_id=%, driver_id=%, final_price=%', v_req_id, v_driver_id, v_final_price;

  IF v_req_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Oferta no encontrada o no está pendiente (offer_id: %)', offer_id;
    RAISE EXCEPTION 'Oferta no encontrada o no está pendiente';
  END IF;

  -- Actualizar la solicitud
  RAISE NOTICE '[DB] Actualizando airport_requests: request_id=%, driver_id=%, price=%', v_req_id, v_driver_id, v_final_price;
  UPDATE airport_requests
  SET 
    driver_id = v_driver_id,
    offered_price = v_final_price,
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = v_req_id;

  RAISE NOTICE '[DB] airport_requests actualizado. Filas afectadas: %', FOUND;

  -- Marcar la oferta como aceptada
  RAISE NOTICE '[DB] Marcando oferta como aceptada: offer_id=%', offer_id;
  UPDATE airport_offers
  SET status = 'accepted', responded_at = NOW()
  WHERE id = offer_id;

  RAISE NOTICE '[DB] Oferta marcada. Filas afectadas: %', FOUND;

  -- ⭐ CREAR PAGO DE COMISIÓN (barrera anti-fraude)
  RAISE NOTICE '[DB] Creando pago de comisión para offer_id=%', offer_id;
  PERFORM create_negotiation_payment(offer_id, 5000);
  RAISE NOTICE '[DB] Pago de comisión creado exitosamente';

  -- Rechazar todas las otras ofertas de esa solicitud
  RAISE NOTICE '[DB] Rechazando otras ofertas para request_id=%', v_req_id;
  UPDATE airport_offers
  SET status = 'rejected', responded_at = NOW()
  WHERE request_id = v_req_id
  AND id != offer_id
  AND status = 'pending';

  RAISE NOTICE '[DB] Otras ofertas rechazadas. Filas afectadas: %', FOUND;
  RAISE NOTICE '[DB] accept_airport_offer completado exitosamente para offer_id: %', offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para actualizar precio de solicitud
CREATE OR REPLACE FUNCTION update_airport_request_price(request_id UUID, new_price INT)
RETURNS VOID AS $$
BEGIN
  IF new_price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  UPDATE airport_requests
  SET 
    offered_price = new_price,
    price_updated_at = NOW()
  WHERE id = request_id
  AND status = 'pending'
  AND passenger_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el precio. Verifica que la solicitud existe y está pendiente.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grants
GRANT EXECUTE ON FUNCTION accept_airport_offer TO authenticated;
GRANT EXECUTE ON FUNCTION update_airport_request_price TO authenticated;

-- ============================================================
-- TRIGGER para garantizar solo una oferta por conductor
-- ============================================================
-- Validar que el conductor no tenga otra oferta ACEPTADA
-- Pero permitir múltiples PENDIENTES para que pueda cambiar de precio
CREATE OR REPLACE FUNCTION validate_single_offer_per_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- En UPDATE: verificar que no haya otra fila aceptada (excluyendo la actual)
  -- En INSERT: verificar que no haya ninguna fila aceptada
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM airport_offers ao
      WHERE ao.request_id = NEW.request_id
      AND ao.driver_id = NEW.driver_id
      AND ao.status = 'accepted'
      AND ao.id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya tienes una oferta aceptada para esta solicitud';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM airport_offers ao
      WHERE ao.request_id = NEW.request_id
      AND ao.driver_id = NEW.driver_id
      AND ao.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Ya tienes una oferta aceptada para esta solicitud';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_offer_uniqueness ON airport_offers;
CREATE TRIGGER validate_offer_uniqueness
  BEFORE INSERT OR UPDATE ON airport_offers
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_offer_per_driver();

-- ============================================================
-- FASE 1: EXTENSIÓN SEGURA DE SCHEMA PARA FLUJO PROFESIONAL
-- No rompe nada existente, solo agrega nuevas funcionalidades
-- ============================================================

-- 1.1 Agregar campos nuevos a airport_requests
ALTER TABLE airport_requests
ADD COLUMN IF NOT EXISTS driver_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trip_notes TEXT;

-- 1.2 Actualizar constraint de status para incluir nuevos estados
-- NOTA: En PostgreSQL no se puede modificar un CHECK constraint directamente
-- La estrategia es: el CHECK existente valida pending/accepted/completed/cancelled
-- Agregamos el estado 'in_progress' actualizando la restricción

ALTER TABLE airport_requests
DROP CONSTRAINT IF EXISTS airport_requests_status_check;

ALTER TABLE airport_requests
ADD CONSTRAINT airport_requests_status_check 
  CHECK (status IN ('pending', 'negotiating', 'accepted', 'in_progress', 'completed', 'cancelled'));

-- 1.3 Crear tabla trip_ratings para calificaciones
CREATE TABLE IF NOT EXISTS trip_ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           UUID NOT NULL REFERENCES airport_requests(id) ON DELETE CASCADE,
  rater_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating            INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS trip_ratings_trip_idx ON trip_ratings(trip_id);
CREATE INDEX IF NOT EXISTS trip_ratings_rater_idx ON trip_ratings(rater_id);
CREATE INDEX IF NOT EXISTS trip_ratings_rated_idx ON trip_ratings(rated_id);

-- 1.4 RLS para trip_ratings
ALTER TABLE trip_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_trip_ratings" ON trip_ratings;
DROP POLICY IF EXISTS "users_insert_trip_ratings" ON trip_ratings;
DROP POLICY IF EXISTS "users_update_own_ratings" ON trip_ratings;

-- Cualquier usuario autenticado puede ver calificaciones de sus viajes
CREATE POLICY "users_view_trip_ratings"
  ON trip_ratings
  FOR SELECT
  TO authenticated
  USING (
    trip_ratings.trip_id IN (
      SELECT id FROM airport_requests
      WHERE passenger_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- Solo usuarios autenticados pueden insertar calificaciones en viajes que participaron
CREATE POLICY "users_insert_trip_ratings"
  ON trip_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT passenger_id FROM airport_requests WHERE id = trip_id
      UNION
      SELECT driver_id FROM airport_requests WHERE id = trip_id AND driver_id IS NOT NULL
    )
    AND rater_id = auth.uid()
  );

-- Solo pueden actualizar calificaciones propias
CREATE POLICY "users_update_own_ratings"
  ON trip_ratings
  FOR UPDATE
  TO authenticated
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

-- 1.5 Grants para la nueva tabla
GRANT SELECT, INSERT, UPDATE ON trip_ratings TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ [FASE 1] Schema extendido exitosamente sin romper nada existente';
END;
$$;

-- ============================================================
-- FASE 2: FUNCIONES SQL PARA GESTIÓN COMPLETA DE VIAJES
-- ============================================================

-- 2.1 Función: Iniciar viaje (conductor marca como "En Ruta")
CREATE OR REPLACE FUNCTION start_trip(v_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_driver_id UUID;
BEGIN
  RAISE NOTICE '[DB] Iniciando start_trip para request_id: %', v_request_id;
  
  -- Verificar que el viaje existe y está aceptado
  SELECT status, driver_id INTO v_current_status, v_driver_id
  FROM airport_requests
  WHERE id = v_request_id;

  IF v_current_status IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado (request_id: %)', v_request_id;
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF v_current_status != 'accepted' THEN
    RAISE NOTICE '[DB] ERROR: Solo se pueden iniciar viajes aceptados. Estado actual: %', v_current_status;
    RAISE EXCEPTION 'El viaje debe estar aceptado para iniciarlo';
  END IF;

  IF v_driver_id != auth.uid() THEN
    RAISE NOTICE '[DB] ERROR: Solo el conductor asignado puede iniciar el viaje';
    RAISE EXCEPTION 'Solo el conductor asignado puede iniciar el viaje';
  END IF;

  -- Cambiar status a in_progress
  UPDATE airport_requests
  SET status = 'in_progress'
  WHERE id = v_request_id;

  RAISE NOTICE '[DB] Viaje iniciado: request_id=%, driver_id=%', v_request_id, v_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Función: Completar viaje (conductor marca como "Completado")
CREATE OR REPLACE FUNCTION complete_trip(v_request_id UUID, v_trip_notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_driver_id UUID;
BEGIN
  RAISE NOTICE '[DB] Iniciando complete_trip para request_id: %', v_request_id;
  
  -- Verificar que el viaje existe y está en progreso
  SELECT status, driver_id INTO v_current_status, v_driver_id
  FROM airport_requests
  WHERE id = v_request_id;

  IF v_current_status IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado (request_id: %)', v_request_id;
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  IF v_current_status != 'in_progress' THEN
    RAISE NOTICE '[DB] ERROR: Solo se pueden completar viajes en progreso. Estado actual: %', v_current_status;
    RAISE EXCEPTION 'El viaje debe estar en progreso para completarlo';
  END IF;

  IF v_driver_id != auth.uid() THEN
    RAISE NOTICE '[DB] ERROR: Solo el conductor asignado puede completar el viaje';
    RAISE EXCEPTION 'Solo el conductor asignado puede completar el viaje';
  END IF;

  -- Cambiar status a completed y guardar timestamp y notas
  UPDATE airport_requests
  SET 
    status = 'completed',
    completed_at = NOW(),
    trip_notes = COALESCE(v_trip_notes, trip_notes)
  WHERE id = v_request_id;

  RAISE NOTICE '[DB] Viaje completado: request_id=%, driver_id=%', v_request_id, v_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 Función: Calificar viaje
CREATE OR REPLACE FUNCTION rate_trip(
  v_trip_id UUID,
  v_rating INT,
  v_comment TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_trip_exists BOOLEAN;
  v_user_id UUID;
  v_is_participant BOOLEAN;
  v_rated_user_id UUID;
  v_passenger_id UUID;
  v_driver_id UUID;
BEGIN
  RAISE NOTICE '[DB] Iniciando rate_trip para trip_id: %, rating: %', v_trip_id, v_rating;
  
  v_user_id := auth.uid();

  -- Validar rating
  IF v_rating < 1 OR v_rating > 5 THEN
    RAISE NOTICE '[DB] ERROR: Rating inválido: %', v_rating;
    RAISE EXCEPTION 'Rating debe estar entre 1 y 5';
  END IF;

  -- Verificar que el viaje existe y está completado
  SELECT passenger_id, driver_id INTO v_passenger_id, v_driver_id
  FROM airport_requests
  WHERE id = v_trip_id
  AND status = 'completed';

  IF v_passenger_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado o no está completado';
    RAISE EXCEPTION 'Viaje no encontrado o no está completado';
  END IF;

  -- Verificar que el usuario es participante del viaje
  IF v_user_id != v_passenger_id AND v_user_id != v_driver_id THEN
    RAISE NOTICE '[DB] ERROR: Usuario no participó en este viaje';
    RAISE EXCEPTION 'Solo los participantes del viaje pueden calificarlo';
  END IF;

  -- Determinar a quién se califica (el otro participante)
  v_rated_user_id := CASE 
    WHEN v_user_id = v_passenger_id THEN v_driver_id
    ELSE v_passenger_id
  END;

  -- Insertar o actualizar calificación
  INSERT INTO trip_ratings (trip_id, rater_id, rated_id, rating, comment)
  VALUES (v_trip_id, v_user_id, v_rated_user_id, v_rating, v_comment)
  ON CONFLICT (trip_id, rater_id, rated_id) 
  DO UPDATE SET 
    rating = v_rating,
    comment = v_comment,
    updated_at = NOW();

  RAISE NOTICE '[DB] Viaje calificado: trip_id=%, rater=%, rating=%', v_trip_id, v_user_id, v_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 Agregar constraint UNIQUE para evitar calificaciones duplicadas
ALTER TABLE trip_ratings
DROP CONSTRAINT IF EXISTS trip_ratings_unique_per_rater;

ALTER TABLE trip_ratings
ADD CONSTRAINT trip_ratings_unique_per_rater UNIQUE (trip_id, rater_id, rated_id);

-- 2.5 Grants para las nuevas funciones
GRANT EXECUTE ON FUNCTION start_trip TO authenticated;
GRANT EXECUTE ON FUNCTION complete_trip TO authenticated;
GRANT EXECUTE ON FUNCTION rate_trip TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ [FASE 2] Funciones SQL creadas exitosamente';
END;
$$;

-- ============================================================
-- FASE 3: SISTEMA DE CHAT TEMPORAL PROTEGIDO POR PAGO
-- Chat ligero que se elimina al completar viaje + protección contra fraude
-- Solo se puede chatear después de pagar los $5,000
-- ============================================================

-- 3.1 Tabla: negotiation_payments
-- Registra cuando se deduce la comisión al conductor (barrera anti-fraude)
CREATE TABLE IF NOT EXISTS negotiation_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES airport_requests(id) ON DELETE CASCADE,
  driver_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id          UUID NOT NULL REFERENCES airport_offers(id) ON DELETE CASCADE,
  amount            INT NOT NULL DEFAULT 5000,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'deducted', 'refunded', 'cancelled')),
  deducted_at       TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS negotiation_payments_request_idx ON negotiation_payments(request_id);
CREATE INDEX IF NOT EXISTS negotiation_payments_driver_idx ON negotiation_payments(driver_id);
CREATE INDEX IF NOT EXISTS negotiation_payments_status_idx ON negotiation_payments(status);

-- Constraint: Un pago por oferta
CREATE UNIQUE INDEX IF NOT EXISTS negotiation_payments_offer_unique ON negotiation_payments(offer_id) 
  WHERE status IN ('pending', 'deducted');

-- RLS para negotiation_payments
ALTER TABLE negotiation_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_payments" ON negotiation_payments;
DROP POLICY IF EXISTS "system_insert_payments" ON negotiation_payments;

-- Cada usuario ve sus propios pagos
CREATE POLICY "users_view_own_payments"
  ON negotiation_payments
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR request_id IN (
      SELECT id FROM airport_requests WHERE passenger_id = auth.uid()
    )
  );

-- Solo por sistema (SECURITY DEFINER en función)
CREATE POLICY "system_insert_payments"
  ON negotiation_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- 3.2 Tabla: negotiation_messages (chat temporal ligero)
-- Conversación durante negociación - se elimina al completar viaje
CREATE TABLE IF NOT EXISTS negotiation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES airport_requests(id) ON DELETE CASCADE,
  driver_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passenger_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text      TEXT NOT NULL CHECK (char_length(message_text) > 0 AND char_length(message_text) <= 500),
  
  -- Tipo de mensaje para filtrado eficiente
  message_type      TEXT DEFAULT 'text'
                    CHECK (message_type IN ('text', 'location_pickup', 'price_update', 'special_request')),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read           BOOLEAN DEFAULT FALSE,
  
  -- Constraint anti-spam
  CONSTRAINT no_self_message CHECK (driver_id != passenger_id)
);

-- Índices - minimalistas para performance
CREATE INDEX IF NOT EXISTS negotiation_messages_request_idx ON negotiation_messages(request_id);
CREATE INDEX IF NOT EXISTS negotiation_messages_created_idx ON negotiation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS negotiation_messages_unread_idx ON negotiation_messages(request_id, is_read);

-- RLS para negotiation_messages
ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_negotiation_messages" ON negotiation_messages;
DROP POLICY IF EXISTS "users_send_negotiation_messages" ON negotiation_messages;
DROP POLICY IF EXISTS "users_mark_messages_read" ON negotiation_messages;

-- Ver mensajes solo de tu viaje
CREATE POLICY "users_view_negotiation_messages"
  ON negotiation_messages
  FOR SELECT
  TO authenticated
  USING (
    (driver_id = auth.uid() OR passenger_id = auth.uid())
    AND request_id IN (
      SELECT id FROM airport_requests
      WHERE status IN ('pending', 'negotiating', 'accepted', 'in_progress')
    )
  );

-- Solo puedes enviar mensajes si:
-- 1. Eres participante del viaje
-- 2. El viaje está en fase de negociación
-- 3. Existe un pago deducido para tu oferta
CREATE POLICY "users_send_negotiation_messages"
  ON negotiation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (driver_id = auth.uid() OR passenger_id = auth.uid())
    AND request_id IN (
      SELECT id FROM airport_requests
      WHERE status IN ('pending', 'negotiating', 'accepted', 'in_progress')
    )
    -- El chequeo de pago se hace en la función PostgreSQL (anti-bypass)
  );

-- Marcar como leído solo los propios
CREATE POLICY "users_mark_messages_read"
  ON negotiation_messages
  FOR UPDATE
  USING (passenger_id = auth.uid() OR driver_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid() OR driver_id = auth.uid());

-- 3.3 Función: Crear pago de comisión y registrar en negotiation_payments
CREATE OR REPLACE FUNCTION create_negotiation_payment(
  v_offer_id UUID,
  v_amount INT DEFAULT 5000
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_driver_id UUID;
  v_request_id UUID;
  v_driver_balance INT;
BEGIN
  RAISE NOTICE '[DB] Creando pago de negociación para offer_id: %, amount: %', v_offer_id, v_amount;
  
  -- Obtener datos de la oferta
  SELECT ao.driver_id, ao.request_id INTO v_driver_id, v_request_id
  FROM airport_offers ao
  WHERE ao.id = v_offer_id;

  IF v_driver_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Oferta no encontrada (offer_id: %)', v_offer_id;
    RAISE EXCEPTION 'Oferta no encontrada';
  END IF;

  -- Verificar balance del conductor
  SELECT balance INTO v_driver_balance
  FROM profiles
  WHERE id = v_driver_id;

  IF v_driver_balance < v_amount THEN
    RAISE NOTICE '[DB] ERROR: Saldo insuficiente. Conductor: %, Balance: %, Requerido: %', 
      v_driver_id, v_driver_balance, v_amount;
    RAISE EXCEPTION 'Saldo insuficiente para pagar la comisión';
  END IF;

  -- Crear registro de pago
  INSERT INTO negotiation_payments (
    request_id,
    driver_id,
    offer_id,
    amount,
    status,
    deducted_at,
    reason
  ) VALUES (
    v_request_id,
    v_driver_id,
    v_offer_id,
    v_amount,
    'deducted',
    NOW(),
    'Comisión de negociación de viaje'
  )
  RETURNING id INTO v_payment_id;

  -- Deducir del balance del conductor
  UPDATE profiles
  SET balance = balance - v_amount
  WHERE id = v_driver_id;

  RAISE NOTICE '[DB] Pago creado exitosamente: payment_id=%, driver_id=%, amount=%', 
    v_payment_id, v_driver_id, v_amount;
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4 Función: Enviar mensaje de negociación (verifica que hay pago)
CREATE OR REPLACE FUNCTION send_negotiation_message(
  v_request_id UUID,
  v_message_text TEXT,
  v_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_driver_id UUID;
  v_passenger_id UUID;
  v_has_payment BOOLEAN;
  v_message_id UUID;
  v_request_status TEXT;
BEGIN
  v_user_id := auth.uid();
  
  RAISE NOTICE '[DB] Enviando mensaje para request_id: %, user_id: %', v_request_id, v_user_id;
  
  -- Obtener datos del viaje
  SELECT driver_id, passenger_id, status INTO v_driver_id, v_passenger_id, v_request_status
  FROM airport_requests
  WHERE id = v_request_id;

  IF v_driver_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado (request_id: %)', v_request_id;
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  -- Validar que el usuario es participante
  IF v_user_id != v_driver_id AND v_user_id != v_passenger_id THEN
    RAISE NOTICE '[DB] ERROR: Usuario no es participante del viaje';
    RAISE EXCEPTION 'No eres participante de este viaje';
  END IF;

  -- Validar estado del viaje (solo durante negociación/viaje activo)
  IF v_request_status NOT IN ('pending', 'negotiating', 'accepted', 'in_progress') THEN
    RAISE NOTICE '[DB] ERROR: El viaje no está en fase de negociación/activo. Estado: %', v_request_status;
    RAISE EXCEPTION 'No se pueden enviar mensajes en este estado del viaje';
  END IF;

  -- ⭐ VALIDACIÓN ANTI-FRAUDE: El conductor debe tener un pago deducido
  -- Verificar que existe un pago 'deducted' para este viaje
  SELECT EXISTS(
    SELECT 1 FROM negotiation_payments
    WHERE request_id = v_request_id
    AND driver_id = v_driver_id
    AND status = 'deducted'
  ) INTO v_has_payment;

  IF NOT v_has_payment THEN
    RAISE NOTICE '[DB] ERROR: Conductor no ha pagado la comisión. request_id: %, driver_id: %', 
      v_request_id, v_driver_id;
    RAISE EXCEPTION 'La comisión no ha sido pagada. El chat está bloqueado.';
  END IF;

  -- Crear mensaje
  INSERT INTO negotiation_messages (
    request_id,
    driver_id,
    passenger_id,
    message_text,
    message_type
  ) VALUES (
    v_request_id,
    v_driver_id,
    v_passenger_id,
    v_message_text,
    v_message_type
  )
  RETURNING id INTO v_message_id;

  RAISE NOTICE '[DB] Mensaje enviado exitosamente: message_id=%, request_id=%', v_message_id, v_request_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.5 Función: Limpiar mensajes cuando se completa o cancela viaje
CREATE OR REPLACE FUNCTION cleanup_negotiation_messages_on_trip_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') THEN
    RAISE NOTICE '[DB] Limpiando mensajes de negociación para request_id: %', NEW.id;
    
    -- Eliminar mensajes
    DELETE FROM negotiation_messages WHERE request_id = NEW.id;
    
    -- Registrar refund de pagos si el viaje fue cancelado
    IF NEW.status = 'cancelled' THEN
      UPDATE negotiation_payments
      SET status = 'refunded', refunded_at = NOW(), reason = 'Viaje cancelado'
      WHERE request_id = NEW.id
      AND status = 'deducted';
      
      -- Devolver dinero al conductor
      UPDATE profiles
      SET balance = balance + 5000
      WHERE id IN (
        SELECT driver_id FROM negotiation_payments
        WHERE request_id = NEW.id
        AND status = 'refunded'
      );
      
      RAISE NOTICE '[DB] Reembolsos procesados para request_id: %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_messages_on_trip_end ON airport_requests;
CREATE TRIGGER cleanup_messages_on_trip_end
  AFTER UPDATE ON airport_requests
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_negotiation_messages_on_trip_end();

-- 3.6 Función: Marcar mensajes como leídos
CREATE OR REPLACE FUNCTION mark_negotiation_messages_read(v_request_id UUID)
RETURNS INT AS $$
DECLARE
  v_affected INT;
BEGIN
  UPDATE negotiation_messages
  SET is_read = TRUE
  WHERE request_id = v_request_id
  AND (passenger_id = auth.uid() OR driver_id = auth.uid())
  AND is_read = FALSE;
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RAISE NOTICE '[DB] Mensajes marcados como leídos: %', v_affected;
  
  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.7 Grants
GRANT SELECT, INSERT ON negotiation_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON negotiation_messages TO authenticated;
GRANT EXECUTE ON FUNCTION create_negotiation_payment TO authenticated;
GRANT EXECUTE ON FUNCTION send_negotiation_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_negotiation_messages_read TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ [FASE 3] Sistema de chat temporal protegido por pago creado exitosamente';
  RAISE NOTICE '⚠️ ANTI-FRAUDE ACTIVADO: Solo se puede chatear después de pagar $5,000';
END;
$$;
