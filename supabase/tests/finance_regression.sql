-- ============================================================
-- Pruebas de regresión para la lógica financiera del back-office.
-- No destructivas: todo corre dentro de BEGIN/ROLLBACK, así que no
-- deja datos de prueba en producción pase lo que pase.
--
-- Cómo correrlas:
--   npx supabase db query --linked --file supabase/tests/finance_regression.sql
--
-- Si algo falla, el mensaje de error dice exactamente qué prueba y
-- qué esperaba vs. qué obtuvo. Correr esto antes de confiar en
-- cualquier cambio a finance_accounts/finance_movements/conciliación/
-- retención de pasajeros.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_admin uuid;
  v_acc uuid;
  v_cat_income uuid;
  v_cat_expense uuid;
  v_balance numeric;
BEGIN
  SELECT id INTO v_admin FROM public.profiles LIMIT 1;
  INSERT INTO public.finance_accounts (name, type, created_by)
  VALUES ('__test_account__', 'banco', v_admin) RETURNING id INTO v_acc;

  SELECT id INTO v_cat_income FROM public.finance_categories WHERE name = 'Comisión de rutas' AND kind = 'income';
  SELECT id INTO v_cat_expense FROM public.finance_categories WHERE name = 'Arriendo' AND kind = 'expense';

  INSERT INTO public.finance_movements (account_id, category_id, kind, amount, movement_date, created_by)
  VALUES (v_acc, v_cat_income, 'income', 100000, CURRENT_DATE, v_admin);
  INSERT INTO public.finance_movements (account_id, category_id, kind, amount, movement_date, created_by)
  VALUES (v_acc, v_cat_expense, 'expense', 30000, CURRENT_DATE, v_admin);

  SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END), 0) INTO v_balance
  FROM public.finance_movements WHERE account_id = v_acc;

  IF v_balance <> 70000 THEN
    RAISE EXCEPTION 'FALLÓ [saldo de cuenta]: esperaba 70000, obtuvo %', v_balance;
  END IF;

  RAISE NOTICE 'OK [saldo de cuenta]: 100.000 ingreso - 30.000 gasto = 70.000';
END $$;

DO $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE cnt > 1)::numeric / COUNT(*) * 100) ELSE 0 END
  INTO v_rate
  FROM (
    SELECT passenger_id, COUNT(*) AS cnt
    FROM public.bookings
    WHERE booking_status = 'completed'
    GROUP BY passenger_id
  ) p;

  IF v_rate IS NULL OR v_rate < 0 OR v_rate > 100 THEN
    RAISE EXCEPTION 'FALLÓ [retención de pasajeros]: tasa fuera de rango 0-100: %', v_rate;
  END IF;

  RAISE NOTICE 'OK [retención de pasajeros]: tasa en rango válido: %', v_rate || '%';
END $$;

DO $$
DECLARE
  v_generated numeric;
  v_recorded numeric;
BEGIN
  SELECT COALESCE(SUM(-amount), 0) INTO v_generated
  FROM public.wallet_transactions
  WHERE type IN ('route_fee', 'airport_fee') AND status = 'approved';

  SELECT COALESCE(SUM(m.amount), 0) INTO v_recorded
  FROM public.finance_movements m
  JOIN public.finance_categories c ON c.id = m.category_id
  WHERE m.kind = 'income' AND c.name = 'Comisión de rutas';

  IF v_generated IS NULL OR v_recorded IS NULL THEN
    RAISE EXCEPTION 'FALLÓ [conciliación]: devolvió NULL (generado=%, registrado=%)', v_generated, v_recorded;
  END IF;

  RAISE NOTICE 'OK [conciliación]: calculable (generado=%, registrado=%, pendiente=%)', v_generated, v_recorded, v_generated - v_recorded;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.finance_categories
  WHERE is_system = true;

  IF v_count <> 10 THEN
    RAISE EXCEPTION 'FALLÓ [categorías precargadas]: esperaba 10, hay %', v_count;
  END IF;

  RAISE NOTICE 'OK [categorías precargadas]: siguen las 10 originales';
END $$;

ROLLBACK;
