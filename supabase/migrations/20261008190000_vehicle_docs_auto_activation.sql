-- Los documentos del vehículo (tarjeta, SOAT, tecnomecánica) se ligan a su placa.
-- El vehículo se activa automáticamente cuando el administrador completó el checklist
-- y sus documentos están verificados y vigentes. Si el dueño de la tarjeta no es el
-- conductor, se exige la autorización firmada vigente.

ALTER TABLE public.driver_documents
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS owner_id_number text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_authorization_path text,
  ADD COLUMN IF NOT EXISTS owner_authorization_expires date,
  ADD COLUMN IF NOT EXISTS checklist_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist_completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.driver_documents dd
SET vehicle_id = (
  SELECT v.id FROM public.vehicles v
  WHERE v.driver_id = dd.driver_id AND v.status IN ('pending', 'verified')
  LIMIT 1
)
WHERE dd.vehicle_id IS NULL
  AND dd.document_type IN ('tarjeta_propiedad', 'soat', 'tecnomecanica')
  AND (SELECT COUNT(*) FROM public.vehicles v
       WHERE v.driver_id = dd.driver_id AND v.status IN ('pending', 'verified')) = 1;

CREATE OR REPLACE FUNCTION public.vehicle_documents_ready(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.vehicles%ROWTYPE;
  v_national_id text;
  v_docs integer;
BEGIN
  SELECT * INTO v FROM public.vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND OR v.owner_id_number IS NULL THEN
    RETURN false;
  END IF;

  SELECT national_id INTO v_national_id FROM public.drivers WHERE id = v.driver_id;

  SELECT COUNT(DISTINCT document_type) INTO v_docs
  FROM public.driver_documents
  WHERE vehicle_id = p_vehicle_id
    AND status = 'verified'
    AND document_type IN ('tarjeta_propiedad', 'soat', 'tecnomecanica')
    AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);

  IF v_docs < 3 THEN
    RETURN false;
  END IF;

  IF v.owner_id_number IS DISTINCT FROM v_national_id THEN
    RETURN v.owner_authorization_path IS NOT NULL
      AND v.owner_authorization_expires >= CURRENT_DATE;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_vehicle_if_ready(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.vehicles%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.vehicles WHERE id = p_vehicle_id FOR UPDATE;

  IF NOT FOUND OR v.status <> 'pending' OR v.checklist_completed_at IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.vehicle_documents_ready(p_vehicle_id) THEN
    RETURN false;
  END IF;

  UPDATE public.vehicles SET is_active = false, updated_at = NOW()
  WHERE driver_id = v.driver_id AND is_active AND id <> p_vehicle_id;

  UPDATE public.vehicles
  SET status = 'verified', is_active = true, verified_at = NOW(), updated_at = NOW()
  WHERE id = p_vehicle_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_vehicle_checklist(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.vehicles
  SET checklist_completed_at = NOW(), checklist_completed_by = auth.uid(), updated_at = NOW()
  WHERE id = p_vehicle_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El vehículo no está pendiente de aprobación';
  END IF;

  RETURN public.activate_vehicle_if_ready(p_vehicle_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_activate_vehicle_on_doc_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.activate_vehicle_if_ready(NEW.vehicle_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activate_vehicle_on_doc_verified ON public.driver_documents;
CREATE TRIGGER activate_vehicle_on_doc_verified
  AFTER UPDATE OF status ON public.driver_documents
  FOR EACH ROW
  WHEN (NEW.status = 'verified' AND NEW.vehicle_id IS NOT NULL)
  EXECUTE FUNCTION public.trg_activate_vehicle_on_doc_verified();

REVOKE EXECUTE ON FUNCTION public.vehicle_documents_ready(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_vehicle_if_ready(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_complete_vehicle_checklist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_vehicle_checklist(uuid) TO authenticated;
