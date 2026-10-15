-- ============================================================
-- Libro contable: lectura filtrable de todos los movimientos de saldo
-- (wallet_transactions), no solo las recargas manuales que ya cubre
-- admin_credit_balance/Recargas. Cargo 'contabilidad'. Solo lectura:
-- no agrega ninguna forma nueva de escribir saldo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_wallet_ledger(
  p_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 200
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
  LIMIT LEAST(COALESCE(p_limit, 200), 500);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_ledger(text, text, text, timestamptz, timestamptz, integer) FROM PUBLIC, anon;

-- Totales sobre el mismo filtro, sin el límite de filas de arriba.
CREATE OR REPLACE FUNCTION public.get_wallet_ledger_totals(
  p_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (total_amount bigint, total_count bigint)
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
  SELECT COALESCE(SUM(w.amount), 0)::bigint, COUNT(*)::bigint
  FROM public.wallet_transactions w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE (p_type IS NULL OR w.type = p_type)
    AND (p_status IS NULL OR w.status = p_status)
    AND (p_query IS NULL OR p.name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%')
    AND (p_date_from IS NULL OR w.created_at >= p_date_from)
    AND (p_date_to IS NULL OR w.created_at < p_date_to);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_ledger_totals(text, text, text, timestamptz, timestamptz) FROM PUBLIC, anon;
