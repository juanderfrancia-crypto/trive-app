-- push_token_debug y push_token_debug_at (agregadas el 23-oct para diagnosticar por qué
-- nadie tenía push_token guardado) nunca recibieron GRANT de UPDATE para 'authenticated'.
-- profiles usa permisos por columna (no un GRANT de tabla completa), así que todas las
-- escrituras a esas dos columnas fallaban por permiso, en silencio: el propio `catch`
-- que src/services/pushNotifications.ts usa para no tragarse errores, se comía ESTE error.
-- Confirmado el 2026-11-01: push_token_debug nunca tuvo ni una sola fila escrita, para
-- ningún usuario, desde que existe la columna.
GRANT UPDATE (push_token_debug, push_token_debug_at) ON public.profiles TO authenticated;
