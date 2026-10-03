-- ============================================================
-- VIAJES DE AEROPUERTO — Fase 1
-- El pasajero publica su necesidad, el conductor acepta.
-- Tabla completamente independiente, no modifica nada existente.
-- Para revertir: DROP TABLE airport_requests CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS airport_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id       UUID        REFERENCES profiles(id),
  origin          TEXT        NOT NULL,
  destination     TEXT        NOT NULL DEFAULT 'Aeropuerto',
  departure_time  TIMESTAMPTZ NOT NULL,
  passengers      INT         NOT NULL DEFAULT 1 CHECK (passengers BETWEEN 1 AND 8),
  offered_price   INT         NOT NULL CHECK (offered_price > 0),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','completed','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ
);

-- Índices para las consultas más frecuentes
CREATE INDEX IF NOT EXISTS airport_requests_passenger_idx  ON airport_requests (passenger_id);
CREATE INDEX IF NOT EXISTS airport_requests_driver_idx     ON airport_requests (driver_id);
CREATE INDEX IF NOT EXISTS airport_requests_status_idx     ON airport_requests (status);
CREATE INDEX IF NOT EXISTS airport_requests_departure_idx  ON airport_requests (departure_time);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE airport_requests ENABLE ROW LEVEL SECURITY;

-- Pasajero: ve y gestiona sus propias solicitudes
CREATE POLICY "passenger_own_requests"
  ON airport_requests
  FOR ALL
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- Conductor: ve todas las solicitudes pending (para el feed)
CREATE POLICY "driver_view_pending"
  ON airport_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'driver'
    )
  );

-- Conductor: puede actualizar (aceptar) solicitudes pending
CREATE POLICY "driver_accept_request"
  ON airport_requests
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'driver'
    )
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND status = 'accepted'
  );

-- Conductor: ve sus propias solicitudes aceptadas
CREATE POLICY "driver_own_accepted"
  ON airport_requests
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());
