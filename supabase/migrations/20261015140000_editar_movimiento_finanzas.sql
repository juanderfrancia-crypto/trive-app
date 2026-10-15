-- ============================================================
-- Editar un movimiento de Finanzas: antes solo se podía borrar y
-- volver a crear. Queda registrado en la bitácora igual que crear o
-- borrar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_finance_movement(
  p_movement_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_amount numeric,
  p_description text,
  p_movement_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE id = p_account_id AND is_active) THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;

  SELECT kind INTO v_kind FROM public.finance_movements WHERE id = p_movement_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Movimiento no encontrado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_categories WHERE id = p_category_id AND kind = v_kind) THEN
    RAISE EXCEPTION 'La categoría no corresponde al tipo del movimiento';
  END IF;

  UPDATE public.finance_movements
  SET account_id = p_account_id,
      category_id = p_category_id,
      amount = p_amount,
      description = nullif(trim(p_description), ''),
      movement_date = p_movement_date
  WHERE id = p_movement_id;

  INSERT INTO public.admin_actions (admin_id, action, details)
  VALUES (auth.uid(), 'finance_movement_edited', jsonb_build_object('movement_id', p_movement_id));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_finance_movement(uuid, uuid, uuid, numeric, text, date) FROM PUBLIC, anon;
