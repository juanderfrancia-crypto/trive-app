# 🔴 Análisis de Problemas de Inconsistencia en Mensajes/Chats

## Resumen Ejecutivo

Se identificaron **12 problemas críticos** causando inconsistencia en el sistema de mensajes y chats:

| Severidad | Problema | Impacto | Solución |
|-----------|----------|--------|----------|
| 🔴 CRÍTICO | Race condition envío-realtime | Mensajes duplicados | Deshabilitar agregar en estado después de envío |
| 🔴 CRÍTICO | Polling 5s vs Realtime conflicto | Datos desactualizados | Deshabilitar polling, usar realtime exclusivamente |
| 🔴 CRÍTICO | getConversations() ineficiente | Unread count incorrecto | Usar agregación en BD + trigger RLS-aware |
| 🔴 CRÍTICO | Lectura bidireccional inconsistente | Mensajes no marcados leídos | Rastrear estado read en ambas direcciones |
| 🟡 ALTO | Typing indicators fantasma | Indicadores permanentes | Limpiar en BD con trigger, no solo cliente |
| 🟡 ALTO | deleteConversation asincrónico | Mensajes reaparecen | Usar trigger de BD + sincronización realtime |
| 🟡 ALTO | Orden de mensajes incorrecto | Mensajes desorden | Usar ID secuencial o timestamp con microsegundos |
| 🟡 ALTO | Audio sin realtime sync | Audios no actualizan estado | Agregar trigger para cambios de audio |
| 🟡 MEDIO | Subscripciones pueden morir silenciosamente | Memory leaks | Implementar retry automático + health check |
| 🟡 MEDIO | RLS policy incompleta | Operaciones bloqueadas | Ajustar filtros RLS para INSERT y UPDATE |
| 🟢 BAJO | Reacciones sin UI update realtime | Emojis no sincronizados | Agregar suscripción a message_reactions |
| 🟢 BAJO | Error handling incompleto | Errores ocultos | Añadir logs estructurados + alertas |

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **Race Condition: Envío vs Realtime (CRÍTICO)**

**Ubicación**: `src/hooks/useChat.ts:send()` + `subscribeToNewMessages()`

**Problema**:
```typescript
// 1️⃣ send() agrega el mensaje al estado
setMessages(prev => [...prev, newMessage])

// 2️⃣ Realtime también lo agrega
setMessages(prev => [...prev, newMessage])  // ¡DUPLICADO!
```

**Síntomas**:
- Mensajes duplicados aparecen ocasionalmente
- Orden incorrecto de mensajes
- Contador de mensajes inflado

**Causa Raíz**:
- `send()` actualiza inmediatamente el estado (optimistic update)
- Pero realtime también lo propaga dentro de ms
- La lógica de deduplicación `if (prev.some(m => m.id === newMessage.id))` usa `.some()` que es O(n) y puede fallar si hay lag

**Solución**:

```typescript
// ❌ ANTES - Ambos agregan
setMessages(prev => [...prev, newMessage])  // en send()
onNewMessage(newMessage)  // en subscribeToNewMessages

// ✅ DESPUÉS - Solo realtime agrega
// send() NO actualiza estado para mensajes propios
// Solo marca como "enviando" con ID temporal
// Realtime trae el mensaje con ID real

// En send():
const tempId = `temp-${Date.now()}`
setMessages(prev => [...prev, { ...newMessage, id: tempId, isPending: true }])

// Realtime replace temp con real:
setMessages(prev =>
  prev.map(m => m.id === tempId ? newMessage : m)
)
```

---

### 2. **Polling vs Realtime Conflicto (CRÍTICO)**

**Ubicación**: `src/hooks/useChat.ts` - polling cada 5s vs subscripciones

**Problema**:
```typescript
// Polling cada 5s en getConversations()
const interval = setInterval(loadConversations, 5000)

// Pero también hay suscripciones realtime...
// Resultado: Dos fuentes de verdad en conflicto
```

**Síntomas**:
- Conversaciones se actualizan inconsistentemente
- Unread count salta entre valores
- Mensajes desaparecen y reaparecen
- Ralentización por sobrecarga de queries

**Causa Raíz**:
- Realtime trae datos cuando suceden
- Polling trae datos cada 5s (puede traer datos obsoletos)
- El estado se sincroniza dos veces: realtime + poll
- `getConversations()` recalcula 1000 registros para reagrupar

**Solución**:

