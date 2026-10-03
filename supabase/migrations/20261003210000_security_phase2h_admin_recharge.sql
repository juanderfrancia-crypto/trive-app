-- Fase 2h: recarga manual de saldo por administrador.
-- Mientras no haya pasarela de pago, el conductor transfiere (Nequi, Daviplata) y un
-- administrador acredita el saldo. Cada recarga queda en el libro y en la bitácora.

-- Bitácora: admin_actions registraba solo acciones sobre documentos. Se amplía sin
-- romper lo existente: document_id pasa a opcional y se agregan usuario objetivo y detalle.
ALTER TABLE public.admin_actions ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE public.admin_actions ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.admin_actions ADD COLUMN IF NOT EXISTS details jsonb;

CREATE OR REPLACE FUNCTION public.admin_credit_balance(
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
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 5000000 THEN
    RAISE EXCEPTION 'El monto debe estar entre 1 y 5.000.000';
  END IF;

  IF p_note IS NULL OR length(trim(p_note)) < 3 THEN
    RAISE EXCEPTION 'Escribe una nota con el comprobante de la recarga';
  END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  PERFORM public.post_wallet_movement(p_user_id, p_amount, 'recharge');

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'balance_recharge', p_user_id,
          jsonb_build_object('amount', p_amount, 'note', trim(p_note)));

  PERFORM public.notify_user(
    p_user_id, 'trip_update', 'Recarga acreditada',
    'Tu saldo Trive se actualizó con $' || to_char(p_amount, 'FM999G999G999') || '.',
    '{}'::jsonb
  );

  RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_credit_balance(uuid, integer, text) FROM PUBLIC, anon;
