-- Decisión de negocio: Trive se posiciona como gastos compartidos (modelo BlaBlaCar),
-- no como transporte remunerado regulado (modelo Uber/DiDi). Exigir certificado de
-- antecedentes judiciales es una señal propia de transporte comercial regulado, así
-- que se deja de pedir como requisito obligatorio de verificación.

CREATE OR REPLACE FUNCTION public.check_all_documents_verified(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT document_type) = 5
  FROM public.driver_documents
  WHERE driver_id = p_driver_id
    AND document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica')
    AND status = 'verified';
$$;

-- Backfill: conductores que ya tenían los 5 documentos restantes verificados pero
-- seguían sin quedar como conductor verificado porque les faltaba antecedentes.
UPDATE public.profiles p
SET role = 'driver',
    is_driver = true,
    driver_verified = true,
    driver_verified_at = COALESCE(driver_verified_at, NOW()),
    is_driver_verified = true,
    updated_at = NOW()
WHERE p.id IN (SELECT DISTINCT driver_id FROM public.driver_documents)
  AND public.check_all_documents_verified(p.id)
  AND p.driver_verified IS NOT TRUE;