1. **Deshabilitar polling para conversaciones**:
```typescript
// ❌ ELIMINAR
const interval = setInterval(loadConversations, 5000)

// ✅ Solo usar realtime
useEffect(() => {
  if (!userId) return
  
  // Cargar inicial
  loadConversations()
  
  // Suscribirse a cambios en tiempo real
  return subscribeToConversationChanges(userId, (updates) => {
    setConversations(prev => mergeConversationUpdates(prev, updates))
  })
}, [userId])
```

2. **Crear tabla `conversation_summaries`** (denormalizada):
```sql
CREATE TABLE conversation_summaries (
  user_id UUID NOT NULL,
  other_user_id UUID NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, other_user_id)
);

-- Trigger para actualizar cuando hay nuevos mensajes
CREATE TRIGGER update_conversation_summary
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_summary_fn();
```

3. **Usar subscripción a resumen**:
```typescript
// ✅ MUCHO MÁS EFICIENTE
subscribeToConversationSummaries(userId, (update) => {
  setConversations(prev => {
    const idx = prev.findIndex(c => c.other_user_id === update.other_user_id)
    if (idx >= 0) {
      const next = [...prev]
      next[idx] = update
      return next
    }
    return [...prev, update]
  })
})
```

---

### 3. **getConversations() Ineficiente (CRÍTICO)**

**Ubicación**: `src/services/messages.ts:getConversations()`

**Problema**:
```typescript
// Trae 1000 mensajes solo para agrupar
const { data } = await supabase
  .from('messages')
  .select('...')
  .limit(1000)  // 🔴 Problema 1

// Luego reagrupa en memoria (O(n²))
for (const msg of data) {  // Problema 2
  if (!conversationMap.has(otherUserId)) {
    // Recalcula unread_count filtrando TODO
    const unreadCount = data.filter(
      m => m.from_user_id === otherUserId && ...
    ).length  // 🔴 O(n) por cada conversación!
  }
}
```

**Síntomas**:
- Unread count cambia aleatoriamente
- Conversaciones reaparecen/desaparecen
- Alto uso de CPU
- Slow queries

**Solución**:
```sql
-- ✅ Vista materializada con conteos precisos
CREATE MATERIALIZED VIEW user_conversations AS
SELECT 
  CASE 
    WHEN m.from_user_id = $1 THEN m.to_user_id
    ELSE m.from_user_id
  END as other_user_id,
  p.name as other_user_name,
  p.avatar_url as other_user_avatar,
  MAX(m.created_at) as last_message_time,
  (SELECT message FROM messages m2 
   WHERE m2.id = MAX(m.id)) as last_message,
  COUNT(CASE 
    WHEN m.from_user_id != $1 AND NOT m.is_read 
    THEN 1 
  END) as unread_count
FROM messages m
JOIN profiles p ON p.id = CASE 
  WHEN m.from_user_id = $1 THEN m.to_user_id
  ELSE m.from_user_id
END
WHERE m.from_user_id = $1 OR m.to_user_id = $1
GROUP BY other_user_id, p.name, p.avatar_url
ORDER BY last_message_time DESC;
```

```typescript
// ✅ TypeScript
export const getConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: userId
  })
  
  if (error) throw error
  return data || []
}
```

---

### 4. **Estado de Lectura Bidireccional Inconsistente (CRÍTICO)**

**Ubicación**: `src/services/messages.ts:getConversation()`

**Problema**:
```typescript
// Se marcan como leídos AL CARGAR la conversación
const unreadMessages = data.filter(m => m.to_user_id === userId && !m.is_read)
await supabase.from('messages').update({ is_read: true }).in('id', unreadMessages)

// PERO:
// 1. No hay sincronización cuando el otro usuario RECIBE mis mensajes
// 2. Si el otro usuario tiene la conversación abierta, no ve cuando LEE
// 3. Puede haber race condition si lee casi al mismo tiempo
```

**Síntomas**:
- Mensajes marcados leídos cuando no se leyeron
- No se ve cuándo el otro usuario lee tus mensajes
- Estados de lectura desincronizados

**Solución**:

1. **Crear tabla de estado de lectura**:
```sql
CREATE TABLE message_read_status (
  message_id UUID PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  read_by_sender BOOLEAN DEFAULT FALSE,
  read_by_recipient BOOLEAN DEFAULT FALSE,
  read_at_sender TIMESTAMPTZ,
  read_at_recipient TIMESTAMPTZ,
  UNIQUE(message_id, from_user_id, to_user_id)
);

-- RLS: Solo los participantes pueden ver/actualizar
CREATE POLICY "Usuarios pueden ver estado de lectura de sus mensajes"
ON message_read_status
FOR SELECT
USING (auth.uid() IN (from_user_id, to_user_id));
```

