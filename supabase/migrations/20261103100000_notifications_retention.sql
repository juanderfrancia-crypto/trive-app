-- Política de retención para notifications: en Trive casi todo se resuelve en
-- horas o días (una ruta sale, una reserva se confirma, una oferta se decide),
-- así que no hay razón para guardar notificaciones para siempre. Sin esto, la
-- tabla crece sin límite (confirmado: hay filas desde abril-2026 que nadie
-- borra nunca salvo que el propio usuario lo haga a mano).
--
-- Ventana: 30 días, leídas o no. A los 30 días cualquier viaje/reserva/oferta
-- referenciada ya quedó resuelta hace tiempo — no hay riesgo de borrar algo
-- que el usuario todavía necesite ver. El cliente ya trae como máximo las 100
-- más recientes por usuario (useNotifications.ts), así que esto no cambia la
-- experiencia normal, solo evita acumular historial muerto en el servidor.

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '30 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;

-- Cron diario (mismo patrón condicional ya usado por close-expired-routes y
-- dispatch-route-publish-digest). 9:10am para no coincidir con
-- check-document-expiry-daily (8:00am).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup-old-notifications');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '10 9 * * *',
      'select public.cleanup_old_notifications()'
    );
  END IF;
END $$;
