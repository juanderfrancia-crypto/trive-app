-- Fase 2b (parte 1): núcleo de dinero.
-- Todo cobro ocurre en el servidor, en la misma transacción que la acción que cobra,
-- y queda registrado en wallet_transactions. El conductor no puede modificar su saldo
-- ni realizar acciones que cuestan dinero sin pasar por estas funciones.

-- ============================================================
-- 1. Saldo nunca negativo. NOT VALID evita fallar por datos antiguos y
--    aplica la regla a todas las escrituras nuevas.
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_balance_non_negative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0) NOT VALID;

-- ============================================================
-- 2. Requisitos para conducir. Una sola fuente de verdad, usada por todas
--    las funciones de conductor.
-- ============================================================
CREATE OR REPLACE FUNCTION public.puede_conducir(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user
      AND role = 'driver'
      AND driver_verified = true
  );
$$;

-- ============================================================
-- 3. Libro de movimientos. Montos negativos son cobros; positivos, abonos.
--    Solo lo llaman funciones SECURITY DEFINER.
--    Tipos y estados permitidos por la tabla (restricciones CHECK).
-- ============================================================
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'recharge', 'route_fee', 'airport_fee', 'airport_refund',
    'referral_bonus', 'referral_discount', 'admin_credit', 'admin_debit'
  ]::text[]));

CREATE OR REPLACE FUNCTION public.post_wallet_movement(
  p_user uuid,
  p_amount integer,
  p_type text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (p_user, p_amount, p_type, 'approved');
$$;

REVOKE EXECUTE ON FUNCTION public.post_wallet_movement(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. Publicar ruta: cobra $2.000 y crea la ruta en una sola transacción.
--    Si falla la inserción, el cobro se revierte.
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_route(p_route jsonb)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_route public.routes;
  c_fee constant integer := 2000;
BEGIN
  IF v_uid IS NULL OR NOT public.puede_conducir(v_uid) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada';
  END IF;

  UPDATE public.profiles
  SET balance = balance - c_fee
  WHERE id = v_uid
    AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $2.000 de saldo para publicar un viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'route_fee');

  INSERT INTO public.routes
  SELECT (jsonb_populate_record(NULL::public.routes,
           p_route || jsonb_build_object('driver_id', v_uid))).*
  RETURNING * INTO v_route;

  RETURN v_route;
END;
$$;

-- ============================================================
-- 5. Aceptar solicitud directamente al precio del pasajero: cobra $5.000
--    y acepta en una sola transacción. Antes el cliente cobraba y luego
--    aceptaba, y podía aceptar sin cobrar.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_request_direct(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c_fee constant integer := 5000;
BEGIN
  IF v_uid IS NULL OR NOT public.puede_conducir(v_uid) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada';
  END IF;

  PERFORM 1
  FROM public.airport_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta solicitud ya no está disponible';
  END IF;

  UPDATE public.profiles
  SET balance = balance - c_fee
  WHERE id = v_uid
    AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $5.000 de saldo para aceptar este viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'airport_fee');

  UPDATE public.airport_requests
  SET driver_id = v_uid,
      status = 'accepted',
      accepted_at = NOW()
  WHERE id = p_request_id;
END;
$$;

-- ============================================================
-- 6. Comisión por oferta aceptada: ahora también deja registro en el libro.
--    Mantiene el mismo contrato (retorna el id del pago).
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_negotiation_payment(
  v_offer_id uuid,
  v_amount integer DEFAULT 5000
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_driver_id uuid;
  v_request_id uuid;
BEGIN
  SELECT ao.driver_id, ao.request_id INTO v_driver_id, v_request_id
  FROM public.airport_offers ao
  WHERE ao.id = v_offer_id;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada';
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_amount
  WHERE id = v_driver_id
    AND balance >= v_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El conductor no tiene saldo suficiente para esta oferta';
  END IF;

  INSERT INTO public.negotiation_payments (
    request_id, driver_id, offer_id, amount, status, deducted_at, reason
  ) VALUES (
    v_request_id, v_driver_id, v_offer_id, v_amount, 'deducted', NOW(),
    'Comisión de negociación de viaje'
  )
  RETURNING id INTO v_payment_id;

  PERFORM public.post_wallet_movement(v_driver_id, -v_amount, 'airport_fee');

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 7. El conductor ya no puede escribir su saldo ni su verificación desde la API.
--    Lista blanca de columnas editables por el propio usuario.
-- ============================================================
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  name,
  email,
  phone,
  avatar_url,
  profile_photo_url,
  vehicle_photo_url,
  emergency_contact,
  notification_preferences,
  push_token,
  last_seen,
  preferred_municipality,
  referral_code,
  referred_by,
  role,
  is_driver,
  is_passenger,
  driver_active,
  updated_at
) ON public.profiles TO authenticated;

-- El rol solo puede ser conductor o pasajero desde la app.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role NOT IN ('driver', 'passenger') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ============================================================
-- 8. Las rutas ya no se insertan directo: solo con publish_route.
-- ============================================================
DROP POLICY IF EXISTS "Drivers can create routes" ON public.routes;
DROP POLICY IF EXISTS "Only verified drivers can create routes" ON public.routes;
