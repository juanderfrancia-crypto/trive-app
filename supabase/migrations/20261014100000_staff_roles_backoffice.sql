-- Back-office (ver docs/BACKOFFICE.md): cargos de empleados, en vez de un solo
-- booleano (profiles.is_admin). No se quita is_admin_user() todavía —la app
-- móvil lo sigue usando mientras existe su pantalla de administración— pero
-- las funciones de abajo ahora aceptan CUALQUIERA de los dos caminos.
--
-- De paso corrige dos huecos reales en la bitácora de auditoría:
--   1. La aprobación/rechazo de documentos solo quedaba en admin_actions si el
--      CLIENTE la escribía (insert sin esperar respuesta, nada lo garantizaba).
--      Ahora queda adentro de la función del servidor.
--   2. La aprobación/rechazo de vehículos no dejaba ningún rastro. Ahora sí.

-- ============================================================
-- 1. Cargos de empleados.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_roles (
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'verificacion', 'contabilidad', 'atencion_cliente',
    'operaciones', 'analitica', 'administrador_general'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, role)
);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff ve sus propios cargos" ON public.staff_roles;
CREATE POLICY "staff ve sus propios cargos"
  ON public.staff_roles
  FOR SELECT
  USING (auth.uid() = employee_id);

CREATE OR REPLACE FUNCTION public.has_staff_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE employee_id = auth.uid() AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_roles WHERE employee_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.has_staff_role(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;

-- ============================================================
-- 2. Documentos: cargo 'verificacion', y ya queda la bitácora en el servidor.
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
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.driver_documents WHERE id = doc_id;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF v_driver_id = auth.uid() THEN
    RAISE EXCEPTION 'Un administrador no puede verificar sus propios documentos';
  END IF;

  UPDATE public.driver_documents
  SET status = 'verified',
      verified_at = NOW(),
      expiry_date = exp_date,
      updated_at = NOW()
  WHERE id = doc_id;

  INSERT INTO public.admin_actions (admin_id, action, document_id, target_user_id)
  VALUES (auth.uid(), 'approved', doc_id, v_driver_id);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_document_admin(doc_id uuid, reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.driver_documents WHERE id = doc_id;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF v_driver_id = auth.uid() THEN
    RAISE EXCEPTION 'Un administrador no puede verificar sus propios documentos';
  END IF;

  UPDATE public.driver_documents
  SET status = 'rejected',
      rejection_reason = reason,
      updated_at = NOW()
  WHERE id = doc_id;

  INSERT INTO public.admin_actions (admin_id, action, document_id, target_user_id, reason)
  VALUES (auth.uid(), 'rejected', doc_id, v_driver_id, reason);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_documents_for_admin()
RETURNS TABLE(
  id uuid, driver_id uuid, document_type text, file_path text, file_name text,
  file_size bigint, file_type text, status text, rejection_reason text, expiry_date date,
  created_at timestamp with time zone, uploaded_at timestamp with time zone,
  verified_at timestamp with time zone, updated_at timestamp with time zone, driver_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    dd.id, dd.driver_id, dd.document_type::text, dd.file_path::text, dd.file_name::text,
    dd.file_size::bigint, dd.file_type::text, dd.status::text, dd.rejection_reason::text, dd.expiry_date,
    dd.created_at::timestamptz, dd.uploaded_at::timestamptz,
    dd.verified_at::timestamptz, dd.updated_at::timestamptz, p.name::text
  FROM public.driver_documents dd
  JOIN public.profiles p ON dd.driver_id = p.id
  WHERE dd.status IN ('pending', 'verifying', 'rejected')
  ORDER BY
    CASE dd.status WHEN 'pending' THEN 1 WHEN 'verifying' THEN 2 ELSE 3 END,
    COALESCE(dd.uploaded_at, dd.created_at) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_processed_documents_for_admin()
RETURNS TABLE(
  id uuid, driver_id uuid, driver_name text, document_type text, file_path text,
  file_name text, file_size bigint, file_type text, status text, rejection_reason text,
  expiry_date date, uploaded_at timestamp with time zone, verified_at timestamp with time zone,
  updated_at timestamp with time zone, created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    dd.id, dd.driver_id, COALESCE(p.name, p.email, 'Desconocido')::text, dd.document_type::text,
    dd.file_path::text, dd.file_name::text, dd.file_size::bigint, dd.file_type::text,
    dd.status::text, dd.rejection_reason::text, dd.expiry_date,
    dd.uploaded_at::timestamptz, dd.verified_at::timestamptz, dd.updated_at::timestamptz, dd.created_at::timestamptz
  FROM public.driver_documents dd
  JOIN public.profiles p ON p.id = dd.driver_id
  WHERE dd.status IN ('verified', 'rejected', 'expired')
  ORDER BY COALESCE(dd.verified_at, dd.updated_at) DESC
  LIMIT 100;
END;
$$;

-- ============================================================
-- 3. Vehículos: mismo cargo 'verificacion'. Antes no dejaban ningún rastro
--    en admin_actions — ahora sí.
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_vehicle(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.vehicles
  WHERE id = p_vehicle_id AND status = 'pending'
  FOR UPDATE;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'El vehículo no está pendiente de aprobación';
  END IF;

  UPDATE public.vehicles SET is_active = false, updated_at = NOW()
  WHERE driver_id = v_driver_id AND is_active;

  UPDATE public.vehicles
  SET status = 'verified', is_active = true, verified_at = NOW(), updated_at = NOW()
  WHERE id = p_vehicle_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'vehicle_approved', v_driver_id, jsonb_build_object('vehicle_id', p_vehicle_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_vehicle(p_vehicle_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.vehicles WHERE id = p_vehicle_id;

  UPDATE public.vehicles
  SET status = 'rejected', is_active = false, rejection_reason = p_reason, updated_at = NOW()
  WHERE id = p_vehicle_id AND status = 'pending';

  IF FOUND THEN
    INSERT INTO public.admin_actions (admin_id, action, target_user_id, reason, details)
    VALUES (auth.uid(), 'vehicle_rejected', v_driver_id, p_reason, jsonb_build_object('vehicle_id', p_vehicle_id));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_vehicle_checklist(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_result boolean;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.vehicles WHERE id = p_vehicle_id;

  UPDATE public.vehicles
  SET checklist_completed_at = NOW(), checklist_completed_by = auth.uid(), updated_at = NOW()
  WHERE id = p_vehicle_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El vehículo no está pendiente de aprobación';
  END IF;

  v_result := public.activate_vehicle_if_ready(p_vehicle_id);

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'vehicle_checklist_completed', v_driver_id, jsonb_build_object('vehicle_id', p_vehicle_id, 'activated', v_result));

  RETURN v_result;
END;
$$;

-- Buscar un usuario para acreditarle saldo (por nombre, correo o teléfono).
CREATE OR REPLACE FUNCTION public.search_profiles_for_admin(p_query text)
RETURNS TABLE(id uuid, name text, email text, role text, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name::text, p.email::text, p.role::text, p.balance
  FROM public.profiles p
  WHERE p.name ILIKE '%' || p_query || '%'
     OR p.email ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_profiles_for_admin(text) FROM PUBLIC, anon;

-- ============================================================
-- 4. Recargas: cargo 'contabilidad'. admin_credit_balance ya escribe en
--    admin_actions y notifica al usuario — solo se amplía el candado.
-- ============================================================
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
  IF NOT (public.is_admin_user() OR public.has_staff_role('contabilidad')) THEN
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

-- Lectura del vehículo de un conductor para el expediente (la tabla vehicles
-- solo deja ver lo propio vía RLS; el personal necesita ver el de cualquiera).
CREATE OR REPLACE FUNCTION public.get_driver_vehicle_for_admin(p_driver_id uuid)
RETURNS TABLE(
  id uuid, plate text, make text, year integer, color text, status text,
  is_active boolean, rejection_reason text, photo_url text,
  owner_id_number text, owner_name text, owner_authorization_path text,
  owner_authorization_expires date, checklist_completed_at timestamptz,
  created_at timestamptz, verified_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT v.id, v.plate, v.make, v.year, v.color, v.status, v.is_active, v.rejection_reason,
         v.photo_url, v.owner_id_number, v.owner_name, v.owner_authorization_path,
         v.owner_authorization_expires, v.checklist_completed_at, v.created_at, v.verified_at
  FROM public.vehicles v
  WHERE v.driver_id = p_driver_id
  ORDER BY v.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_driver_vehicle_for_admin(uuid) FROM PUBLIC, anon;

-- ============================================================
-- 5. Reclamo de expediente: un revisor lo toma, nadie más lo trabaja a la
--    vez. Se libera solo o al pasar 15 minutos sin actividad.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_file_claims (
  driver_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_by uuid NOT NULL REFERENCES public.profiles(id),
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_file_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff ve los reclamos" ON public.driver_file_claims;
CREATE POLICY "staff ve los reclamos"
  ON public.driver_file_claims
  FOR SELECT
  USING (public.is_admin_user() OR public.has_staff_role('verificacion'));

CREATE OR REPLACE FUNCTION public.claim_driver_file(p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM public.driver_file_claims
  WHERE driver_id = p_driver_id AND claimed_at < NOW() - INTERVAL '15 minutes';

  INSERT INTO public.driver_file_claims (driver_id, claimed_by)
  VALUES (p_driver_id, auth.uid())
  ON CONFLICT (driver_id) DO NOTHING;

  RETURN EXISTS (
    SELECT 1 FROM public.driver_file_claims
    WHERE driver_id = p_driver_id AND claimed_by = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_driver_file(p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.driver_file_claims
  WHERE driver_id = p_driver_id AND claimed_by = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_driver_file(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_driver_file(uuid) FROM PUBLIC, anon;

-- Bitácora: la política original de admin_actions solo dejaba leer a
-- profiles.is_admin = true. El personal con cargo también debe poder verla.
DROP POLICY IF EXISTS "staff lee la bitácora" ON public.admin_actions;
CREATE POLICY "staff lee la bitácora"
  ON public.admin_actions
  FOR SELECT
  USING (public.is_admin_user() OR public.is_staff());

-- ============================================================
-- 6. Cola de conductores (no de documentos): un expediente por conductor,
--    con su avance (ej. 4/6) y quién lo tiene reclamado, el más antiguo
--    con expediente incompleto primero.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_driver_verification_queue()
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  national_id text,
  documents_verified integer,
  documents_total integer,
  oldest_pending_at timestamptz,
  claimed_by uuid,
  claimed_by_name text,
  claimed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('verificacion')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- driver_documents solo tiene fila para los tipos que el conductor YA subió
  -- (se crea con upsert al subir, no existen las 6 desde el principio) — por
  -- eso el total es el número fijo de tipos exigidos (6), nunca COUNT(*).
  RETURN QUERY
  SELECT
    p.id,
    p.name::text,
    d.national_id::text,
    COUNT(*) FILTER (WHERE dd.status = 'verified')::integer,
    6,
    MIN(dd.uploaded_at),
    c.claimed_by,
    cp.name::text,
    c.claimed_at
  FROM public.driver_documents dd
  JOIN public.profiles p ON p.id = dd.driver_id
  LEFT JOIN public.drivers d ON d.id = p.id
  LEFT JOIN public.driver_file_claims c ON c.driver_id = p.id
  LEFT JOIN public.profiles cp ON cp.id = c.claimed_by
  WHERE dd.document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
  GROUP BY p.id, p.name, d.national_id, c.claimed_by, cp.name, c.claimed_at
  HAVING COUNT(*) FILTER (WHERE dd.status = 'verified') < 6
      OR COUNT(*) FILTER (WHERE dd.status = 'rejected') > 0
  ORDER BY MIN(dd.uploaded_at) ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_driver_verification_queue() FROM PUBLIC, anon;
