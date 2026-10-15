-- ============================================================
-- Finanzas de la empresa: caja, cuentas (banco/efectivo/ahorros),
-- movimientos (ingresos/gastos) y rentabilidad del negocio. Totalmente
-- independiente de wallet_transactions (eso es saldo interno de
-- usuarios, no necesariamente dinero real en el banco de Trive todavía).
-- Registro 100% manual. Cargo 'contabilidad' (o administrador general).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('banco', 'caja', 'ahorros', 'otra')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, kind)
);

CREATE TABLE IF NOT EXISTS public.finance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id),
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_movements_account ON public.finance_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_movements_date ON public.finance_movements(movement_date);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_movements ENABLE ROW LEVEL SECURITY;
-- Sin políticas: todo pasa por RPCs SECURITY DEFINER. Nadie tiene SELECT/INSERT directo.

INSERT INTO public.finance_categories (name, kind, is_system) VALUES
  ('Comisión de rutas', 'income', true),
  ('Aporte de socios', 'income', true),
  ('Otros ingresos', 'income', true),
  ('Arriendo', 'expense', true),
  ('Salarios', 'expense', true),
  ('Servicios', 'expense', true),
  ('Impuestos (apartado)', 'expense', true),
  ('Viáticos', 'expense', true),
  ('Infraestructura', 'expense', true),
  ('Otros gastos', 'expense', true)
ON CONFLICT (name, kind) DO NOTHING;

-- ============================================================
-- Cuentas
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_finance_accounts()
RETURNS TABLE (id uuid, name text, type text, balance numeric, created_at timestamptz)
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
  SELECT a.id, a.name::text, a.type::text,
         COALESCE((
           SELECT SUM(CASE WHEN m.kind = 'income' THEN m.amount ELSE -m.amount END)
           FROM public.finance_movements m
           WHERE m.account_id = a.id
         ), 0)::numeric,
         a.created_at
  FROM public.finance_accounts a
  WHERE a.is_active
  ORDER BY a.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_accounts() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.create_finance_account(p_name text, p_type text)
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

  IF length(trim(coalesce(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Escribe un nombre para la cuenta';
  END IF;
  IF p_type NOT IN ('banco', 'caja', 'ahorros', 'otra') THEN
    RAISE EXCEPTION 'Tipo de cuenta inválido';
  END IF;

  INSERT INTO public.finance_accounts (name, type, created_by)
  VALUES (trim(p_name), p_type, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_finance_account(text, text) FROM PUBLIC, anon;

-- ============================================================
-- Categorías
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_finance_categories()
RETURNS TABLE (id uuid, name text, kind text, is_system boolean)
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
  SELECT c.id, c.name::text, c.kind::text, c.is_system
  FROM public.finance_categories c
  ORDER BY c.kind, c.is_system DESC, c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_categories() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.create_finance_category(p_name text, p_kind text)
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

  IF length(trim(coalesce(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Escribe un nombre para la categoría';
  END IF;
  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Tipo de categoría inválido';
  END IF;

  INSERT INTO public.finance_categories (name, kind, is_system, created_by)
  VALUES (trim(p_name), p_kind, false, auth.uid())
  ON CONFLICT (name, kind) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_finance_category(text, text) FROM PUBLIC, anon;

-- ============================================================
-- Movimientos
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_finance_movement(
  p_account_id uuid,
  p_category_id uuid,
  p_kind text,
  p_amount numeric,
  p_description text,
  p_movement_date date
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
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE id = p_account_id AND is_active) THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_categories WHERE id = p_category_id AND kind = p_kind) THEN
    RAISE EXCEPTION 'La categoría no corresponde al tipo de movimiento';
  END IF;

  INSERT INTO public.finance_movements
    (account_id, category_id, kind, amount, description, movement_date, created_by)
  VALUES
    (p_account_id, p_category_id, p_kind, p_amount, nullif(trim(p_description), ''), p_movement_date, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.admin_actions (admin_id, action, reason, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_kind = 'income' THEN 'finance_income_added' ELSE 'finance_expense_added' END,
    p_description,
    jsonb_build_object('movement_id', v_id, 'account_id', p_account_id, 'category_id', p_category_id, 'amount', p_amount)
  );

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_finance_movement(uuid, uuid, text, numeric, text, date) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.delete_finance_movement(p_movement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  DELETE FROM public.finance_movements WHERE id = p_movement_id;

  INSERT INTO public.admin_actions (admin_id, action, details)
  VALUES (auth.uid(), 'finance_movement_deleted', jsonb_build_object('movement_id', p_movement_id));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_finance_movement(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_finance_movements(
  p_account_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_kind text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_limit integer DEFAULT 200
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
  LIMIT LEAST(COALESCE(p_limit, 200), 500);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_movements(uuid, uuid, text, date, date, integer) FROM PUBLIC, anon;

-- ============================================================
-- Resumen / rentabilidad del período
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_finance_summary(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_income numeric;
  v_expense numeric;
  v_total_balance numeric;
  v_by_category jsonb;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM public.finance_movements
  WHERE kind = 'income'
    AND (p_date_from IS NULL OR movement_date >= p_date_from)
    AND (p_date_to IS NULL OR movement_date <= p_date_to);

  SELECT COALESCE(SUM(amount), 0) INTO v_expense
  FROM public.finance_movements
  WHERE kind = 'expense'
    AND (p_date_from IS NULL OR movement_date >= p_date_from)
    AND (p_date_to IS NULL OR movement_date <= p_date_to);

  SELECT COALESCE(SUM(CASE WHEN m.kind = 'income' THEN m.amount ELSE -m.amount END), 0) INTO v_total_balance
  FROM public.finance_movements m
  JOIN public.finance_accounts a ON a.id = m.account_id AND a.is_active;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', sub.category, 'kind', sub.kind, 'total', sub.total) ORDER BY sub.total DESC), '[]'::jsonb)
  INTO v_by_category
  FROM (
    SELECT c.name::text AS category, m.kind, SUM(m.amount) AS total
    FROM public.finance_movements m
    JOIN public.finance_categories c ON c.id = m.category_id
    WHERE (p_date_from IS NULL OR m.movement_date >= p_date_from)
      AND (p_date_to IS NULL OR m.movement_date <= p_date_to)
    GROUP BY c.name, m.kind
  ) sub;

  RETURN jsonb_build_object(
    'income', v_income,
    'expense', v_expense,
    'net', v_income - v_expense,
    'total_balance', v_total_balance,
    'by_category', v_by_category
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_summary(date, date) FROM PUBLIC, anon;