2. **Marcar lectura de ambas direcciones**:
```typescript
export const markMessagesAsRead = async (
  userId: string,
  otherUserId: string,
  messageIds: string[]
) => {
  // Marcar mensajes que RECIBÍ (to_user_id = mi ID)
  await supabase
    .from('messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .in('id', messageIds)
    .eq('to_user_id', userId)
  
  // Sincronizar bidireccional
  await supabase
    .from('message_read_status')
    .upsert(messageIds.map(id => ({
      message_id: id,
      from_user_id: otherUserId,
      to_user_id: userId,
      read_by_recipient: true,
      read_at_recipient: new Date().toISOString()
    })))
}
```

3. **Suscribirse a cambios de lectura**:
```typescript
export const subscribeToReadStatus = (
  userId: string,
  otherUserId: string,
  callback: (updates: Record<string, boolean>) => void
) => {
  return supabase
    .channel(`read-status:${userId}:${otherUserId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_read_status',
      filter: `or(and(from_user_id=eq.${userId},to_user_id=eq.${otherUserId}),and(from_user_id=eq.${otherUserId},to_user_id=eq.${userId}))`
    }, (payload) => {
      // Actualizar UI con nuevo estado
      callback({
        [payload.new.message_id]: payload.new.read_by_recipient
      })
    })
    .subscribe()
}
```

---

## 🟡 PROBLEMAS ALTOS

### 5. **Typing Indicators Fantasma (ALTO)**

**Ubicación**: `src/services/messages.ts:sendTypingIndicator()`

**Problema**:
```typescript
// Limpieza en el CLIENTE
setTimeout(async () => {
  await supabase.from('typing_indicators').delete()...
}, 5000)

// SI el cliente se desconecta antes de los 5s, 
// el servidor nunca limpia → indicador permanente
```

**Solución**:
```sql
-- Trigger para auto-limpiar en BD
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE created_at < NOW() - INTERVAL '5 seconds';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_typing
AFTER INSERT ON typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_old_typing_indicators();
```

```typescript
// Simplificar cliente - solo insertar
export const sendTypingIndicator = async (
  fromUserId: string,
  toUserId: string
) => {
  const { error } = await supabase
    .from('typing_indicators')
    .upsert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      created_at: new Date().toISOString()
    }, { onConflict: 'from_user_id,to_user_id' })
  
  if (error) throw error
  // ✅ La BD limpia automáticamente después de 5s
}
```

---

### 6. **deleteConversation Asincrónico (ALTO)**

**Ubicación**: `src/hooks/useChat.ts:deleteChat()`

**Problema**:
```typescript
// Elimina inmediatamente del UI
setConversations(prev => prev.filter(...))

// Pero luego lo intenta en BD de forma asincrónica
await deleteConversation(...)

// SI falla, el polling de 5s lo trae de vuelta
```

**Síntomas**:
- Conversaciones reaparecen después de deletearlas
- Confirmación visual pero falla silenciosamente

**Solución**:
```typescript
const deleteChat = useCallback(
  async (otherUserId: string) => {
    if (!userId) return
    
    try {
      // 1. Optimistic delete
      const beforeDelete = conversations
      setConversations(prev => 
        prev.filter(c => c.other_user_id !== otherUserId)
      )
      
      // 2. Actualizar en BD
      await deleteConversation(userId, otherUserId)
      
      // 3. Suscribirse a confirmación
      const checkDeleted = subscribeToConversationChanges(userId, (updates) => {
        // Si reaparece, revertir
        if (updates.find(u => u.other_user_id === otherUserId)) {
          setConversations(beforeDelete)
        }
      })
      
      return () => checkDeleted()
    } catch (err) {
      // Revertir si falla
      setConversations(beforeDelete)
      throw err
    }
  },
  [userId, conversations]
)
```

---

### 7. **Orden de Mensajes Incorrecto (ALTO)**

**Ubicación**: `src/services/messages.ts:getConversation()`

**Problema**:
```typescript
// Obtiene últimos 50 en orden ASC
const { data } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: true })
  .limit(50)

