-- ============================================================
-- Badges en vivo en la sidebar del back-office (tickets abiertos,
-- disputas abiertas): Supabase Realtime respeta RLS, y hoy el equipo
-- no tiene ningún permiso de SELECT directo sobre estas tablas (todo
-- pasa por RPCs SECURITY DEFINER). Se agrega una política de lectura
-- adicional, acotada al cargo correspondiente — no reemplaza nada,
-- las políticas de RLS se combinan con OR.
-- ============================================================

DROP POLICY IF EXISTS staff_read_support_tickets ON public.support_tickets;
CREATE POLICY staff_read_support_tickets ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.has_staff_role('atencion_cliente'));

DROP POLICY IF EXISTS staff_read_bookings_disputes ON public.bookings;
CREATE POLICY staff_read_bookings_disputes ON public.bookings
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.has_staff_role('operaciones'));

-- bookings ya estaba en la publicación de realtime; support_tickets no.
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
