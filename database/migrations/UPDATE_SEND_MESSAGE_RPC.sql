-- ============================================================
-- UPDATE: Función send_negotiation_message para incluir sent_by_user_id
-- ============================================================

DROP FUNCTION IF EXISTS send_negotiation_message(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_negotiation_message(
  v_request_id UUID,
  v_message_text TEXT,
  v_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_user_id UUID := auth.uid();
  v_driver_id UUID;
  v_passenger_id UUID;
  v_request_status TEXT;
  v_has_payment BOOLEAN;
BEGIN
  -- Obtener datos del viaje
  SELECT driver_id, passenger_id, status INTO v_driver_id, v_passenger_id, v_request_status
  FROM airport_requests
  WHERE id = v_request_id;

  IF v_driver_id IS NULL THEN
    RAISE NOTICE '[DB] ERROR: Viaje no encontrado (request_id: %)', v_request_id;
    RAISE EXCEPTION 'Viaje no encontrado';
  END IF;

  -- Validar que el usuario es participante
  IF v_user_id != v_driver_id AND v_user_id != v_passenger_id THEN
    RAISE NOTICE '[DB] ERROR: Usuario no es participante del viaje';
    RAISE EXCEPTION 'No eres participante de este viaje';
  END IF;

  -- Validar estado del viaje (solo durante negociación/viaje activo)
  IF v_request_status NOT IN ('pending', 'negotiating', 'accepted', 'in_progress') THEN
    RAISE NOTICE '[DB] ERROR: El viaje no está en fase de negociación/activo. Estado: %', v_request_status;
    RAISE EXCEPTION 'No se pueden enviar mensajes en este estado del viaje';
  END IF;

  -- ⭐ VALIDACIÓN ANTI-FRAUDE: Solo el conductor debe haber pagado
  -- El pasajero no paga, así que solo validamos si quien envía es el conductor
  IF v_user_id = v_driver_id THEN
    -- Es el CONDUCTOR: DEBE tener pago 'deducted' para poder chatear
    SELECT EXISTS(
      SELECT 1 FROM negotiation_payments
      WHERE request_id = v_request_id
      AND driver_id = v_driver_id
      AND status = 'deducted'
    ) INTO v_has_payment;

    IF NOT v_has_payment THEN
      RAISE NOTICE '[DB] ERROR: Conductor no ha pagado la comisión. request_id: %, driver_id: %', 
        v_request_id, v_driver_id;
      RAISE EXCEPTION 'Conductor: La comisión de $5.000 no ha sido pagada. Chat bloqueado.';
    END IF;
  ELSE
    -- Es el PASAJERO: No necesita pagar, siempre puede chatear
    RAISE NOTICE '[DB✅] Pasajero puede chatear sin restricción de pago (request_id: %)', v_request_id;
  END IF;

  -- Crear mensaje con sent_by_user_id = usuario autenticado
  INSERT INTO negotiation_messages (
    request_id,
    driver_id,
    passenger_id,
    sent_by_user_id,
    message_text,
    message_type
  ) VALUES (
    v_request_id,
    v_driver_id,
    v_passenger_id,
    v_user_id,
    v_message_text,
    v_message_type
  )
  RETURNING id INTO v_message_id;

  RAISE NOTICE '[DB✅] Mensaje enviado: id=%, request=%, sender=%, type=%', 
    v_message_id, v_request_id, v_user_id, v_message_type;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
