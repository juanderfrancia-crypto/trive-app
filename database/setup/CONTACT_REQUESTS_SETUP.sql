-- Tabla para solicitudes de contacto entre pasajeros
-- Ejecutar en Supabase SQL Editor

-- Crear tabla contact_requests
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Aseguramos que no hay duplicados (una solicitud por par)
  UNIQUE(sender_id, receiver_id, route_id),
  
  -- Aseguramos que no un usuario no se envía solicitud a sí mismo
  CHECK (sender_id != receiver_id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_contact_requests_sender ON contact_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_receiver ON contact_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_route ON contact_requests(route_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_receiver_status ON contact_requests(receiver_id, status);

-- Habilitar RLS
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden leer sus propias solicitudes
CREATE POLICY "Users can read their own contact requests"
  ON contact_requests
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Los usuarios pueden crear solicitudes
CREATE POLICY "Users can create contact requests"
  ON contact_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Los usuarios pueden actualizar sus solicitudes recibidas
CREATE POLICY "Users can update received contact requests"
  ON contact_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Vista útil: Solicitudes pendientes por usuario
CREATE OR REPLACE VIEW pending_contact_requests AS
SELECT 
  cr.id,
  cr.sender_id,
  cr.receiver_id,
  cr.route_id,
  p_sender.name as sender_name,
  p_receiver.name as receiver_name,
  r.origin,
  r.destination,
  r.departure_time,
  cr.created_at
FROM contact_requests cr
JOIN profiles p_sender ON cr.sender_id = p_sender.id
JOIN profiles p_receiver ON cr.receiver_id = p_receiver.id
JOIN routes r ON cr.route_id = r.id
WHERE cr.status = 'pending';

-- Vista: Solicitudes aceptadas
CREATE OR REPLACE VIEW accepted_contacts AS
SELECT 
  cr.id,
  cr.sender_id,
  cr.receiver_id,
  MIN(cr.updated_at) as accepted_at
FROM contact_requests cr
WHERE cr.status = 'accepted'
GROUP BY cr.sender_id, cr.receiver_id, cr.id;
