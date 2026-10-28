-- Auditoría de chat/llamada: el límite de 500 caracteres de un mensaje de viaje
-- solo existía en el cliente (src/services/trip_messages.ts). Se agrega también
-- en el servidor, NOT VALID para no escanear mensajes históricos (mismo patrón
-- ya usado con bookings_booking_status_check / bookings_payment_method_check).
ALTER TABLE public.trip_messages
  ADD CONSTRAINT trip_messages_message_length
  CHECK (char_length(message) <= 500) NOT VALID;
