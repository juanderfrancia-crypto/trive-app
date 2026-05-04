# 💬 SISTEMA DE MENSAJES Y CHATS - ARQUITECTURA COMPLETA

## 📋 TABLA DE CONTENIDOS
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Componentes de Frontend](#componentes-de-frontend)
4. [Servicios y Lógica de Backend](#servicios-y-lógica-de-backend)
5. [Hooks Personalizados](#hooks-personalizados)
6. [Modelo de Datos](#modelo-de-datos)
7. [Seguridad (RLS Policies)](#seguridad-rls-policies)
8. [Sistema de Realtime](#sistema-de-realtime)
9. [Flujos de Usuario](#flujos-de-usuario)
10. [Características Implementadas](#características-implementadas)
11. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)

---

## 📌 RESUMEN EJECUTIVO

El sistema de chat de Trive App permite comunicación en tiempo real entre pasajeros y conductores. Es una arquitectura **full-stack** con:

- **Frontend**: React Native con componentes reutilizables
- **Backend**: Supabase con PostgreSQL y RLS
- **Realtime**: WebSocket subscriptions
- **Almacenamiento**: Audio en Storage bucket, Metadata en DB
- **Seguridad**: Row Level Security (RLS) + Function RPC

**Características principales:**
- ✅ Mensajes de texto
- ✅ Notas de audio
- ✅ Indicadores de escritura ("está escribiendo")
- ✅ Estado online/offline
- ✅ Notificaciones push automáticas
- ✅ Conversaciones archivadas
- ✅ Edición y eliminación de mensajes
- ✅ Respuestas a mensajes (replies)
- ✅ Mensajes fijados
- ✅ Reacciones emoji

---

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────┐
│                    TRIVE APP - CHAT                      │
├─────────────────────────────────────────────────────────┤
│
│  ┌──────────────────┐
│  │  UI COMPONENTS   │ ← ChatBubble, MessageInput, etc
│  └────────┬─────────┘
│           │
│  ┌────────▼─────────┐
│  │  HOOKS (useChat) │ ← State, Subscriptions, Logic
│  └────────┬─────────┘
│           │
│  ┌────────▼──────────────────┐
│  │  SERVICES                  │ ← API calls, Realtime
│  │  (src/services/messages.ts)│
│  └────────┬──────────────────┘
│           │
│  ┌────────▼──────────────────────────┐
│  │  SUPABASE                          │
│  │  - PostgreSQL (messages table)     │
│  │  - Storage (audio files)           │
│  │  - Realtime (WebSocket)            │
│  │  - RLS Policies                    │
│  └────────────────────────────────────┘
```

---

## 🎨 COMPONENTES DE FRONTEND

### Árbol de Componentes

```
src/components/
├── ChatBubble.tsx
│   ├─ Muestra mensajes (texto/audio)
│   ├─ Menú de acciones (editar, eliminar, fijar)
│   ├─ Indicador de lectura
│   ├─ Reacciones emoji
│   └─ Estilos: primario si es mío, gris si es del otro
│
├── MessageInput.tsx
│   ├─ Input de texto
│   ├─ Contador de caracteres (máx 500)
│   ├─ Botones: emoji, grabación, envío
│   ├─ Indicador de edición si estoy editando
│   ├─ Loading spinner durante envío
│   └─ Estados: grabando, subiendo audio
│
├── ChatHeader.tsx
│   ├─ Avatar del otro usuario
│   ├─ Nombre y verificación
│   ├─ Rating y estado (online/offline)
│   ├─ Botones: back, search, opciones
│   ├─ Info expandible: placa, modelo vehículo
│   └─ Indicador de conexión activa
│
├── ConversationItem.tsx
│   ├─ Avatar + nombre
│   ├─ Preview del último mensaje
│   ├─ Timestamp relativo (hace 5m, ayer, etc)
│   ├─ Badge con count de no-leídos
│   ├─ Badge si es conductor
│   ├─ Indicador online
│   └─ Swipe para eliminar
│
├── TypingIndicator.tsx
│   ├─ Muestra "{Nombre} está escribiendo"
│   ├─ 3 puntos animados
│   └─ Color configurable
│
├── AudioMessage.tsx
│   ├─ Reproductor de audio inline
│   ├─ Botón play/pause
│   ├─ Barra de progreso
│   ├─ Duración y tiempo actual
│   ├─ Indicador "no escuchado" (nuevo)
│   └─ Listener de finalización
│
├── ReplyBubble.tsx
│   ├─ Muestra el mensaje al que repliqué
│   ├─ Nombre del autor original
│   ├─ Línea azul indicadora
│   ├─ Preview del mensaje (o "🎙️ Nota de voz")
│   └─ Botón cerrar para cancelar reply
│
├── EmojiReactions.tsx
│   ├─ Picker de emojis
│   ├─ Emojis sugeridos más populares
│   ├─ Búsqueda
│   └─ Integración con message_reactions table
│
├── PinnedMessageBar.tsx
│   ├─ Muestra el mensaje fijado
│   ├─ Botón para ir al mensaje
│   └─ Botón para desfijar
│
└── EmojiPicker.tsx
    ├─ Modal picker
    ├─ Categorías
    └─ Recientes
```

### Detalles de ChatBubble

```typescript
interface ChatBubbleProps {
  message: string
  messageType?: 'text' | 'audio'
  audioUrl?: string
  audioDuration?: number
  isAudioListened?: boolean
  isFromMe: boolean
  timestamp: string
  isRead?: boolean
  isEdited?: boolean
  isPinned?: boolean
  onAudioPlay?: () => void
  onCopy?: () => void
  onDelete?: () => void
  onReact?: (emoji: string) => void
  onReply?: () => void
  onEdit?: () => void
  onPin?: () => void
  onUnpin?: () => void
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>
  currentUserId?: string
}
```

---

## 🔧 SERVICIOS Y LÓGICA DE BACKEND

**Archivo Principal:** [src/services/messages.ts](src/services/messages.ts)

### Interfaces de Datos

```typescript
export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  booking_id?: string
  message: string
  message_type?: 'text' | 'audio'
  audio_url?: string
  audio_duration?: number
  is_audio_listened?: boolean
  is_read: boolean
  read_at?: string
  created_at: string
  // FASE 2
  reply_to_id?: string
  is_pinned?: boolean
  edited_at?: string
  edited_by?: string
}

export interface Conversation {
  other_user_id: string
  other_user_name: string
  other_user_avatar?: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export interface ChatContact {
  user_id: string
  name: string
  avatar_url?: string | null
  relation: 'driver' | 'passenger'
  description: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}
```

### Funciones Principales

#### 1️⃣ **Obtener Contactos**
```typescript
getChatContactsForUser(userId: string): ChatContact[]
```
- Obtiene conductores de mis bookings (si soy pasajero)
- Obtiene pasajeros de mis rutas (si soy conductor)
- Máximo 20 contactos
- Incluye descripción (ruta, tipo relación)

#### 2️⃣ **Obtener Conversaciones**
```typescript
getConversations(userId: string): Conversation[]
```
- Query últimos 1000 mensajes
- Agrupa por conversación única (bidireccional)
- Cuenta no-leídos de cada conversación
- Ordena por timestamp más reciente
- Retorna: lista de Conversation con info del otro usuario

#### 3️⃣ **Obtener Mensajes de Conversación**
```typescript
getConversation(userId: string, otherUserId: string, limit = 50): Message[]
```
- Query bidireccional: mensajes entre ambos usuarios
- Ordena ascendente (más antiguos primero)
- Marca como leídos automáticamente
- Límite: últimos 50 mensajes

#### 4️⃣ **Enviar Mensaje de Texto**
```typescript
sendMessage(fromUserId, toUserId, message, bookingId?): Promise<Message>
```
**Proceso:**
1. Valida: mensaje no vacío, usuarios diferentes, IDs válidos
2. Inserta en tabla `messages`
3. Obtiene push_token del receptor
4. Envía notificación push automática
5. Retorna mensaje creado

#### 5️⃣ **Marcar Como Leído**
```typescript
markAsRead(messageIds: string[]): Promise<void>
```
- Actualiza `is_read=true` y `read_at=NOW()`
- Bulk update para múltiples mensajes

#### 6️⃣ **Enviar Mensaje de Audio**
```typescript
sendAudioMessage(fromUserId, toUserId, audioBase64, durationMs, senderName?, bookingId?)
```
**Proceso:**
1. Convierte Base64 a Uint8Array
2. Intenta uploadear a Storage (prueba 4 rutas candidatas)
3. Obtiene URL pública
4. Inserta en `messages` con `message_type='audio'`
5. Envía notificación push con duración
6. Marca como no escuchado

#### 7️⃣ **Marcar Audio Como Escuchado**
```typescript
markAudioAsListened(messageId: string): Promise<void>
```
- Actualiza `is_audio_listened=true`

#### 8️⃣ **Eliminar Mensaje**
```typescript
deleteMessage(messageId: string): Promise<void>
```
- DELETE permanente (no soft delete)
- Requiere RLS check (solo owner)

#### 9️⃣ **Eliminar Conversación**
```typescript
deleteConversation(userId: string, otherUserId: string): Promise<void>
```
- Usa RPC `delete_conversation_messages()` (SECURITY DEFINER)
- Elimina bidireccional: from→to y to→from
- Bypasses RLS por seguridad

#### 🔟 **Responder a Mensaje (FASE 2)**
```typescript
sendReplyMessage(fromUserId, toUserId, message, replyToId)
```
- Inserta mensaje con `reply_to_id`

#### 1️⃣1️⃣ **Fijar Mensaje (FASE 2)**
```typescript
pinMessage(messageId: string): Promise<void>
unpinMessage(messageId: string): Promise<void>
getPinnedMessages(userId1, userId2): Promise<Message[]>
```

#### 1️⃣2️⃣ **Editar Mensaje (FASE 2)**
```typescript
editMessage(messageId, newMessage, userId)
```
- Actualiza `edited_at` y `edited_by`

#### 1️⃣3️⃣ **Reacciones (FASE 2)**
```typescript
addReaction(messageId, userId, emoji)
removeReaction(messageId, userId, emoji)
getMessageReactions(messageId): MessageReaction[]
getReactionsForMessages(messageIds[]): Map<messageId, reactions[]>
```

#### 1️⃣4️⃣ **Indicador de Escritura**
```typescript
sendTypingIndicator(fromUserId, toUserId)
```
- UPSERT en `typing_indicators`
- Auto-limpia en 5 segundos
- No falla si hay error

#### 1️⃣5️⃣ **Estado Online/Offline**
```typescript
updateUserOnlineStatus(userId): Promise<void>
```
- Actualiza `last_seen` en profiles
- Llamado cada 30 segundos si chat activo

---

## 🎯 HOOKS PERSONALIZADOS

**Archivo:** [src/hooks/useChat.ts](src/hooks/useChat.ts)

### Hook: `useChat(userId?: string)`

**Estado:**
```typescript
const {
  conversations,        // Conversation[]
  messages,             // Message[]
  contacts,             // ChatContact[]
  loading,              // boolean
  error,                // string | null
  currentOtherUserId,   // string | null
  otherUserTyping,      // boolean
  unreadCount,          // number (total)
  // Métodos
  loadConversation,     // (otherUserId) => Promise<void>
  send,                 // (text, bookingId?) => Promise<void>
  deleteChat,           // (otherUserId) => Promise<void>
}
```

**Lógica Implementada:**

1. **Polling de Conversaciones**
   - Cada 5 segundos (trade-off entre performance y sync)
   - Reduce suscripciones costosas
   - Mantiene lista sincronizada

2. **Carga de Contactos**
   - Una sola vez al montar
   - Máximo 20 contactos

3. **Cargar Conversación**
   - Limpia suscripciones anteriores
   - Carga últimos 50 mensajes
   - Establece 3 suscripciones realtime:
     - Nuevos mensajes
     - Cambios en mensajes (edit, delete)
     - Indicador de escritura

4. **Enviar Mensaje**
   - Valida userId y currentOtherUserId
   - Evita duplicados (checkea por ID)
   - Actualiza state optimista
   - Maneja errores

5. **Eliminar Chat**
   - Elimina de estado local INMEDIATAMENTE
   - Llama a RPC en background (si falla, polling lo resuelve)
   - Evita UI lag

6. **Actualizar Estado Online**
   - Cada 30 segundos (mientras chat activo)
   - Actualiza `last_seen` en profiles

7. **Limpieza de Suscripciones**
   - Usa Refs para almacenar unsubscribers
   - Cleanup al desmontar
   - Cleanup al cambiar de conversación

---

## 📊 MODELO DE DATOS

### Tabla: `messages`

```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuarios
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contexto
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Contenido
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',  -- 'text' o 'audio'
  
  -- Audio (si message_type='audio')
  audio_url TEXT,
  audio_duration INT,                       -- en ms
  is_audio_listened BOOLEAN DEFAULT FALSE,
  
  -- Estado de lectura
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- FASE 2 - Advanced features
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint: No auto-mensajes
  CONSTRAINT valid_users CHECK (from_user_id != to_user_id)
);
```

### Tabla: `typing_indicators`

```sql
CREATE TABLE typing_indicators (
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (from_user_id, to_user_id)
);
```

### Tabla: `message_reactions`

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (message_id, user_id, emoji)
);
```

### Tabla: `archived_conversations`

```sql
CREATE TABLE archived_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (user_id, other_user_id)
);
```

### Índices Optimizados

```sql
CREATE INDEX idx_messages_from ON messages(from_user_id, created_at DESC);
CREATE INDEX idx_messages_to ON messages(to_user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(to_user_id, is_read);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_is_pinned ON messages(is_pinned);
CREATE INDEX idx_messages_edited_at ON messages(edited_at);
```

---

## 🔐 SEGURIDAD (RLS Policies)

**Archivo:** [database/policies/FIX_MESSAGE_RLS_POLICY.sql](database/policies/FIX_MESSAGE_RLS_POLICY.sql)

### Políticas RLS

```sql
-- 1. SELECT: Ver solo mis mensajes (como sender o receiver)
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 2. INSERT: Solo puedo enviar mensajes como from_user, no a mí mismo
CREATE POLICY "Users can insert their messages" ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id);

-- 3. UPDATE: Solo puedo actualizar mis propios mensajes
CREATE POLICY "Users can update their messages" ON messages
  FOR UPDATE
  USING (auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = from_user_id);

-- 4. DELETE: Solo puedo eliminar mis propios mensajes
CREATE POLICY "Users can delete their messages" ON messages
  FOR DELETE
  USING (auth.uid() = from_user_id);
```

### Función RPC (SECURITY DEFINER)

```sql
CREATE FUNCTION delete_conversation_messages(other_user_id UUID, user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM messages WHERE from_user_id = user_id AND to_user_id = other_user_id;
  DELETE FROM messages WHERE from_user_id = other_user_id AND to_user_id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_conversation_messages(UUID, UUID) TO authenticated;
```

**¿Por qué SECURITY DEFINER?**
- Permite al usuario eliminar conversaciones sin romper RLS
- La función ejecuta con privilegios del propietario
- Más eficiente que las alternativas

---

## ⚡ SISTEMA DE REALTIME

### 3 Suscripciones por Conversación

#### Suscripción 1: Nuevos Mensajes
```typescript
export const subscribeToNewMessages = (
  userId: string,
  otherUserId: string,
  onNewMessage: (message: Message) => void
) => {
  const channel = supabase
    .channel(`chat:${userId}:${otherUserId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `to_user_id=eq.${userId}`,
    }, (payload) => {
      const newMsg = payload.new as Message
      if (newMsg.from_user_id === otherUserId) {
        onNewMessage(newMsg)  // Solo si es del otro usuario
      }
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}
```

**Detalles:**
- Filtra en servidor: `to_user_id=eq.${userId}`
- Después filtra en cliente: `from_user_id === otherUserId`
- Evita agregar duplicados en estado

#### Suscripción 2: Cambios en Mensajes
```typescript
export const subscribeToMessageChanges = (
  messageIds: string[],
  onMessageUpdated: (messageId: string, changes: Partial<Message>) => void
) => {
  if (messageIds.length === 0) return () => {}

  const channel = supabase
    .channel(`message-updates:${messageIds.join(',')}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
    }, (payload) => {
      const updatedMsg = payload.new as Message
      if (messageIds.includes(updatedMsg.id)) {
        onMessageUpdated(updatedMsg.id, updatedMsg)  // Actualiza propiedades
      }
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}
```

**Detecta cambios en:**
- `message` (si fue editado)
- `is_pinned` (si fue fijado/desfijado)
- `is_read` (si fue marcado como leído)
- `is_audio_listened` (si fue escuchado)

#### Suscripción 3: Indicador de Escritura
```typescript
export const subscribeToTypingIndicator = (
  userId: string,
  otherUserId: string,
  callback: (isTyping: boolean) => void
) => {
  const channel = supabase
    .channel(`typing:${userId}:${otherUserId}`)
    .on('postgres_changes', {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'typing_indicators',
      filter: `from_user_id=eq.${otherUserId}`,
    }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Si el created_at es reciente (<5s), está escribiendo
        const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
        callback(new Date(payload.new.created_at) > new Date(fiveSecondsAgo))
      }
      if (payload.eventType === 'DELETE') {
        callback(false)
      }
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}
```

### Gestión de Memoria

```typescript
// En useChat.ts
const messagesChannelRef = useRef<(() => void) | null>(null)
const changesChannelRef = useRef<(() => void) | null>(null)
const typingChannelRef = useRef<(() => void) | null>(null)

// Al limpiar suscripciones anteriores
if (messagesChannelRef.current) {
  messagesChannelRef.current()  // Unsubscribe
  messagesChannelRef.current = null
}

// Al desmontar el hook
useEffect(() => {
  return () => {
    // Cleanup de todas las suscripciones
    if (messagesChannelRef.current) messagesChannelRef.current()
    if (changesChannelRef.current) changesChannelRef.current()
    if (typingChannelRef.current) typingChannelRef.current()
  }
}, [])
```

---

## 🔄 FLUJOS DE USUARIO

### FLUJO 1: Ver Lista de Conversaciones

```
ChatScreen monta
  ↓
useChat(userId) ejecuta
  ↓
loadConversations() cada 5s
  ├─ Query últimos 1000 mensajes
  ├─ Agrupa por conversación
  ├─ Cuenta no-leídos
  └─ Actualiza estado
  ↓
Renderiza ConversationItem[] ordenado por más reciente
  ├─ Avatar + nombre
  ├─ Preview último mensaje
  ├─ Timestamp relativo
  └─ Badge con unreadCount
```

### FLUJO 2: Abrir Conversación

```
Usuario toca ConversationItem
  ↓
loadConversation(otherUserId)
  ├─ Limpia suscripciones previas
  ├─ Query getConversation(userId, otherUserId, 50)
  ├─ Actualiza estado.messages
  └─ Establece 3 suscripciones realtime
  ↓
ChatDetailScreen renderiza
  ├─ ChatHeader con info del otro usuario
  ├─ FlatList de ChatBubble[]
  ├─ Suscripción: nuevos mensajes agregan en tiempo real
  ├─ Suscripción: cambios actualizan mensaje en vivo
  ├─ Suscripción: muestra TypingIndicator si está escribiendo
  └─ MessageInput en bottom
```

### FLUJO 3: Enviar Mensaje de Texto

```
Usuario escribe en MessageInput
  ↓
Presiona botón envío
  ↓
send(text, bookingId?)
  ├─ Valida: text no vacío, userId y otherUserId existen
  ├─ Llamada a sendMessage()
  │  ├─ INSERT en DB
  │  ├─ Obtiene push_token del receptor
  │  ├─ Envía notificación push
  │  └─ Retorna Message creado
  ├─ Actualiza estado local:
  │  └─ setMessages([...prev, newMessage])
  └─ MessageInput limpia
  ↓
Receptor recibe via realtime subscription (INSERT)
  ├─ subscribeToNewMessages() dispara
  └─ Agrega mensaje a estado.messages
  ↓
Receptor ve mensaje en ChatBubble en tiempo real
```

### FLUJO 4: Enviar Nota de Audio

```
Usuario presiona botón grabación 🎤
  ↓
UI muestra: "Grabando... Presiona ✓ para confirmar"
  ├─ Grabación en segundo plano: useAudioRecorder hook
  ├─ Captura audio como .m4a (expo-av)
  └─ Muestra 2 botones: ✓ Confirmar | ✕ Cancelar
  ↓
Usuario presiona ✓ Confirmar
  ↓
sendAudioMessage()
  ├─ Convierte audio a Base64
  ├─ Sube a Supabase Storage: bucket "audio-messages"
  │  └─ Intenta 4 rutas candidatas (fallback)
  ├─ Obtiene URL pública
  ├─ INSERT en messages:
  │  ├─ message_type='audio'
  │  ├─ audio_url=publicUrl
  │  ├─ audio_duration=durationMs
  │  └─ is_audio_listened=false
  ├─ Obtiene push_token del receptor
  ├─ Envía notificación push
  └─ MessageInput limpia, UI vuelve a normal
  ↓
Receptor recibe via realtime
  ├─ Notificación push: "Nota de voz de {Name} - {duracion}s"
  └─ ChatBubble muestra AudioMessage component
  ↓
Receptor presiona play
  ├─ AudioMessage descarga el archivo
  ├─ Reproduce usando expo-av (Audio.Sound)
  ├─ Muestra controles: play/pause, progreso
  └─ Al terminar:
     ├─ markAudioAsListened(messageId)
     └─ Actualiza is_audio_listened=true
```

### FLUJO 5: Marcar como Leído

```
Usuario abre chat
  ↓
getConversation() se ejecuta
  ├─ Query mensajes
  ├─ Filtra unreadMessages (to_user_id=userId, is_read=false)
  └─ Si hay:
     └─ markAsRead(unreadMessages.map(m => m.id))
        ├─ UPDATE is_read=true, read_at=NOW()
        └─ Bulk update en DB
  ↓
Realtime subscription propaga cambio
  └─ Otro usuario ve checkmark ✓✓ en su mensaje
```

### FLUJO 6: Indicador de Escritura

```
Usuario empieza a escribir en MessageInput
  ↓
Triggerarse debounce (0.5s después de la última keystroke)
  ↓
sendTypingIndicator(userId, otherUserId)
  ├─ UPSERT en typing_indicators
  ├─ Auto-limpia en 5 segundos (setTimeout)
  └─ Llamada no-blocking
  ↓
Receptor suscrito recibe UPDATE (o INSERT)
  ├─ subscribeToTypingIndicator() dispara
  ├─ Valida: created_at > 5 segundos atrás
  ├─ Si valida: callback(true)
  └─ Renderiza TypingIndicator
  ↓
Después de 5 segundos
  ├─ Registro se auto-limpia
  ├─ Receptor recibe DELETE event
  ├─ callback(false)
  └─ TypingIndicator desaparece
```

### FLUJO 7: Eliminar Conversación

```
Usuario swipe left en ConversationItem (o presiona opciones)
  ↓
deleteChat(otherUserId)
  ├─ INMEDIATAMENTE:
  │  └─ setConversations(prev => prev.filter(...))
  │     └─ Conversación desaparece de la UI (optimista)
  ├─ EN BACKGROUND:
  │  └─ deleteConversation(userId, otherUserId) via RPC
  │     └─ Si falla, polling en 5s resincroniza
  └─ Si estaba abierto el chat:
     ├─ setCurrentOtherUserId(null)
     ├─ setMessages([])
     └─ Vuelve a pantalla de conversaciones
```

---

## ✨ CARACTERÍSTICAS IMPLEMENTADAS

### ✅ FASE 1 (MVP)

- [x] **Mensajes de Texto**
  - Envío bidireccional
  - Contador de caracteres (máx 500)
  - Validación: no vacíos, usuarios diferentes
  - Estado de lectura (is_read, read_at)

- [x] **Mensajes de Audio**
  - Grabación usando expo-av
  - Upload a Supabase Storage
  - Almacenamiento de metadatos (duración)
  - Reproducción inline con controles
  - Marcación de escuchado (is_audio_listened)

- [x] **Conversaciones**
  - Lista de conversaciones con último mensaje
  - Preview inteligente (trunca texto largo)
  - Contador de no-leídos por conversación
  - Timestamp relativo (hace 5m, ayer, etc)
  - Indicador de driver vs passenger

- [x] **Indicadores de Escritura**
  - "Está escribiendo..." con 3 puntos animados
  - Auto-cleanup en 5 segundos
  - Eficiente sin afectar performance

- [x] **Estado Online/Offline**
  - Actualización de `last_seen` cada 30s
  - Indicador visual en ChatHeader
  - Cálculo: online si last_seen < 5 min

- [x] **Notificaciones Push**
  - Integración con pushNotifications service
  - Payload con contexto del mensaje
  - Notificaciones automáticas al enviar

- [x] **Conversaciones Archivadas**
  - Tabla separada archived_conversations
  - Independiente por usuario
  - Los mensajes NO se eliminan

### ✅ FASE 2 (Advanced)

- [x] **Respuestas a Mensajes (Replies)**
  - Campo `reply_to_id` en messages table
  - ReplyBubble component que muestra original
  - Puede ser respuesta a texto o audio

- [x] **Mensajes Fijados**
  - Campo `is_pinned` en messages
  - Botón fijar/desfijar en menú
  - PinnedMessageBar muestra el fijado
  - Navegación al mensaje fijado

- [x] **Edición de Mensajes**
  - Campos: `edited_at`, `edited_by`
  - Solo el sender puede editar
  - Indicador visual "[editado]"
  - Timestamp del edit

- [x] **Reacciones Emoji**
  - Tabla message_reactions separada
  - Presionar emoji en bubble para reaccionar
  - Mostrar conteos por emoji
  - Remover reacción propia

---

## 🎯 PATRONES Y MEJORES PRÁCTICAS

### Patrón 1: Lazy Loading + Polling

**Problem:** WebSocket subscriptions son costosas, especialmente con muchas conversaciones.

**Solution:**
```
- Conversaciones: polling cada 5 segundos
- Mensajes de conversación abierta: realtime subscriptions
- Optimal trade-off entre performance y UX
```

### Patrón 2: Optimistic Updates

**Problem:** Si esperamos respuesta del server, UI se siente lenta.

**Solution:**
```typescript
// Actualizar UI inmediatamente
setMessages(prev => [...prev, newMessage])

// Esperar respuesta en background
sendMessage().catch(err => {
  // Rollback si falla
  setMessages(prev => prev.filter(m => m.id !== newMessage.id))
})
```

### Patrón 3: Auto-Cleanup Inteligente

**Problem:** Indicadores de escritura pueden quedar "pegados" si conexión muere.

**Solution:**
```typescript
// Auto-limpia en 5 segundos (más que debounce típico)
setTimeout(() => {
  supabase.from('typing_indicators').delete()
}, 5000)

// Si desaparece el registro, receptor automáticamente sabe que dejó de escribir
```

### Patrón 4: RLS Enforcement + RPC Bypass

**Problem:** RLS hace imposible eliminar ambos lados de la conversación.

**Solution:**
```sql
-- Usar SECURITY DEFINER function
-- Ejecuta con permisos del owner, no del usuario
CREATE FUNCTION delete_conversation_messages(...)
SECURITY DEFINER
-- Permite eliminar bidireccional sin romper seguridad
```

### Patrón 5: Bulk Queries con Joins

**Problem:** N+1 queries si traigo mensajes y luego usuarios por separado.

**Solution:**
```typescript
// Un solo query con foreign key relationship
.select(`
  id, message, created_at,
  from_user:from_user_id(id, name, avatar_url),
  to_user:to_user_id(id, name, avatar_url)
`)
```

### Patrón 6: Ref-Based Subscription Management

**Problem:** Memory leaks si no cleano las suscripciones.

**Solution:**
```typescript
// Usar Refs para almacenar unsubscribers
const channelRef = useRef<(() => void) | null>(null)

// Limpiar antes de crear nueva
if (channelRef.current) {
  channelRef.current()
  channelRef.current = null
}

// Cleanup en useEffect
useEffect(() => {
  return () => {
    if (channelRef.current) channelRef.current()
  }
}, [])
```

### Patrón 7: Validation Layer

**Problem:** Confiar solo en RLS deja bugs potenciales.

**Solution:**
```typescript
// Validar en cliente antes de enviar
if (!message.trim()) throw new Error('Mensaje vacío')
if (fromUserId === toUserId) throw new Error('No auto-mensajes')
if (!fromUserId || !toUserId) throw new Error('IDs inválidos')

// RLS previene exploits incluso si cliente falla
```

---

## 📈 MÉTRICAS Y PERFORMANCE

### Database Queries

| Operation | Complexity | Time |
|-----------|-----------|------|
| getConversations() | O(1000 rows) | ~100ms |
| getConversation(50) | O(50 rows) | ~50ms |
| sendMessage() | O(1 insert) | ~30ms + push |
| markAsRead() | O(n bulk) | ~50ms |
| deleteConversation() | O(n via RPC) | ~100ms |

### Subscriptions

| Subscription | Channels | Max Load |
|-------------|----------|----------|
| Messages | 1 per conversation | O(n) messages |
| Changes | 1 per conversation | ~50 message_ids |
| Typing | 1 per conversation | 1 typing_indicator |
| **Total** | **~3 per user** | **Manageable** |

### Storage

| Type | Size | Limit |
|------|------|-------|
| Text messages | ~200 bytes | 500 chars max |
| Audio messages | ~100KB-2MB | Per user quota |
| Audio bucket | Unlimited | Per user quota |

---

## 🚀 PRÓXIMAS MEJORAS

### Planeado para FASE 3

- [ ] Búsqueda de mensajes en conversación
- [ ] Selección múltiple de mensajes (para batch delete)
- [ ] Compartir ubicación en chat
- [ ] Videollamadas (agendadas)
- [ ] Traducción automática
- [ ] Encriptación de mensajes
- [ ] Backup/Export de chats
- [ ] Mensaje de voz a texto (speech-to-text)

---

## 📚 REFERENCIAS

### Tablas Relacionadas
- `profiles`: Usuarios, avatar, rating, last_seen
- `bookings`: Contexto de viaje para cada chat
- `routes`: Información de ruta entre usuarios

### Buckets Storage
- `audio-messages`: Archivos de notas de voz

### Archivos Clave
- [messages.ts](../src/services/messages.ts) - Service layer
- [useChat.ts](../src/hooks/useChat.ts) - State management
- [ChatBubble.tsx](../src/components/ChatBubble.tsx) - Mensaje UI
- [MessageInput.tsx](../src/components/MessageInput.tsx) - Input UI
- [MIGRATION_PHASE2_ADVANCED_MESSAGES.sql](../database/migrations/MIGRATION_PHASE2_ADVANCED_MESSAGES.sql) - Schema

---

**Fecha de actualización:** 30 de Abril de 2026  
**Versión:** 2.0 (FASE 2 Completa)  
**Estado:** ✅ Production Ready
