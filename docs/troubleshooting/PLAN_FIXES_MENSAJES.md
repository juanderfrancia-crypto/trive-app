# 🎯 Plan de Fixes - Inconsistencia Mensajes/Chats

**Estado**: 🔴 Crítico - 4 problemas principales identificados  
**Prioridad**: Fase 1 (Crítico) → Fase 2 (Alto) → Fase 3 (Mejoras)  
**Tiempo Total**: ~15-16 horas

---

## 📋 CHECKLIST - FASE 1 (CRÍTICO) ⚠️

### ✅ Fix 1: Eliminar Race Condition en send()
- **Ubicación**: `src/hooks/useChat.ts` 
- **Problema**: Mensajes duplicados (envío + realtime)
- **Cambios**:
  - [ ] Eliminar `setMessages(prev => [...prev, newMessage])` en `send()`
  - [ ] Usar ID temporal `temp-${Date.now()}` para optimistic update
  - [ ] Dejar que realtime agregue el mensaje con ID real
  - [ ] Reemplazar temp ID con ID real cuando llega realtime
- **Archivos**:
  ```
  src/hooks/useChat.ts (líneas ~220-240)
  ```
- **Tests**:
  ```bash
  # Enviar 5 mensajes y verificar no hay duplicados
  expect(messages.length).toBe(5)
  ```

---

### ✅ Fix 2: Eliminar Polling - Solo Realtime
- **Ubicación**: `src/hooks/useChat.ts`
- **Problema**: Polling cada 5s vs realtime en conflicto
- **Cambios**:
  - [ ] Eliminar `setInterval(loadConversations, 5000)` 
  - [ ] Crear `subscribeToConversationChanges()`
  - [ ] Cargar inicial + suscribirse a cambios realtime
- **Archivos**:
  ```
  src/hooks/useChat.ts (líneas ~40-60)
  src/services/messages.ts (agregar función suscripción)
  ```
- **Beneficio**: 🚀 -80% de queries a BD, sin conflictos de datos

---

### ✅ Fix 3: Crear conversation_summaries + Trigger
- **Ubicación**: Base de datos (nueva tabla)
- **Problema**: getConversations() ineficiente, unread_count incorrecto
- **Cambios**:
  - [ ] Crear tabla `conversation_summaries`
  - [ ] Crear función `update_conversation_summary_fn()`
  - [ ] Crear trigger `update_conversation_summary` en messages
  - [ ] Reemplazar query en `getConversations()` para usar tabla nueva
- **Archivos SQL**:
  ```
  database/migrations/MIGRATION_CONVERSATION_SUMMARIES.sql (CREAR)
  ```
- **Archivos TypeScript**:
  ```
  src/services/messages.ts (reemplazar getConversations())
  ```
- **Tests**:
  ```bash
  # Insertar mensaje y verificar summary se actualiza en 100ms
  # Unread count debe ser exacto
  ```

---

### ✅ Fix 4: Lectura Bidireccional (message_read_status)
- **Ubicación**: Base de datos + servicios
- **Problema**: No sincroniza cuándo el otro usuario lee tus mensajes
- **Cambios**:
  - [ ] Crear tabla `message_read_status`
  - [ ] RLS policy para que solo participantes vean
  - [ ] Función `markMessagesAsRead()` que actualiza ambos lados
  - [ ] `subscribeToReadStatus()` para escuchar cambios
  - [ ] Agregar suscripción en `useChat` para actualizar UI
- **Archivos**:
  ```
  database/migrations/MIGRATION_MESSAGE_READ_STATUS.sql (CREAR)
  src/services/messages.ts (agregar funciones)
  src/hooks/useChat.ts (agregar suscripción)
  ```
- **Tests**:
  ```bash
  # Usuario A envía mensaje
  # Usuario B abre chat y marca como leído
  # Usuario A ve indicador "Leído" en tiempo real
  ```

---

## 📋 CHECKLIST - FASE 2 (ALTO)

### ✅ Fix 5: Typing Indicators con Trigger
- **Ubicación**: `database/triggers/` + `src/services/messages.ts`
- **Problema**: Indicadores "escribiendo" se quedan permanentes
- **Cambios**:
  - [ ] Crear trigger `cleanup_old_typing_indicators`
  - [ ] Eliminar setTimeout en cliente
  - [ ] La BD limpia automáticamente después de 5s
