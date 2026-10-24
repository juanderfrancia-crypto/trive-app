-- Diagnóstico temporal: ningún tester de la prueba cerrada tiene push_token guardado
-- y el registro falla en silencio (catch vacío en getPushNotificationToken). Esta
-- columna guarda la razón real del último intento (éxito o el mensaje de error),
-- para poder ver qué está pasando sin tener un teléfono físico a la mano.
-- Se puede quitar una vez quede resuelto el bug real.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token_debug text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token_debug_at timestamptz;
