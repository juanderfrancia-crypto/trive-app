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
    EXISTS (
      SELECT 1 FROM airport_requests
      WHERE id = request_id
      AND passenger_id = auth.uid()
    )
  );

-- Conductor: ve sus propias ofertas
CREATE POLICY "driver_view_own_offers"
  ON airport_offers
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- Conductor: puede crear nuevas ofertas en solicitudes pending
CREATE POLICY "driver_create_offer"
  ON airport_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM airport_requests
      WHERE id = request_id
      AND status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1 FROM airport_offers
      WHERE request_id = airport_offers.request_id
      AND driver_id = auth.uid()
      AND status IN ('pending', 'accepted')
    )
  );

-- Conductor: puede actualizar su propia oferta a rechazada
CREATE POLICY "driver_reject_own_offer"
  ON airport_offers
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() AND status = 'pending')
  WITH CHECK (driver_id = auth.uid() AND status = 'rejected');

-- Pasajero: puede aceptar una oferta
CREATE POLICY "passenger_accept_offer"
  ON airport_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM airport_requests ar
      WHERE ar.id = request_id
      AND ar.passenger_id = auth.uid()
      AND ar.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM airport_requests ar
      WHERE ar.id = request_id
      AND ar.passenger_id = auth.uid()
      AND ar.status = 'pending'
    )
  );

-- 4. Función para actualizar airport_requests cuando se acepta una oferta
CREATE OR REPLACE FUNCTION accept_airport_offer(offer_id UUID)
RETURNS VOID AS $$
DECLARE
  req_id UUID;
  driver_id UUID;
  final_price INT;
BEGIN
  -- Obtener datos de la oferta
  SELECT request_id, airport_offers.driver_id, COALESCE(proposed_price, offered_price)
  INTO req_id, driver_id, final_price
  FROM airport_offers
  JOIN airport_requests ON airport_requests.id = airport_offers.request_id
  WHERE airport_offers.id = offer_id
  AND airport_offers.status = 'pending';

  IF req_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada o no está pendiente';
  END IF;

  -- Actualizar la solicitud
  UPDATE airport_requests
  SET 
    driver_id = driver_id,
    offered_price = final_price,
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = req_id;

  -- Marcar la oferta como aceptada
  UPDATE airport_offers
  SET status = 'accepted', responded_at = NOW()
  WHERE id = offer_id;

  -- Rechazar todas las otras ofertas de esa solicitud
  UPDATE airport_offers
  SET status = 'rejected', responded_at = NOW()
  WHERE request_id = req_id
  AND id != offer_id
  AND status = 'pending';
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
-- TRIGGER para garantizar solo una oferta pending por conductor
-- ============================================================
CREATE OR REPLACE FUNCTION check_single_offer_per_driver()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM airport_offers
      WHERE request_id = NEW.request_id
      AND driver_id = NEW.driver_id
      AND status = 'pending'
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya tienes una oferta pendiente para esta solicitud';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS airport_offers_single_per_driver ON airport_offers;
CREATE TRIGGER airport_offers_single_per_driver
  BEFORE INSERT OR UPDATE ON airport_offers
  FOR EACH ROW
  EXECUTE FUNCTION check_single_offer_per_driver();
