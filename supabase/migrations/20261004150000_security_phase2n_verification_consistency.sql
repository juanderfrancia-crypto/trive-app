-- Fase 2n: coherencia de la verificación de conductores.
-- 1. Una sola verdad: la cuenta con los 6 documentos aprobados queda con driver_verified
--    (lo que exige puede_conducir) e is_driver_verified (lo que muestra la app) iguales.
-- 2. Un administrador no puede aprobar ni rechazar sus propios documentos.

UPDATE public.profiles p
SET role = 'driver',
    is_driver = true,
    driver_verified = true,
    driver_verified_at = COALESCE(p.driver_verified_at, NOW()),
    is_driver_verified = true
WHERE public.check_all_documents_verified(p.id)
  AND (p.driver_verified IS DISTINCT FROM true OR p.is_driver_verified IS DISTINCT FROM true);

UPDATE public.profiles p
SET driver_verified = false,
    is_driver_verified = false
WHERE NOT public.check_all_documents_verified(p.id)
  AND (p.driver_verified = true OR p.is_driver_verified = true);

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

  IF EXISTS (SELECT 1 FROM public.driver_documents WHERE id = doc_id AND driver_id = auth.uid()) THEN
    RAISE EXCEPTION 'Un administrador no puede verificar sus propios documentos';
  END IF;

  UPDATE public.driver_documents
  SET status = 'verified',
      verified_at = NOW(),
      expiry_date = exp_date,
      updated_at = NOW()
  WHERE id = doc_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_document_admin(doc_id uuid, reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.driver_documents WHERE id = doc_id AND driver_id = auth.uid()) THEN
    RAISE EXCEPTION 'Un administrador no puede verificar sus propios documentos';
  END IF;

  UPDATE public.driver_documents
  SET status = 'rejected',
      rejection_reason = reason,
      updated_at = NOW()
  WHERE id = doc_id;

  RETURN true;
END;
$$;