- **Archivos**:
  ```
  database/triggers/CLEANUP_TYPING_INDICATORS.sql (CREAR)
  src/services/messages.ts (simplificar sendTypingIndicator)
  ```

---

### ✅ Fix 6: deleteConversation con Sincronización
- **Ubicación**: `src/hooks/useChat.ts` + `src/services/messages.ts`
- **Problema**: Conversaciones reaparecen después de deletearlas
- **Cambios**:
  - [ ] Optimistic delete en UI inmediato
  - [ ] Ejecutar delete en BD
  - [ ] Suscribirse a cambios para confirmar
  - [ ] Si reaparece, revertir UI
- **Archivos**:
  ```
  src/hooks/useChat.ts (reemplazar deleteChat)
  ```

---

### ✅ Fix 7: Sequence Numbers para Orden
- **Ubicación**: Base de datos
- **Problema**: Orden de mensajes incorrecto/desorden
- **Cambios**:
  - [ ] `ALTER TABLE messages ADD COLUMN sequence_number BIGSERIAL`
  - [ ] Crear índice `idx_messages_sequence`
  - [ ] Usar `sequence_number` en lugar de `created_at` para ordenar
- **Archivos**:
  ```
  database/migrations/MIGRATION_MESSAGE_SEQUENCE.sql (CREAR)
  src/services/messages.ts (cambiar order by)
  ```

---

## 📋 CHECKLIST - FASE 3 (MEJORAS)

### ✅ Fix 8: Reliable Subscriptions
- **Ubicación**: `src/services/messages.ts`
- **Problema**: Subscripciones pueden morir silenciosamente
- **Cambios**:
  - [ ] Crear wrapper `createReliableChannel()`
  - [ ] Implementar retry automático (max 3 intentos)
  - [ ] Logs de estado de suscripción
  - [ ] Reemplazar todas las suscripciones con wrapper
- **Archivos**:
  ```
  src/utils/reliableSubscription.ts (CREAR)
  src/services/messages.ts (usar wrapper)
  ```

---

### ✅ Fix 9: Audio Realtime Sync
- **Ubicación**: `src/services/messages.ts`
- **Problema**: Cambios en audios no se sincronizan realtime
- **Cambios**:
  - [ ] Agregar suscripción a cambios de `audio_url`
  - [ ] Agregar suscripción a cambios de `is_audio_listened`
  - [ ] Actualizar UI cuando audio se marca como escuchado
- **Archivos**:
  ```
  src/services/messages.ts (agregar suscripción audio)
  src/hooks/useChat.ts (escuchar cambios audio)
  ```

---

### ✅ Fix 10: Audit RLS Policies
- **Ubicación**: `database/policies/`
- **Problema**: Policies incompletas o demasiado permisivas
- **Cambios**:
  - [ ] Revisar política INSERT en messages
  - [ ] Revisar política UPDATE en messages
  - [ ] Agregar pruebas de seguridad
- **Archivos**:
  ```
  database/policies/FIX_MESSAGE_RLS_POLICY.sql (revisar/actualizar)
  database/policies/check_rls.sql (agregar tests)
  ```

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

```
Semana 1 (Lunes-Martes):
  ├─ Fix 1: Race condition ✓ (30 min)
  ├─ Fix 2: Eliminar polling ✓ (2 horas)
  └─ Tests & Merge

Semana 1 (Miércoles):
  ├─ Fix 3: conversation_summaries + trigger ✓ (3 horas)
  └─ Tests & Merge

Semana 1 (Jueves):
  ├─ Fix 4: Lectura bidireccional ✓ (2 horas)
  └─ Tests & Merge

Semana 2 (Viernes):
  ├─ Fix 5: Typing indicators ✓ (1 hora)
  ├─ Fix 6: deleteConversation ✓ (1 hora)
  ├─ Fix 7: Sequence numbers ✓ (2 horas)
  └─ Tests & Merge

Semana 2 (Lunes-Martes):
  ├─ Fix 8: Reliable subscriptions ✓ (1.5 horas)
  ├─ Fix 9: Audio realtime ✓ (1.5 horas)
  ├─ Fix 10: RLS audit ✓ (1 hora)
  └─ Tests & Merge

TOTAL: ~15-16 horas de desarrollo
```

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Crear (Nuevos)
```
database/migrations/
  ├─ MIGRATION_CONVERSATION_SUMMARIES.sql
  ├─ MIGRATION_MESSAGE_READ_STATUS.sql
  └─ MIGRATION_MESSAGE_SEQUENCE.sql

database/triggers/
  └─ CLEANUP_TYPING_INDICATORS.sql

src/utils/
  └─ reliableSubscription.ts
```

