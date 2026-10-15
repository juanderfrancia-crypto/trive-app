-- ============================================================
-- Plantillas de gasto/ingreso recurrente (arriendo, salarios, etc.):
-- antes había que volver a escribir el mismo movimiento cada mes a
-- mano. Una plantilla solo guarda los datos; "usarla" sigue pasando
-- por create_finance_movement (no hay magia, cada uso queda como un
-- movimiento real con su propia fecha).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.finance_recurring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id),
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_finance_recurring_templates()
RETURNS TABLE (
  id uuid,
  account_id uuid,
  account_name text,
  category_id uuid,
  category_name text,
  kind text,
  amount numeric,
  description text
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
  SELECT t.id, t.account_id, a.name::text, t.category_id, c.name::text, t.kind, t.amount, t.description
  FROM public.finance_recurring_templates t
  JOIN public.finance_accounts a ON a.id = t.account_id
  JOIN public.finance_categories c ON c.id = t.category_id
  ORDER BY t.description, c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_recurring_templates() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.create_finance_recurring_template(
  p_account_id uuid,
  p_category_id uuid,
  p_kind text,
  p_amount numeric,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;
  IF length(trim(coalesce(p_description, ''))) < 2 THEN
    RAISE EXCEPTION 'Escribe un nombre para la plantilla';
  END IF;

  INSERT INTO public.finance_recurring_templates (account_id, category_id, kind, amount, description, created_by)
  VALUES (p_account_id, p_category_id, p_kind, p_amount, trim(p_description), auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_finance_recurring_template(uuid, uuid, text, numeric, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.delete_finance_recurring_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  DELETE FROM public.finance_recurring_templates WHERE id = p_template_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_finance_recurring_template(uuid) FROM PUBLIC, anon;
