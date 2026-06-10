-- ============================================================================
-- 🔒 FIX: ELIMINAR RECURSIÓN INFINITA EN airport_offers RLS
-- ============================================================================
-- PROBLEMA: La política "driver_create_offer" intenta hacer NOT EXISTS en 
-- airport_offers desde dentro de una política de airport_offers → recursión infinita
--
-- SOLUCIÓN: Mover la validación a un TRIGGER en lugar de política RLS
-- ============================================================================

-- PASO 1: Eliminar la política problemática
DROP POLICY IF EXISTS "driver_create_offer" ON airport_offers;

-- PASO 2: Crear una nueva política SIMPLE sin recursión
-- El conductor puede INTENTAR insertar, pero el TRIGGER validará
CREATE POLICY "driver_create_offer_simple"
  ON airport_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM airport_requests
      WHERE id = request_id
      AND status = 'pending'
    )
  );

-- PASO 3: Crear/Actualizar el TRIGGER para validar "una oferta por conductor"
-- Los triggers NO disparan políticas RLS, por eso no causa recursión
CREATE OR REPLACE FUNCTION validate_single_offer_per_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que el conductor no tenga otra oferta ACEPTADA
  -- Pero permitir múltiples PENDIENTES para que pueda cambiar de precio
  IF EXISTS (
    SELECT 1 FROM airport_offers
    WHERE request_id = NEW.request_id
    AND driver_id = NEW.driver_id
    AND status = 'accepted'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Ya tienes una oferta aceptada para esta solicitud';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dropear trigger si existe
DROP TRIGGER IF EXISTS validate_offer_uniqueness ON airport_offers;

-- Crear el trigger
CREATE TRIGGER validate_offer_uniqueness
BEFORE INSERT OR UPDATE ON airport_offers
FOR EACH ROW
EXECUTE FUNCTION validate_single_offer_per_driver();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- SELECT policyname, qual, with_check FROM pg_policies 
-- WHERE tablename = 'airport_offers' ORDER BY policyname;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- ✅ La política ahora es simple y no causa recursión
-- ✅ El trigger SOLO valida que no haya ofertas ACEPTADAS (no pendientes)
-- ✅ Triggers no disparan políticas RLS, así que no hay recursión
-- ✅ El frontend rechaza ofertas pendientes anteriores antes de crear la nueva
-- ✅ El usuario puede cambiar de precio sin problemas
