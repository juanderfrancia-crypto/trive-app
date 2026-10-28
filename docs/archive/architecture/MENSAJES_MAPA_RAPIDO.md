# 💬 MAPA RÁPIDO - SISTEMA DE MENSAJES

## 📍 UBICACIÓN DE ARCHIVOS

```
trive-app/
├── src/
│   ├── components/
│   │   ├── ChatBubble.tsx           ← Burbujas de mensajes (texto/audio)
│   │   ├── MessageInput.tsx         ← Input con grabación, emojis
│   │   ├── ChatHeader.tsx           ← Header de conversación
│   │   ├── ConversationItem.tsx     ← Item en lista de chats
│   │   ├── TypingIndicator.tsx      ← "Está escribiendo..."
│   │   ├── AudioMessage.tsx         ← Reproductor de audio
│   │   ├── ReplyBubble.tsx          ← Burbuja de respuesta
│   │   ├── EmojiReactions.tsx       ← Emojis
│   │   ├── PinnedMessageBar.tsx     ← Mensajes fijados
│   │   └── EmojiPicker.tsx          ← Picker de emojis
│   │
│   ├── services/
│   │   └── messages.ts              ← 🎯 LÓGICA PRINCIPAL (900+ líneas)
│   │       ├─ getChatContactsForUser()
│   │       ├─ getConversations()
│   │       ├─ getConversation()
│   │       ├─ sendMessage()
│   │       ├─ sendAudioMessage()
│   │       ├─ deleteConversation()
│   │       ├─ pinMessage(), editMessage()
│   │       ├─ addReaction()
│   │       ├─ subscribeToNewMessages()
│   │       ├─ subscribeToMessageChanges()
│   │       └─ subscribeToTypingIndicator()
│   │
│   ├── hooks/
│   │   └── useChat.ts               ← 🎯 STATE MANAGEMENT
│   │       ├─ conversations state
│   │       ├─ messages state
│   │       ├─ loadConversation()
│   │       ├─ send()
│   │       ├─ deleteChat()
│   │       └─ 3 realtime subscriptions
│   │
│   └── store/
│       └── useAppStore.ts           ← Global state (user, balance, etc)
│
├── database/
│   ├── setup/
│   │   ├── DATABASE_SETUP.sql       ← Tabla messages inicial
│   │   ├── PASO_1_MESSAGES_TABLE.sql ← Definición detallada
│   │   └── CONTACT_REQUESTS_SETUP.sql
│   │
│   ├── migrations/
│   │   ├── MIGRATION_PHASE2_ADVANCED_MESSAGES.sql ← reply_to_id, pinned, edited
│   │   ├── MIGRATION_ARCHIVED_CONVERSATIONS.sql
│   │   └── MIGRATION_DELETE_CONVERSATION_FUNCTION.sql ← RPC
│   │
│   ├── policies/
│   │   ├── FIX_MESSAGE_RLS_POLICY.sql ← 🔐 Seguridad
│   │   └── FIX_NOTIFICATIONS_RLS_COMPLETE.sql
│   │
│   └── queries/
│       ├── DIAGNOSE_ACTIVE_TRIPS.sql
│       └── DEBUG_BOOKING_ISSUE.sql
│
└── docs/
    ├── architecture/
    │   └── MENSAJES_CHATS_ARQUITECTURA_COMPLETA.md ← Este documento
    │
    └── features/
        ├── AUDIO_MESSAGES_GUIDE.md
        └── DELETE_CONVERSATIONS_IMPLEMENTATION.md
```

---

## 🔗 CONEXIONES PRINCIPALES

```
ChatDetailScreen / ChatListScreen
    │
    ├─→ useChat(userId)
    │     │
    │     ├─→ getConversations()   [polling 5s]
    │     ├─→ loadConversation()   [al abrir]
    │     │     ├─→ getConversation()
    │     │     └─→ 3 realtime subscriptions
    │     └─→ send(text)
    │           └─→ sendMessage()
    │                 ├─→ INSERT en messages
    │                 ├─→ sendPushNotificationToUser()
    │                 └─→ Notificación al otro usuario
    │
    ├─→ ChatBubble (renderiza cada mensaje)
    │     ├─ Audio: AudioMessage component
    │     ├─ Actions: Edit, Delete, Pin, Reply, React
    │     └─ Reactions: EmojiReactions component
    │
    ├─→ MessageInput
    │     ├─ sendMessage() → Text
    │     ├─ sendAudioMessage() → Audio
    │     └─ sendTypingIndicator() → Typing
    │
    └─→ ChatHeader
          └─ updateUserOnlineStatus()

REALTIME SUBSCRIPTIONS:
┌─ subscribeToNewMessages()        ← INSERT en messages
│  └─ Agrega nuevo mensaje a estado.messages
│
├─ subscribeToMessageChanges()     ← UPDATE en messages
│  └─ Actualiza propiedades (edited, pinned, is_read)
│
└─ subscribeToTypingIndicator()    ← INSERT/UPDATE/DELETE
   └─ Muestra/oculta TypingIndicator
```

---

