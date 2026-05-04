-- BOOKING STATUS AUTO-UPDATE (SERVER-SIDE TRIGGER)
-- Script para ejecutar en Supabase SQL Editor
-- Automáticamente marca bookings como "completed" cuando la hora de salida pasó

-- 1. Crear función que actualiza bookings completados
CREATE OR REPLACE FUNCTION update_completed_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET booking_status = 'completed'
  WHERE booking_status = 'confirmed'
    AND route_id IN (
      SELECT id FROM routes
      WHERE departure_time < NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear extensión para cron jobs (si no existe)
-- Nota: Necesitas que pg_cron esté habilitado en tu proyecto Supabase
-- Ve a: Project Settings > Extensions > Busca "pg_cron" y actívalo
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Crear job cron que se ejecute cada 5 minutos
-- Este job actualizará automáticamente el estado de los bookings
SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/5 * * * *',  -- Cada 5 minutos
  'SELECT update_completed_bookings()'
);

-- 4. (OPCIONAL) Si prefieres que se ejecute cada 1 minuto:
-- SELECT cron.schedule(
--   'update_completed_bookings_job_frequent',
--   '* * * * *',  -- Cada 1 minuto
--   'SELECT update_completed_bookings()'
-- );

-- INSTRUCCIONES:
-- 1. Ve a tu dashboard de Supabase
-- 2. Abre SQL Editor
-- 3. Crea una nueva query
-- 4. Copia y pega este script
-- 5. Ejecuta (Run)
-- 6. Si ves error sobre pg_cron: ve a Project Settings > Extensions > busca "pg_cron" y actívalo
-- 7. Luego vuelve a ejecutar este script

-- VERIFICACIÓN:
-- Ejecuta esta query para ver los jobs cron activos:
-- SELECT * FROM cron.job;

-- Para VER qué bookings serían actualizados:
-- SELECT id, booking_status, route_id 
-- FROM bookings b
-- JOIN routes r ON b.route_id = r.id
-- WHERE b.booking_status = 'confirmed'
--   AND r.departure_time < NOW()
-- LIMIT 10;

-- Para DESACTIVAR el job si es necesario:
-- SELECT cron.unschedule('update_completed_bookings_job');
