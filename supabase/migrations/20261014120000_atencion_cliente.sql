-- ============================================================
-- Atención al cliente: tickets de soporte y resolución de disputas.
-- Reemplaza el flujo de BugReportScreen (solo mailto, sin persistencia)
-- y agrega la primera forma de resolver reservas en 'disputed', que hoy
-- no tienen ningún camino de salida.
-- ============================================================

-- ============================================================
-- 1. Tickets de soporte. Cargo 'atencion_cliente'.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  category text NOT NULL CHECK (category IN ('crash', 'visual', 'network', 'performance', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  response text,
  device_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_owner_read ON public.support_tickets;
CREATE POLICY support_tickets_owner_read ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Cualquier usuario autenticado de la app crea su propio ticket.
CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_title text,
  p_category text,
  p_description text,
  p_device_info jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_category NOT IN ('crash', 'visual', 'network', 'performance', 'other') THEN
    RAISE EXCEPTION 'Categoría inválida';
  END IF;

  IF length(trim(coalesce(p_title, ''))) = 0 OR length(trim(coalesce(p_description, ''))) = 0 THEN
    RAISE EXCEPTION 'Título y descripción son obligatorios';
  END IF;

  INSERT INTO public.support_tickets (user_id, title, category, description, device_info)
  VALUES (auth.uid(), trim(p_title), p_category, trim(p_description), p_device_info)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, jsonb) FROM PUBLIC, anon;

-- Lectura para el back-office: cargo 'atencion_cliente' (o admin general).
CREATE OR REPLACE FUNCTION public.get_support_tickets(p_status text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  description text,
  status text,
  response text,
  device_info jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  user_name text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('atencion_cliente')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT t.id, t.title, t.category, t.description, t.status, t.response, t.device_info,
         t.created_at, t.updated_at, p.name::text, p.email::text
  FROM public.support_tickets t
  JOIN public.profiles p ON p.id = t.user_id
  WHERE p_status IS NULL OR t.status = p_status
  ORDER BY t.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_support_tickets(text) FROM PUBLIC, anon;

-- Actualización (estado + respuesta) desde el back-office. Deja rastro en admin_actions.
CREATE OR REPLACE FUNCTION public.update_support_ticket(
  p_ticket_id uuid,
  p_status text,
  p_response text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('atencion_cliente')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_status NOT IN ('open', 'in_progress', 'closed') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT user_id INTO v_user_id FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  UPDATE public.support_tickets
  SET status = p_status,
      response = COALESCE(p_response, response),
      updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, reason, details)
  VALUES (
    auth.uid(),
    'ticket_' || p_status,
    v_user_id,
    p_response,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_support_ticket(uuid, text, text) FROM PUBLIC, anon;

-- ============================================================
-- 2. Disputas de reserva. Cargo 'operaciones'.
-- Una reserva queda en 'disputed' cuando el pasajero reporta, al confirmar
-- el viaje, que no llegó bien (passenger_confirm_trip). Hoy no existe
-- ningún camino para sacarla de ese estado.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_disputed_bookings()
RETURNS TABLE (
  booking_id uuid,
  route_origin text,
  route_destination text,
  departure_time timestamptz,
  passenger_name text,
  driver_name text,
  price_per_seat numeric,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT b.id, r.origin::text, r.destination::text, r.departure_time::timestamptz,
         p.name::text, d.name::text, r.price_per_seat, b.updated_at::timestamptz
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  JOIN public.profiles p ON p.id = b.passenger_id
  JOIN public.profiles d ON d.id = r.driver_id
  WHERE b.booking_status = 'disputed'
  ORDER BY b.updated_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_disputed_bookings() FROM PUBLIC, anon;

-- Historial de disputas ya resueltas (o anotadas), leído desde la propia bitácora.
CREATE OR REPLACE FUNCTION public.get_resolved_disputes()
RETURNS TABLE (
  booking_id uuid,
  route_origin text,
  route_destination text,
  departure_time timestamptz,
  passenger_name text,
  driver_name text,
  price_per_seat numeric,
  resolution text,
  note text,
  resolved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT b.id, r.origin::text, r.destination::text, r.departure_time::timestamptz,
         p.name::text, d.name::text, r.price_per_seat,
         aa.action::text, aa.reason, aa.created_at::timestamptz
  FROM public.admin_actions aa
  JOIN public.bookings b ON b.id = (aa.details->>'booking_id')::uuid
  JOIN public.routes r ON r.id = b.route_id
  JOIN public.profiles p ON p.id = b.passenger_id
  JOIN public.profiles d ON d.id = r.driver_id
  WHERE aa.action IN ('dispute_complete', 'dispute_cancel')
  ORDER BY aa.created_at DESC
  LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_resolved_disputes() FROM PUBLIC, anon;

-- Resuelve una disputa. 'complete' paga al conductor reutilizando
-- complete_booking_internal (ya acepta 'disputed' como estado de entrada).
-- 'cancel' cierra la reserva sin pago, igual que cancel_booking del pasajero
-- (no mueve saldo: el cobro del cupo nunca se descontó por adelantado).
-- 'note' solo deja constancia en la bitácora, sin tocar el estado.
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_booking_id uuid,
  p_resolution text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_passenger_id uuid;
  v_driver_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_resolution NOT IN ('complete', 'cancel', 'note') THEN
    RAISE EXCEPTION 'Resolución inválida';
  END IF;

  SELECT b.booking_status, b.passenger_id, r.driver_id
    INTO v_status, v_passenger_id, v_driver_id
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;

  IF v_status <> 'disputed' THEN
    RAISE EXCEPTION 'Esta reserva no está en disputa';
  END IF;

  IF p_resolution = 'complete' THEN
    PERFORM public.complete_booking_internal(p_booking_id);
  ELSIF p_resolution = 'cancel' THEN
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = COALESCE(p_note, 'Disputa resuelta: el conductor no recibe el pago de este cupo'),
        updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, reason, details)
  VALUES (
    auth.uid(),
    'dispute_' || p_resolution,
    v_passenger_id,
    p_note,
    jsonb_build_object('booking_id', p_booking_id, 'driver_id', v_driver_id)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) FROM PUBLIC, anon;
