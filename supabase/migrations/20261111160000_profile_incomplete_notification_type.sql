-- Nuevo tipo de notificación para el centro de Alertas: avisarle al usuario que le falta
-- configurar algo opcional pero recomendado (correo de recuperación, contacto de emergencia,
-- municipio preferido). No es parte de los gates obligatorios (teléfono/cédula/dispositivo),
-- solo un recordatorio en Alertas que lleva a la pantalla donde se resuelve.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notification_type_check CHECK (type IN (
  'booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending', 'message',
  'trip_published', 'offer_received', 'offer_accepted', 'trip_confirmed', 'trip_started',
  'trip_rated', 'trip_confirm', 'review_received', 'profile_incomplete'
));
