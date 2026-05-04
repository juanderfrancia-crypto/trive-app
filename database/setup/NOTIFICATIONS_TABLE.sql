-- ============================================
-- TABLA: notifications
-- ============================================
-- Crear tabla de notificaciones para emitir alertas a usuarios
-- sobre cambios en sus viajes, reservas, mensajes, etc.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  -- Tipos: 'booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending', 'message'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  -- Datos adicionales: route_id, booking_id, other_user_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT notification_type_check CHECK (
    type IN ('booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending', 'message')
  )
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_is_read_idx ON notifications(user_id, is_read);

-- ============================================
-- HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política: Sistema puede insertar notificaciones (service role)
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- DATOS DE EJEMPLO (Testing)
-- ============================================
-- Insertar notificaciones de ejemplo para pruebas
-- Reemplaza los UUIDs con IDs reales de usuarios

-- Ejemplo 1: Confirmación de reserva
-- INSERT INTO notifications (user_id, type, title, message, data, is_read)
-- VALUES (
--   'uuid-de-usuario-aqui',
--   'booking',
--   '✅ Reserva confirmada',
--   'Tu reserva para Bogotá → Medellín está confirmada. Salida mañana a las 08:30',
--   jsonb_build_object(
--     'route_id', 'uuid-de-ruta',
--     'booking_id', 'uuid-de-booking',
--     'departure_time', '2026-04-05T08:30:00'
--   ),
--   false
-- );

-- Ejemplo 2: Actualización de viaje
-- INSERT INTO notifications (user_id, type, title, message, data, is_read)
-- VALUES (
--   'uuid-de-usuario-aqui',
--   'trip_update',
--   '🚗 En camino',
--   'El conductor está en camino. Llegará en aproximadamente 5 minutos',
--   jsonb_build_object(
--     'route_id', 'uuid-de-ruta',
--     'booking_id', 'uuid-de-booking'
--   ),
--   false
-- );

-- Ejemplo 3: Conductor llegó
-- INSERT INTO notifications (user_id, type, title, message, data, is_read)
-- VALUES (
--   'uuid-de-usuario-aqui',
--   'driver_arrived',
--   '📍 El conductor llegó',
--   'Tu conductor está aquí. Vehículo: Toyota Corolla, Placa: ABX-234',
--   jsonb_build_object(
--     'route_id', 'uuid-de-ruta',
--     'driver_id', 'uuid-del-conductor'
--   ),
--   false
-- );

-- Ejemplo 4: Viaje completado
-- INSERT INTO notifications (user_id, type, title, message, data, is_read)
-- VALUES (
--   'uuid-de-usuario-aqui',
--   'trip_completed',
--   '🎉 Viaje completado',
--   'Gracias por viajar con nosotros. Se ha debitado $54.000 de tu cuenta',
--   jsonb_build_object(
--     'route_id', 'uuid-de-ruta',
--     'total_paid', 54000
--   ),
--   false
-- );

-- Ejemplo 5: Pendiente revisar
-- INSERT INTO notifications (user_id, type, title, message, data, is_read)
-- VALUES (
--   'uuid-de-usuario-aqui',
--   'review_pending',
--   '⭐ Califica tu experiencia',
--   'Ayuda a otros usuarios compartiendo tu experiencia del viaje',
--   jsonb_build_object(
--     'booking_id', 'uuid-de-booking',
--     'driver_id', 'uuid-del-conductor'
--   ),
--   false
-- );

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todas las notificaciones de un usuario ordenadas por fecha
-- SELECT * FROM notifications 
-- WHERE user_id = 'uuid-usuario'
-- ORDER BY created_at DESC;

-- Ver solo notificaciones no leídas
-- SELECT * FROM notifications 
-- WHERE user_id = 'uuid-usuario' AND is_read = false
-- ORDER BY created_at DESC;

-- Contar notificaciones no leídas
-- SELECT COUNT(*) as unread_count FROM notifications 
-- WHERE user_id = 'uuid-usuario' AND is_read = false;

-- Marcar todas como leídas
-- UPDATE notifications 
-- SET is_read = true, updated_at = NOW()
-- WHERE user_id = 'uuid-usuario' AND is_read = false;

-- Eliminar notificaciones antiguas (más de 30 días)
-- DELETE FROM notifications 
-- WHERE user_id = 'uuid-usuario' 
-- AND created_at < NOW() - INTERVAL '30 days';