## 📊 ESTADO DE LA CONVERSACIÓN

```typescript
// En useChat Hook
{
  conversations: [
    {
      other_user_id: "uuid-1",
      other_user_name: "Juan",
      last_message: "¿Qué hora viajamos?",
      last_message_time: "2026-04-30T10:30:00",
      unread_count: 3
    },
    // ...
  ],
  
  messages: [
    {
      id: "msg-1",
      from_user_id: "uuid-current",
      to_user_id: "uuid-juan",
      message: "Hola Juan",
      message_type: "text",
      is_read: true,
      created_at: "2026-04-30T10:00:00",
      // FASE 2 fields
      reply_to_id: null,
      is_pinned: false,
      edited_at: null
    },
    {
      id: "msg-2",
      from_user_id: "uuid-juan",
      to_user_id: "uuid-current",
      message: "[Nota de voz: 5.3s]",
      message_type: "audio",
      audio_url: "https://storage.url/...",
      audio_duration: 5300,
      is_audio_listened: false,
      is_read: false
    },
    // ...
  ],
  
  contacts: [
    {
      user_id: "uuid-driver",
      name: "Juan Conductor",
      relation: "driver",
      description: "Conductor de Cali → Bogotá"
    },
    // ...
  ],
  
  loading: false,
  error: null,
  currentOtherUserId: "uuid-juan",
  otherUserTyping: true,
  unreadCount: 5
}
```

---

## 🎯 FUNCIONES CLAVE - RESUMEN RÁPIDO

### Backend (messages.ts)

| Función | Parámetros | Retorna | Usa |
|---------|-----------|---------|-----|
| `getChatContactsForUser(userId)` | userId | ChatContact[] | Bookings + Routes |
| `getConversations(userId)` | userId | Conversation[] | last messages + unread count |
| `getConversation(userId, otherUserId, limit)` | 3 | Message[] | bidireccional + auto-read |
| `sendMessage(from, to, msg, bookingId?)` | 4 | Message | INSERT + push notification |
| `sendAudioMessage(from, to, audio, duration)` | 4 | Message | Storage upload + INSERT |
| `markAsRead(messageIds[])` | array | void | UPDATE is_read=true |
| `deleteMessage(messageId)` | id | void | DELETE permanente |
| `deleteConversation(userId, otherUserId)` | 2 | void | RPC function (SECURITY DEFINER) |
| `pinMessage(messageId)` | id | void | UPDATE is_pinned=true |
| `editMessage(id, newMsg, userId)` | 3 | void | UPDATE message + edited_at |
| `sendReplyMessage(from, to, msg, replyToId)` | 4 | void | INSERT con reply_to_id |
| `addReaction(msgId, userId, emoji)` | 3 | void | UPSERT message_reactions |
| `sendTypingIndicator(from, to)` | 2 | void | UPSERT typing_indicators |
| `subscribeToNewMessages(userId, other, cb)` | 3 | unsubscribe | Realtime INSERT |
| `subscribeToMessageChanges(ids[], cb)` | 2 | unsubscribe | Realtime UPDATE |
| `subscribeToTypingIndicator(userId, other, cb)` | 3 | unsubscribe | Realtime * |

### Frontend (useChat Hook)

| Método | Hace | Retorna |
|--------|------|---------|
| `loadConversation(otherUserId)` | Carga chat, 3 subscriptions | Promise<void> |
| `send(text, bookingId?)` | Envía mensaje | Promise<void> |
| `deleteChat(otherUserId)` | Elimina conversación (optimista) | Promise<void> |

---

## 🏛️ TABLAS DATABASE

### messages
```
PK: id (UUID)
├─ from_user_id (FK profiles)
├─ to_user_id (FK profiles)
├─ booking_id? (FK bookings)
├─ message (TEXT)
├─ message_type ('text'|'audio') [default 'text']
├─ audio_url?
├─ audio_duration?
├─ is_audio_listened? [default false]
├─ is_read [default false]
├─ read_at?
├─ reply_to_id? (FK messages) [FASE 2]
├─ is_pinned? [default false] [FASE 2]
├─ edited_at? [FASE 2]
├─ edited_by? (FK auth.users) [FASE 2]
├─ created_at [default NOW()]
└─ updated_at

7 ÍNDICES:
├─ idx_messages_from (from_user_id, created_at DESC)
├─ idx_messages_to (to_user_id, created_at DESC)
├─ idx_messages_conversation (from_user_id, to_user_id, created_at DESC)
├─ idx_messages_unread (to_user_id, is_read)
├─ idx_messages_reply_to_id (reply_to_id)
├─ idx_messages_is_pinned (is_pinned)
└─ idx_messages_edited_at (edited_at)

4 RLS POLICIES:
├─ SELECT: (from_user_id=auth.uid() OR to_user_id=auth.uid())
├─ INSERT: (from_user_id=auth.uid() AND from_user_id≠to_user_id)
├─ UPDATE: from_user_id=auth.uid()
└─ DELETE: from_user_id=auth.uid()
```

