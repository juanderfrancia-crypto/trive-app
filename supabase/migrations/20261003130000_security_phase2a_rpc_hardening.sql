-- Fase 2a de seguridad: endurecer funciones y privilegios críticos.
-- Cambios mínimos que no alteran el comportamiento de los flujos legítimos.

-- ============================================================
-- 1. Acreditar saldo: solo el backend (webhook de Wompi usa la clave de
--    servicio). Antes cualquier usuario autenticado podía llamarla con
--    cualquier user_id e importe.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, integer)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 2. Privilegio de administrador: la columna is_admin no puede cambiarla
--    el propio usuario desde la API. Solo lo hacen el panel de Supabase
--    (rol postgres) o el rol de servicio.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'No puedes cambiar tu privilegio de administrador';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_is_admin ON public.profiles;
CREATE TRIGGER trg_protect_is_admin
  BEFORE UPDATE OF is_admin ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_admin();

-- Helper que evita recursión de RLS al comprobar administrador.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ============================================================
-- 3. Verificar documentos: solo administradores.
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_document_admin(
  doc_id uuid,
  exp_date date DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE driver_documents
  SET status = 'verified',
      verified_at = NOW(),
      expiry_date = exp_date,
      updated_at = NOW()
  WHERE id = doc_id;

  RETURN true;
END;
$$;

-- ============================================================
-- 4. Aceptar oferta de aeropuerto: solo pueden hacerlo los dos
--    participantes de la solicitud (el pasajero o el conductor de la oferta).
--    Mismo comportamiento que antes para ellos.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_airport_offer(offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id      UUID;
  v_driver_id   UUID;
  v_final_price INT;
BEGIN
  SELECT ao.request_id, ao.driver_id, COALESCE(ao.proposed_price, ar.offered_price)
    INTO v_req_id, v_driver_id, v_final_price
  FROM airport_offers ao
  JOIN airport_requests ar ON ar.id = ao.request_id
  WHERE ao.id = offer_id
    AND ao.status = 'pending';

  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada o no está pendiente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM airport_requests ar
    WHERE ar.id = v_req_id
      AND auth.uid() IN (ar.passenger_id, v_driver_id)
  ) THEN
    RAISE EXCEPTION 'No autorizado para aceptar esta oferta';
  END IF;

  UPDATE airport_requests
  SET driver_id = v_driver_id,
      offered_price = v_final_price,
      status = 'accepted',
      accepted_at = NOW()
  WHERE id = v_req_id;

  UPDATE airport_offers
  SET status = 'accepted', responded_at = NOW()
  WHERE id = offer_id;

  -- Comisión de $5.000 (barrera anti-fraude)
  PERFORM create_negotiation_payment(offer_id, 5000);

  UPDATE airport_offers
  SET status = 'rejected', responded_at = NOW()
  WHERE request_id = v_req_id
    AND id <> offer_id
    AND status = 'pending';
END;
$$;