// PERO realtime agrega nuevos al final
// Si la secuencia se corta, hay saltos
```

**Solución**:
```sql
-- Agregar secuencia a nivel de BD
ALTER TABLE messages ADD COLUMN sequence_number BIGSERIAL;
CREATE INDEX idx_messages_sequence ON messages(from_user_id, to_user_id, sequence_number);
```

```typescript
// ✅ Usar secuencia en lugar de timestamp
export const getConversation = async (userId: string, otherUserId: string) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(...)
    .order('sequence_number', { ascending: true })  // ← Usar secuencia
    .limit(50)
  
  return data || []
}

// ✅ Al agregar nuevos mensajes, comparar secuencia
setMessages(prev => {
  // Insertar en posición correcta según sequence_number
  const idx = prev.findIndex(m => m.sequence_number > newMessage.sequence_number)
  if (idx === -1) return [...prev, newMessage]
  return [...prev.slice(0, idx), newMessage, ...prev.slice(idx)]
})
```

---

## 🟢 PROBLEMAS MEDIANOS

### 8. **Subscripciones Pueden Morir Silenciosamente (MEDIO)**

**Ubicación**: Todas las suscripciones realtime

**Solución**:
```typescript
// Wrapper de suscripción con retry
export const createReliableChannel = (
  name: string,
  options: any,
  callback: (payload: any) => void,
  maxRetries = 3
) => {
  let retries = 0
  
  const attemptSubscribe = () => {
    const channel = supabase
      .channel(name)
      .on('postgres_changes', options, callback)
      .on('subscribe', () => {
        retries = 0
        console.log(`✅ Channel ${name} subscribed`)
      })
      .on('error', (err) => {
        console.error(`❌ Channel ${name} error:`, err)
        if (retries < maxRetries) {
          retries++
          setTimeout(attemptSubscribe, 1000 * retries)
        }
      })
      .subscribe()
    
    return channel
  }
  
  return attemptSubscribe()
}
```

---

## 📋 Tabla de Prioridad de Fixes

| Orden | Problema | Estimado | Impacto |
|-------|----------|----------|--------|
| 1️⃣ | Eliminar polling, solo realtime | 2h | 🔴 Crítico |
| 2️⃣ | Deshabilitar dupl en send() | 30min | 🔴 Crítico |
| 3️⃣ | Crear conversation_summaries + trigger | 3h | 🔴 Crítico |
| 4️⃣ | Lectura bidireccional | 2h | 🔴 Crítico |
| 5️⃣ | Typing indicators trigger | 1h | 🟡 Alto |
| 6️⃣ | deleteConversation con sync | 1h | 🟡 Alto |
| 7️⃣ | Sequence numbers para orden | 2h | 🟡 Alto |
| 8️⃣ | Reliable subscriptions | 1.5h | 🟡 Alto |
| 9️⃣ | Audio realtime sync | 1.5h | 🟢 Medio |
| 🔟 | RLS policies fixes | 1h | 🟢 Bajo |

**Total**: ~15-16 horas de implementación

---

## ✅ Checklist de Implementación

### Fase 1 - Crítico (3-4 días)
- [ ] Deshabilitar polling conversaciones
- [ ] Eliminar dupl en send()
- [ ] Crear conversation_summaries + trigger
- [ ] Implementar lectura bidireccional

### Fase 2 - Alto (2 días)
- [ ] Typing indicators con trigger
- [ ] deleteConversation con confirmación
- [ ] Sequence numbers para orden

### Fase 3 - Mejoras (1 día)
- [ ] Reliable subscriptions
- [ ] Audio realtime
- [ ] RLS policies audit

---

## 🧪 Tests Recomendados

```typescript
// Test: Enviar mensaje y verificar no duplica
test('Enviar mensaje no crea duplicados', async () => {
  const initialCount = messages.length
  await send('Hola')
  await wait(100) // Esperar a realtime
  expect(messages).toHaveLength(initialCount + 1)
})

// Test: Conversaciones se actualizan una sola vez
test('getConversations solo se llama una vez', async () => {
  const spy = jest.spyOn(messages, 'getConversations')
  const { rerender } = render(<ChatComponent />)
  await wait(100)
  expect(spy).toHaveBeenCalledTimes(1) // No polling
  rerender()
  await wait(100)
  expect(spy).toHaveBeenCalledTimes(1) // Aún 1, sin polling
})

// Test: Eliminar conversación persiste
test('deleteConversation no reaparece', async () => {
  const chat = conversations.find(...)
  await deleteChat(chat.other_user_id)
  expect(conversations).not.toContain(chat)
  // Verificar que polling no lo trae de vuelta
  await wait(5100)
  expect(conversations).not.toContain(chat)
})
```

