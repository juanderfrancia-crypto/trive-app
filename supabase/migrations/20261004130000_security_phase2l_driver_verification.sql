-- Fase 2l: verificación del conductor al aprobar todos sus documentos.
-- El disparador anterior contaba 5 documentos (faltaba la tarjeta de propiedad), no marcaba
-- driver_verified (lo que exige puede_conducir) y corría con permisos del administrador,
-- por lo que la base descartaba el cambio sobre el perfil de otra persona.

CREATE OR REPLACE FUNCTION public.check_all_documents_verified(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT document_type) = 6
  FROM public.driver_documents
  WHERE driver_id = p_driver_id
    AND document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
    AND status = 'verified';
$$;

CREATE OR REPLACE FUNCTION public.update_driver_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.check_all_documents_verified(NEW.driver_id) THEN
    UPDATE public.profiles
    SET role = 'driver',
        is_driver = true,
        driver_verified = true,
        driver_verified_at = COALESCE(driver_verified_at, NOW()),
        is_driver_verified = true,
        updated_at = NOW()
    WHERE id = NEW.driver_id;
  ELSE
    -- Si un documento deja de estar aprobado, el conductor vuelve a quedar sin verificar.
    UPDATE public.profiles
    SET driver_verified = false,
        is_driver_verified = false,
        updated_at = NOW()
    WHERE id = NEW.driver_id
      AND driver_verified = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_document_verified ON public.driver_documents;
CREATE TRIGGER on_document_verified
  AFTER INSERT OR UPDATE OF status ON public.driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_verification_status();
