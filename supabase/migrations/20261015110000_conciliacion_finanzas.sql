-- ============================================================
-- Conciliación Libro Contable ↔ Finanzas: la comisión que se ve en
-- Libro Contable es saldo generado DENTRO de la app (wallet_transactions),
-- no necesariamente dinero que ya llegó al banco real de Trive. Sin esto,
-- nadie se entera si ese dinero nunca se registró como ingreso real en
-- Finanzas. No se modifica ninguna tabla existente — es una comparación
-- calculada entre los dos sistemas, de solo lectura.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_reconciliation_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_generated numeric;
  v_recorded numeric;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT COALESCE(SUM(-amount), 0) INTO v_generated
  FROM public.wallet_transactions
  WHERE type IN ('route_fee', 'airport_fee') AND status = 'approved';

  SELECT COALESCE(SUM(m.amount), 0) INTO v_recorded
  FROM public.finance_movements m
  JOIN public.finance_categories c ON c.id = m.category_id
  WHERE m.kind = 'income' AND c.name = 'Comisión de rutas';

  RETURN jsonb_build_object(
    'generated', v_generated,
    'recorded', v_recorded,
    'pending', v_generated - v_recorded
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_reconciliation_status() FROM PUBLIC, anon;
