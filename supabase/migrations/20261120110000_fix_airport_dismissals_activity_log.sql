-- El botón "No me interesa" fallaba siempre con 42703 "record new has no field id":
-- log_airport_activity() (el trigger que alimenta la bitácora airport_activity_log
-- del back-office) asume que toda tabla airport_* tiene columna id, pero
-- airport_request_dismissals nunca la tuvo (solo driver_id + request_id). Nadie lo
-- había notado porque el botón de descartar estaba escondido (sin texto) hasta hoy
-- -- esta es la primera vez que alguien lo dispara de verdad en producción.
--
-- Se agrega id como las demás tablas airport_* (uuid, gen_random_uuid()) para que
-- el mismo trigger funcione igual aquí, en vez de quitarle el log a esta tabla.

ALTER TABLE public.airport_request_dismissals
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
