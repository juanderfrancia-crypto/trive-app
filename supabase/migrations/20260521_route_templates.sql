-- Tabla de plantillas de rutas frecuentes del conductor
CREATE TABLE IF NOT EXISTS route_templates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  origin         text        NOT NULL,
  destination    text        NOT NULL,
  price_per_seat integer     NOT NULL,
  total_seats    integer     NOT NULL,
  vehicle_type   text        NOT NULL DEFAULT 'auto',
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE route_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_select_own_templates"
  ON route_templates FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "driver_insert_own_templates"
  ON route_templates FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "driver_update_own_templates"
  ON route_templates FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "driver_delete_own_templates"
  ON route_templates FOR DELETE
  USING (auth.uid() = driver_id);

CREATE INDEX IF NOT EXISTS idx_route_templates_driver
  ON route_templates (driver_id, created_at DESC);
