-- ============================================================
-- CRITICAL FIX: Agregar campo sent_by_user_id a negotiation_messages
-- Sin esto, no se puede saber quién envió cada mensaje
-- ============================================================

-- PASO 1: Agregar columna como NULLABLE (si no existe)
ALTER TABLE negotiation_messages
ADD COLUMN IF NOT EXISTS sent_by_user_id UUID;

-- PASO 2: Poblar con valores válidos (copiar de driver_id por defecto)
UPDATE negotiation_messages
SET sent_by_user_id = driver_id
WHERE sent_by_user_id IS NULL;

-- PASO 3: Cambiar a NOT NULL después de popular los datos
ALTER TABLE negotiation_messages
ALTER COLUMN sent_by_user_id SET NOT NULL;

-- PASO 4: Eliminar constraints existentes si existen (idempotente)
ALTER TABLE negotiation_messages DROP CONSTRAINT IF EXISTS sent_by_user_fk;
ALTER TABLE negotiation_messages DROP CONSTRAINT IF EXISTS sender_must_be_participant;

-- PASO 5: Agregar constraint de FK
DO $$
BEGIN
  BEGIN
    ALTER TABLE negotiation_messages
    ADD CONSTRAINT sent_by_user_fk FOREIGN KEY (sent_by_user_id) 
      REFERENCES profiles(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Constraint ya existe, ignorar
  END;
END
$$;

-- PASO 6: Agregar constraint para validar que sent_by_user_id sea driver o passenger
DO $$
BEGIN
  BEGIN
    ALTER TABLE negotiation_messages
    ADD CONSTRAINT sender_must_be_participant CHECK (
      sent_by_user_id = driver_id OR sent_by_user_id = passenger_id
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Constraint ya existe, ignorar
  END;
END
$$;

-- PASO 7: Agregar índice para queries (idempotente)
CREATE INDEX IF NOT EXISTS negotiation_messages_sender_idx ON negotiation_messages(sent_by_user_id);

-- PASO 8: Actualizar RLS policy para marcar mensajes como leídos correctamente
DROP POLICY IF EXISTS "users_mark_messages_read" ON negotiation_messages;

CREATE POLICY "users_mark_messages_read"
  ON negotiation_messages
  FOR UPDATE
  USING (passenger_id = auth.uid() OR driver_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid() OR driver_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✅ Campo sent_by_user_id configurado correctamente en negotiation_messages';
  RAISE NOTICE '   ✅ Datos existentes poblados con driver_id como remitente por defecto';
  RAISE NOTICE '   ✅ FK constraint: remitente en profiles';
  RAISE NOTICE '   ✅ CHECK constraint: remitente es driver O passenger del viaje';
  RAISE NOTICE '   ✅ Índice creado para optimizar queries';
END;
$$;