### Modificar (Existentes)
```
src/hooks/
  ├─ useChat.ts (eliminar polling, agregar suscripciones)

src/services/
  ├─ messages.ts (refactorizar getConversations, agregar funciones)

database/policies/
  ├─ FIX_MESSAGE_RLS_POLICY.sql (revisar)
```

---

## 🧪 VALIDACIÓN

### Tests Recomendados
```typescript
// Test 1: No duplicar mensajes
test('Enviar mensaje no crea duplicados', async () => {
  const count = messages.length
  await send('Hola')
  await wait(500)
  expect(messages.length).toBe(count + 1)
})

// Test 2: Conversaciones se actualizan en realtime
test('Nueva conversación aparece en tiempo real', async () => {
  // Usuario B envía mensaje a Usuario A
  // Usuario A debe verlo aparecer sin polling
})

// Test 3: Unread count es exacto
test('Unread count es correcto', async () => {
  // Enviar 3 mensajes no leídos
  // Debe mostrar 3
  expect(conversation.unread_count).toBe(3)
})

// Test 4: Lectura se sincroniza
test('Otra persona ve cuando lees', async () => {
  // Usuario A envía mensaje
  // Usuario B abre y lee
  // Usuario A ve "Leído" en tiempo real
})

// Test 5: Conversación no reaparece
test('Eliminar chat no reaparece', async () => {
  await deleteChat(id)
  expect(conversations).not.toContain(id)
  await wait(6000) // Esperar a que old polling se ejecute
  expect(conversations).not.toContain(id)
})
```

### Comandos de Verificación
```bash
# Verificar no hay duplicados en BD
SELECT COUNT(*) as count, message_id 
FROM messages 
GROUP BY id 
HAVING COUNT(*) > 1;

# Verificar RLS está correcta
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'messages';

# Verificar triggers existen
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## ⚠️ ROLLBACK PLAN

Si algo falla en producción:

```bash
# Revertir a última versión estable
git revert <commit-hash>

# Verificar BD está consistente
database/queries/DEBUG_BOOKINGS_STATUS.sql

# Limpiar typing_indicators huérfanos
DELETE FROM typing_indicators WHERE created_at < NOW() - INTERVAL '1 hour';

# Recalcular unread counts
UPDATE messages SET is_read = TRUE 
WHERE created_at < NOW() - INTERVAL '24 hours' AND is_read = FALSE;
```

---

## 📞 CONTACTO & PREGUNTAS

Documentación completa: [docs/troubleshooting/PROBLEMAS_INCONSISTENCIA_MENSAJES.md](../troubleshooting/PROBLEMAS_INCONSISTENCIA_MENSAJES.md)

- **¿Duda sobre Fix específico?** → Ver documento completo
- **¿Necesitas código?** → Los ejemplos están en ese documento
- **¿Cómo ejecutar test?** → npm test src/hooks/useChat.test.ts

---

## 📊 ESTADO ACTUAL

```
🔴 CRÍTICO - 4 problemas principales
  ├─ Mensajes duplicados
  ├─ Conversaciones desincronizadas
  ├─ Unread count incorrecto
  └─ Lectura no se sincroniza

🟡 ALTO - 3 problemas secundarios
  ├─ Typing indicators fantasma
  ├─ Conversaciones reaparecen
  └─ Orden de mensajes incorrecto

🟢 BAJO - 3 mejoras
  ├─ Subscripciones pueden morir
  ├─ Audio no sincroniza
  └─ RLS policies audit

✅ DESPUÉS DE FASE 1: 80% de problemas resueltos
✅ DESPUÉS DE FASE 2: 95% de problemas resueltos
✅ DESPUÉS DE FASE 3: 100% + mejoras de confiabilidad
```

---

**Última actualización**: 30 de abril de 2026  
**Versión**: 1.0  
**Estado**: 📋 Listo para implementar

