-- ============================================================================
-- 📝 Función para crear/actualizar ofertas de airport (maneja duplicados)
-- ============================================================================
-- Esta función permite que un conductor actualice su oferta anterior
-- si propone un nuevo precio, en lugar de lanzar un error

-- PASO 1: Crear la función
CREATE OR REPLACE FUNCTION upsert_airport_offer(
  p_request_id UUID,
  p_driver_id UUID,
  p_proposed_price INT DEFAULT NULL
)
RETURNS airport_offers AS $$
DECLARE
  v_offer airport_offers;
  v_existing_id UUID;
BEGIN
  -- Buscar si existe una oferta pendiente anterior
  SELECT id INTO v_existing_id
  FROM airport_offers
  WHERE request_id = p_request_id
    AND driver_id = p_driver_id
    AND status = 'pending'
  LIMIT 1;

  -- Si existe una oferta anterior, rechazarla primero
  IF v_existing_id IS NOT NULL THEN
    UPDATE airport_offers
    SET status = 'rejected',
        responded_at = NOW()
    WHERE id = v_existing_id;
  END IF;

  -- Crear la nueva oferta
  INSERT INTO airport_offers (
    request_id,
    driver_id,
    proposed_price,
    status,
    created_at
  ) VALUES (
    p_request_id,
    p_driver_id,
    p_proposed_price,
    'pending',
    NOW()
  ) RETURNING * INTO v_offer;

  RETURN v_offer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Otorgar permisos
GRANT EXECUTE ON FUNCTION upsert_airport_offer(UUID, UUID, INT) TO anon, authenticated;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- ✅ Esta función maneja todo en una transacción atómica
-- ✅ Rechaza automáticamente la oferta anterior si existe
-- ✅ Crea la nueva oferta
-- ✅ El trigger ahora no interfiere porque rechazamos primero
