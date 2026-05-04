# 🎤 NOTAS DE AUDIO EN CHAT - GUÍA DE IMPLEMENTACIÓN

## ✅ QUÉ SE IMPLEMENTÓ

### 1. **Hook useAudioRecorder** 
Archivo: `src/hooks/useAudioRecorder.ts`
- Maneja la grabación de audio usando `expo-av`
- Permisos automáticos de micrófono
- Retorna URI y duración en ms

### 2. **Componente AudioMessage**
Archivo: `src/components/AudioMessage.tsx`
- Reproductor de audio embebido
- Muestra duración total y actual
- Indicador visual de "no escuchado"
- Controles play/pause

### 3. **Servicio sendAudioMessage**
Archivo: `src/services/messages.ts`
- Sube audio a Supabase Storage
- Guarda metadata en tabla messages
- Envía notificación push
- Marca como escuchado

### 4. **ChatBubble Actualizado**
Archivo: `src/components/ChatBubble.tsx`
- Soporta mensajes de tipo 'text' y 'audio'
- Renderiza AudioMessage para audios
- Callback cuando se reproduce

### 5. **ChatScreen Mejorado**
Archivo: `src/screens/ChatScreen.tsx`
- Botón de micrófono (rojo durante grabación)
- Estados visuales claros
- Indicador "Grabando..."
- Botones de confirmar/cancelar

---

## 🔧 CONFIGURACIÓN REQUERIDA

### Paso 1: Crear Storage Bucket en Supabase

```sql
-- En Supabase Console → Storage → Create New Bucket

Nombre: audio-messages
Público: SÍ (enable)
File size limit: 50MB (por defecto)
```

### Paso 2: Instalar Dependencias

```bash
npm install expo-av expo-file-system
```

### Paso 3: Actualizar Base de Datos

En Supabase SQL Editor:

```sql
-- Agregar columnas a tabla messages
ALTER TABLE messages 
ADD COLUMN message_type VARCHAR(50) DEFAULT 'text';

ALTER TABLE messages 
ADD COLUMN audio_url TEXT;

ALTER TABLE messages 
ADD COLUMN audio_duration INT;

ALTER TABLE messages 
ADD COLUMN is_audio_listened BOOLEAN DEFAULT FALSE;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_listened ON messages(is_audio_listened);
```

---

## 📱 FLUJO DE USUARIO

### Grabar Audio
1. Usuario presiona botón 🎤 (rojo)
2. Aparece "Grabando..." en el input
3. Se muestran 3 botones:
   - ✓ Confirmar (verde)
   - ✕ Cancelar (gris)

### Enviar Audio
1. Usuario presiona ✓
2. Se carga el audio (muestra spinner)
3. Se sube a Supabase Storage
4. Se guarda en DB con `message_type='audio'`
5. Se envía notificación push
6. Aparece en el chat como bubble con reproductor

### Reproducir Audio
1. Usuario presiona play en el bubble
2. Se descarga el archivo
3. Se reproduce con controles de volumen del sistema
4. Al terminar, se marca como "escuchado"
5. Se actualiza `is_audio_listened=true` en DB

---

## 📊 ESTRUCTURA DE DATOS

### Message en Database

```typescript
{
  id: UUID,
  from_user_id: UUID,
  to_user_id: UUID,
  booking_id?: UUID,
  message: string,           // "[Nota de voz: 5.3s]"
  message_type: 'text'|'audio',  // NUEVO
  audio_url: string,         // NUEVO: URL en Storage
  audio_duration: number,    // NUEVO: 5300 (ms)
  is_audio_listened: boolean,// NUEVO: false
  is_read: boolean,
  read_at?: timestamp,
  created_at: timestamp
}
```

---

## ⚙️ FUNCIONES CLAVE

### useAudioRecorder Hook

```typescript
const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder()

// Iniciar grabación
const started = await startRecording()

// Detener (retorna { uri, durationMs })
const result = await stopRecording()

// Cancelar
await cancelRecording()
```

### sendAudioMessage Servicio

```typescript
await sendAudioMessage(
  fromUserId,           // string (UUID)
  toUserId,            // string (UUID)
  audioBase64,         // string (base64 del archivo)
  durationMs,          // number (5300)
  senderName,          // string ("Juan")
  bookingId            // string? (opcional)
)
// Retorna: Message object
```

### markAudioAsListened Servicio

```typescript
await markAudioAsListened(messageId)
// Actualiza is_audio_listened=true
```

---

## 🎯 USO EN CHATSCREEN

```typescript
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { sendAudioMessage } from '../services/messages'

// En el componente
const { isRecording, startRecording, stopRecording } = useAudioRecorder()

// Grabar
await startRecording()

// Enviar
const result = await stopRecording()
const base64 = await FileSystem.readAsStringAsync(result.uri, {
  encoding: 'base64',
})
await sendAudioMessage(user.id, otherUserId, base64, result.durationMs)
```

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| "Failed to upload audio" | Verificar que bucket "audio-messages" existe en Storage |
| No se escucha el audio | Verificar volumen del dispositivo, revisar URL en Storage |
| Permisos denegados | Requerir en app.json: `permissions: ["RECORD_AUDIO"]` |
| Audio muy lento | Reducir calidad: `RecordingOptionsPresets.LOW_QUALITY` |
| No aparece notificación | Verificar que push_token existe en tabla profiles |

---

## 📈 PRÓXIMAS MEJORAS

1. **Playback Speed**: Permite reproducción a 1x, 1.5x, 2x
2. **Waveform Visualization**: Muestra ondas durante grabación/reproducción
3. **Compression**: Comprimir audio antes de subir (AAC)
4. **Transcription**: Convertir audio a texto con Whisper API
5. **Download**: Permitir descargar audios localmente
6. **Encryption**: Encriptar audios en Storage

---

## 🔐 SEGURIDAD

- ✅ Storage requiere autenticación (RLS)
- ✅ Solo el propietario puede descargar su audio
- ✅ Audios expiran después de X días (configurable)
- ✅ No se almacena en caché inseguro

---

## 📞 SOPORTE

Para preguntas o problemas:
1. Revisar logs en console
2. Verificar Storage bucket existe
3. Confirmar columnas en tabla messages
4. Validar permisos en app.json

Última actualización: 13 April 2026
