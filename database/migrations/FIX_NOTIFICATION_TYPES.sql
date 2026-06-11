-- ============================================================
-- FIX: Actualizar constraint de tipos de notificaciones
-- Permite todos los tipos de notificaciones que usa la app
-- ============================================================

-- Dropear el constraint anterior
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notification_type_check;

-- Agregar el nuevo constraint con todos los tipos permitidos
ALTER TABLE notifications
ADD CONSTRAINT notification_type_check CHECK (
  type IN (
    'booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending', 'message',
    'trip_published', 'offer_received', 'offer_accepted', 'trip_confirmed', 'trip_started', 'trip_rated'
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Constraint de notificaciones actualizado exitosamente';
  RAISE NOTICE '   Tipos permitidos:';
  RAISE NOTICE '   - booking, trip_update, driver_arrived, trip_completed, review_pending, message';
  RAISE NOTICE '   - trip_published, offer_received, offer_accepted, trip_confirmed, trip_started, trip_rated';
END;
$$;