### typing_indicators
```
PK: (from_user_id, to_user_id)
├─ from_user_id
├─ to_user_id
└─ created_at

Auto-cleanup: 5 segundos después
Propósito: Indicadores de escritura en tiempo real
```

### message_reactions
```
PK: id (UUID)
├─ message_id (FK messages)
├─ user_id
├─ emoji
└─ created_at

UNIQUE: (message_id, user_id, emoji)
Propósito: Reacciones emoji a mensajes
```

### archived_conversations
```
PK: id (UUID)
├─ user_id (FK profiles)
├─ other_user_id
└─ archived_at

UNIQUE: (user_id, other_user_id)
Propósito: Archivar chats sin eliminar mensajes
```

---

## 🔐 SEGURIDAD

**RLS Policies (FIX_MESSAGE_RLS_POLICY.sql):**
- ✅ SELECT: Ver solo msgs de mi chat (sender O receiver)
- ✅ INSERT: Solo como from_user, no auto-msgs
- ✅ UPDATE: Solo owner puede editar
- ✅ DELETE: Solo owner puede eliminar

**RPC Function (SECURITY DEFINER):**
```sql
delete_conversation_messages(other_user_id, user_id)
  → DELETE bidireccional
  → Bypasses RLS de forma segura
```

**Validación en Cliente:**
- No mensaje vacío
- No auto-mensajes
- IDs válidos

---

## ⚡ REALTIME FLOW

```
Conversación abierta
  │
  └─→ Crear 3 canales de Supabase:
      │
      1. chat:${userId}:${otherUserId}
         Event: INSERT en messages
         Filter: to_user_id=eq.${userId}
         Acción: Agregar a estado.messages
         │
      2. message-updates:${messageIds.join(',')}
         Event: UPDATE en messages
         Filter: (ninguno, valida en cliente)
         Acción: Actualizar propiedades de mensaje
         │
      3. typing:${userId}:${otherUserId}
         Event: INSERT/UPDATE/DELETE en typing_indicators
         Filter: from_user_id=eq.${otherUserId}
         Acción: Mostrar/ocultar TypingIndicator
         │
Conversación cerrada
  │
  └─→ Limpiar 3 canales (unsubscribe)
```

---

## 📱 UI COMPONENTS TREE

```
ChatDetailScreen
├── ChatHeader
│   ├─ Avatar del otro usuario
│   ├─ Nombre + verificación
│   ├─ Estado (online/offline)
│   └─ Botones: back, search, opciones
│
├── FlatList de mensajes
│   ├─ DateSeparator (si cambió de día)
│   │
│   ├─ ChatBubble (si es texto)
│   │   ├─ Texto
│   │   ├─ Timestamp
│   │   ├─ Checkmarks (is_read)
│   │   ├─ Badge [editado]
│   │   ├─ Reactions (emojis)
│   │   └─ Menú: Edit, Delete, Pin, Reply, React
│   │
│   ├─ ChatBubble (si es audio)
│   │   ├─ AudioMessage component
│   │   │   ├─ Botón play/pause
│   │   │   ├─ Barra de progreso
│   │   │   └─ Duración
│   │   ├─ Badge [no escuchado]
│   │   └─ Acciones igual
│   │
│   └─ ChatBubble (si es reply)
│       ├─ ReplyBubble
│       │   ├─ Línea azul
│       │   ├─ Nombre original
│       │   └─ Preview msg
│       └─ Mensaje de respuesta
│
├─ TypingIndicator (si otherUserTyping)
│   └─ "{Name} está escribiendo" + 3 puntos
│
└── MessageInput
    ├─ Botón emoji (abre EmojiPicker)
    ├─ Input texto (500 chars max)
    ├─ Contador de caracteres
    ├─ Botón grabación (si no escribiendo)
    │   └─ AudioRecorder en background
    └─ Botón envío
       ├─ Si text: sendMessage()
       └─ Si audio: sendAudioMessage()
```

---

## 🎯 FLUJOS QUICK REFERENCE

### 1. Abrir Chat
```
Tap ConversationItem → loadConversation() → Query + 3 subscriptions → Renderizar
```

### 2. Enviar Texto
```
Type → sendMessage() → INSERT + push → Realtime propaga → ChatBubble aparece
```

### 3. Enviar Audio
```
Record → sendAudioMessage() → Storage upload → INSERT + push → AudioMessage aparece
```

### 4. Indicador Escritura
```
Start typing → sendTypingIndicator() (cada 500ms) → UPSERT → Realtime → TypingIndicator
```

### 5. Marcar Leído
```
getConversation() → Filtra unread → markAsRead() → UPDATE → Realtime → Checkmarks
```

### 6. Eliminar Chat
```
Swipe → deleteChat() → Estado actualiza instantly → RPC en background
```

---

## 🚀 PRÓXIMAS FASES

**FASE 3 (Roadmap):**
- [ ] Búsqueda en chats
- [ ] Batch delete
- [ ] Compartir ubicación
- [ ] Videollamadas
- [ ] Traducción automática
- [ ] Encriptación E2E
- [ ] Backup/Export

---

**Última actualización:** 30 Abril 2026 | v2.0
