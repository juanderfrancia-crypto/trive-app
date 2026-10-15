-- ============================================================
-- Débito manual de saldo: el CHECK de wallet_transactions ya permitía
-- el tipo 'admin_debit' pero ninguna función lo usaba — no había forma
-- de revertir una recarga mal hecha desde el back-office. Mismo cargo
-- y mismo patrón que admin_credit_balance.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_debit_balance(
  p_user_id uuid,
  p_amount integer,
  p_note text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 5000000 THEN
    RAISE EXCEPTION 'El monto debe estar entre 1 y 5.000.000';
  END IF;

  IF p_note IS NULL OR length(trim(p_note)) < 3 THEN
    RAISE EXCEPTION 'Escribe una nota explicando el motivo del débito';
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no tiene saldo suficiente para este débito';
  END IF;

  PERFORM public.post_wallet_movement(p_user_id, -p_amount, 'admin_debit');

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, reason, details)
  VALUES (auth.uid(), 'balance_debit', p_user_id, trim(p_note), jsonb_build_object('amount', p_amount));

  PERFORM public.notify_user(
    p_user_id, 'trip_update', 'Ajuste de saldo',
    'Tu saldo Trive se ajustó en -$' || to_char(p_amount, 'FM999G999G999') || '.',
    '{}'::jsonb
  );

  RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_debit_balance(uuid, integer, text) FROM PUBLIC, anon;
