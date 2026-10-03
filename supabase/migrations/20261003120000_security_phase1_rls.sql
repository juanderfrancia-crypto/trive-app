-- Fase 1 de seguridad: cierre de tablas expuestas.
-- Cada usuario solo lee y modifica sus propias filas en estas tablas.
-- Idempotente: se puede volver a ejecutar sin error (DROP POLICY IF EXISTS).

-- ============================================================
-- notifications: el cliente inserta notificaciones para otros
-- usuarios (ver notificationInsert.ts), por eso INSERT queda abierto
-- a usuarios autenticados. Leer, marcar y borrar solo las propias.
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- user_sessions: sesiones y dispositivos, solo del propio usuario.
-- ============================================================
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_sessions_own ON public.user_sessions;
CREATE POLICY user_sessions_own ON public.user_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- travel_preferences: preferencias generales, solo del propio usuario.
-- ============================================================
ALTER TABLE public.travel_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_preferences_own ON public.travel_preferences;
CREATE POLICY travel_preferences_own ON public.travel_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- trip_preferences: preferencias por reserva. El pasajero escribe las
-- suyas; el conductor del viaje puede leer las de sus pasajeros.
-- ============================================================
ALTER TABLE public.trip_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_preferences_own ON public.trip_preferences;
CREATE POLICY trip_preferences_own ON public.trip_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS trip_preferences_driver_read ON public.trip_preferences;
CREATE POLICY trip_preferences_driver_read ON public.trip_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.routes r ON r.id = b.route_id
      WHERE b.id = trip_preferences.booking_id
        AND r.driver_id = auth.uid()
    )
  );

-- ============================================================
-- rating_snapshots: estadísticas agregadas por fecha, sin datos
-- personales. Solo lectura para usuarios autenticados; las escrituras
-- las hace el backend.
-- ============================================================
ALTER TABLE public.rating_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rating_snapshots_read ON public.rating_snapshots;
CREATE POLICY rating_snapshots_read ON public.rating_snapshots
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- earnings_transactions: quitar INSERT abierto a cualquier usuario.
-- El cliente no inserta ganancias (verificado en src/). Las escrituras
-- del backend usan rol de servicio o funciones SECURITY DEFINER.
-- ============================================================
DROP POLICY IF EXISTS "Backend can insert earnings transactions" ON public.earnings_transactions;
