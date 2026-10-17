-- ============================================================
-- Paginación real para las listas del back-office que pueden crecer
-- sin control con el uso diario del negocio (tickets, libro contable,
-- finanzas, disputas resueltas). Hallazgo de la auditoría UI/UX del
-- 2026-10-17: varias pantallas traían toda la tabla de una sola vez,
-- o el RPC limitaba pero el frontend nunca pedía la página siguiente.
-- ============================================================

-- Tickets de soporte: antes sin ningún límite. Ahora pagina de verdad.
CREATE OR REPLACE FUNCTION public.get_support_tickets(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
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
  ORDER BY t.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_support_tickets(text, integer, integer) FROM PUBLIC, anon;

-- Conteo liviano para los badges del sidebar/inicio — antes traían las filas
-- completas de tickets abiertos solo para leer .length.
CREATE OR REPLACE FUNCTION public.get_open_tickets_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('atencion_cliente')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.support_tickets WHERE status = 'open';
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_open_tickets_count() FROM PUBLIC, anon;

-- Libro contable: el límite ya existía, le falta el offset para poder pedir
-- la página siguiente en vez de quedarse siempre en las primeras 200 filas.
CREATE OR REPLACE FUNCTION public.get_wallet_ledger(
  p_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_name text,
  user_email text,
  amount integer,
  type text,
  status text,
  created_at timestamptz,
  route_origin text,
  route_destination text,
  note text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT w.id, p.name::text, p.email::text, w.amount, w.type, w.status, w.created_at,
         r.origin::text, r.destination::text,
         aa.details->>'note' AS note
  FROM public.wallet_transactions w
  JOIN public.profiles p ON p.id = w.user_id
  LEFT JOIN public.routes r ON r.id = w.route_id
  LEFT JOIN public.admin_actions aa
    ON aa.target_user_id = w.user_id
   AND aa.created_at = w.created_at
   AND aa.action IN ('balance_recharge', 'admin_debit')
  WHERE (p_type IS NULL OR w.type = p_type)
    AND (p_status IS NULL OR w.status = p_status)
    AND (p_query IS NULL OR p.name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%')
    AND (p_date_from IS NULL OR w.created_at >= p_date_from)
    AND (p_date_to IS NULL OR w.created_at < p_date_to)
  ORDER BY w.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 200), 500)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_ledger(text, text, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;

-- Finanzas: mismo arreglo, agrega el offset que faltaba.
CREATE OR REPLACE FUNCTION public.get_finance_movements(
  p_account_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_kind text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  account_id uuid,
  account_name text,
  category_id uuid,
  category_name text,
  kind text,
  amount numeric,
  description text,
  movement_date date,
  created_by_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT m.id, m.account_id, a.name::text, m.category_id, c.name::text, m.kind,
         m.amount, m.description, m.movement_date, p.name::text, m.created_at
  FROM public.finance_movements m
  JOIN public.finance_accounts a ON a.id = m.account_id
  JOIN public.finance_categories c ON c.id = m.category_id
  LEFT JOIN public.profiles p ON p.id = m.created_by
  WHERE (p_account_id IS NULL OR m.account_id = p_account_id)
    AND (p_category_id IS NULL OR m.category_id = p_category_id)
    AND (p_kind IS NULL OR m.kind = p_kind)
    AND (p_date_from IS NULL OR m.movement_date >= p_date_from)
    AND (p_date_to IS NULL OR m.movement_date <= p_date_to)
  ORDER BY m.movement_date DESC, m.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 200), 500)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_movements(uuid, uuid, text, date, date, integer, integer) FROM PUBLIC, anon;

-- Disputas resueltas: tenía un LIMIT 50 fijo, sin ningún parámetro.
CREATE OR REPLACE FUNCTION public.get_resolved_disputes(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
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
  LIMIT LEAST(COALESCE(p_limit, 50), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_resolved_disputes(integer, integer) FROM PUBLIC, anon;
