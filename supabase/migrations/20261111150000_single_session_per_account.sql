-- Punto 4 del plan de seguridad (ver memoria project_seguridad_cuenta_unica_dispositivo):
-- al iniciar sesión en un dispositivo nuevo, cerrar automáticamente las sesiones activas
-- en los demás dispositivos de esa cuenta, y avisar por notificación push al que quedó
-- fuera. Supabase Auth trae esto nativo ("Enforce single session per user"), pero requiere
-- plan Pro (el proyecto sigue en Free) y aun en Pro no es instantáneo -- solo se aplica
-- cuando el otro dispositivo intenta refrescar su token. Mientras tanto, esto se construye
-- a nivel de app: cierre inmediato si la otra app está abierta y conectada (vía Realtime),
-- más aviso push para cuando no lo esté.
--
-- user_sessions ya existe (tabla de "Seguridad > Historial") -- solo se le agregan las
-- dos columnas que hacían falta. Sin GRANT nuevo: authenticated ya tiene privilegio de
-- tabla completo aquí (confirmado con has_table_privilege), a diferencia de profiles.

ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS push_token text;
