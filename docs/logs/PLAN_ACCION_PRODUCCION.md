# 🛠️ PLAN DE ACCIÓN - ROADMAP PARA PRODUCCIÓN

**Tiempo estimado total:** 3-4 semanas  
**Equipo recomendado:** 2-3 desarrolladores  
**Prioridad:** CRÍTICA - Bloquea lanzamiento

---

## SPRINT 1: CORREGIR BLOQUEADORES (Días 1-3)

### Tarea 1.1: Fijar Compilación TypeScript
**Duración:** 12 horas  
**Responsable:** Senior Developer

#### Errores a fijar (prioritarios):

```typescript
// 1. IMPROVED_* components - OPCIÓN A: Borrar
   Archivos: IMPROVED_CHAT_BUBBLE.tsx, IMPROVED_CONVERSATION_ITEM.tsx, IMPROVED_MESSAGE_INPUT.tsx
   Acción: Eliminar si no se usan, o actualizar

// 2. OPCIÓN B: Completar si se necesitan
   - Importar theme correcto
   - Reemplazar 'activeOpacity' con <TouchableOpacity>
   - Fijar types en StyleSheet

// 3. Theme.ts - ACTUALIZAR
   Agregar properties faltantes:
   - colors.secondary
   - colors.text
   - colors.dark
   - typography.caption
   - typography.body2
   - typography.button
   - typography.subtitle1
   - typography.subtitle2
   - typography.labelSmall

// 4. ChatBubble.tsx - TIPOS
   Línea 105: Cambiar flexDirection a tipo literal
   Línea 115: Validar tipos de estilo

// 5. useAudioRecorder.ts - API
   Cambiar 'stopAsync()' a 'stop()' o 'pauseAsync()'
   Validar versión de expo-av
```

**Checklist:**
- [ ] Borrar/completar IMPROVED_* components
- [ ] Actualizar theme.ts
- [ ] Fijar ChatBubble tipos
- [ ] Validar useAudioRecorder
- [ ] `npx tsc --noEmit` sale limpio ✅

---

### Tarea 1.2: Validación de Entrada - Fase 1
**Duración:** 10 horas  
**Responsable:** Middle Developer

#### Implementar:
```typescript
// Instalar librería
npm install zod

// Crear src/validations/index.ts
export const SearchSchema = z.object({
  origin: z.string().min(3, 'Origen inválido'),
  destination: z.string().min(3, 'Destino inválido'),
  date: z.date().min(new Date(), 'Fecha debe ser futura'),
})

export const BookingSchema = z.object({
  routeId: z.string().uuid(),
  seats: z.array(z.number()).min(1),
  paymentMethod: z.enum(['cash', 'card'])
})

// En screens, usar:
const { errors, isValid } = SearchSchema.safeParse(formData)
```

**Checklist:**
- [ ] Zod instalado
- [ ] Schemas creados
- [ ] SearchScreen validada
- [ ] BookingScreen validada
- [ ] DriverRegisterScreen validada

---

### Tarea 1.3: Rate Limiting en OTP
**Duración:** 5 horas  
**Responsable:** Backend/Senior

#### En Supabase (SQL):
```sql
-- Crear tabla de intentos
CREATE TABLE otp_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  attempts INT DEFAULT 1,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Función RPC
CREATE OR REPLACE FUNCTION verify_otp_with_limit(
  email TEXT,
  otp_code TEXT
)
RETURNS JSON AS $$
BEGIN
  -- Verificar si está bloqueado
  IF EXISTS (
    SELECT 1 FROM otp_attempts 
    WHERE email = $1 
    AND blocked_until > NOW()
  ) THEN
    RETURN json_build_object('error', 'Demasiados intentos. Intenta en 15 minutos.');
  END IF;
  
  -- Verificar OTP...
  -- Si falla, incrementar intentos
  -- Si 5+ fallos, bloquear 15 minutos
END;
$$ LANGUAGE PLPGSQL;
```

**Checklist:**
- [ ] Tabla otp_attempts creada
- [ ] RPC implementado
- [ ] AuthService usa nueva RPC
- [ ] Bloquea después de 5 intentos

---

## SPRINT 2: MIGRAR A TIEMPO REAL (Días 4-8)

### Tarea 2.1: Chat WebSocket (Supabase Realtime)
**Duración:** 20 horas  
**Responsable:** Senior Developer

#### Plan:
```typescript
// ANTES: useChat.ts (polling cada 2 segundos)
useEffect(() => {
  const interval = setInterval(() => loadConversation(), 2000)
}, [])

// DESPUÉS: useChat.ts (WebSocket)
useEffect(() => {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new])
    })
    .subscribe()
  
  return () => channel.unsubscribe()
}, [conversationId])
```

**Beneficios:**
- ✅ Mensajes instantáneos (vs 2-8 segundos)
- ✅ Baja de batería (~90%)
- ✅ Escalabilidad: 1000 chats simultáneos OK

**Checklist:**
- [ ] useChat.ts reescrito con Realtime
- [ ] ChatScreen funcionando con WebSocket
- [ ] Audio messages funcionan
- [ ] Probado con 2+ usuarios

---

### Tarea 2.2: Manejo de Errores Mejorado
**Duración:** 12 horas  
**Responsable:** Middle Developer

#### Crear:
```typescript
// src/utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public originalError?: Error
  ) {
    super(userMessage)
  }
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) return error
  
  if (error?.status === 404) {
    return new AppError('NOT_FOUND', 'Recurso no encontrado', error)
  }
  if (error?.status === 429) {
    return new AppError('RATE_LIMIT', 'Demasiadas solicitudes', error)
  }
  if (error?.status === 500) {
    return new AppError('SERVER_ERROR', 'Error del servidor', error)
  }
  
  return new AppError('UNKNOWN', 'Error inesperado', error)
}

// Uso:
try {
  await finalizePendingBookings()
} catch (error) {
  const appError = handleApiError(error)
  Toast.show(appError.userMessage)
  logError(appError)  // Para analytics
}
```

**Checklist:**
- [ ] ErrorHandler creado
- [ ] Usado en todos los try-catch
- [ ] Mensajes descriptivos
- [ ] Logging implementado

---

## SPRINT 3: TESTING (Días 9-14)

### Tarea 3.1: Jest + React Native Testing Library
**Duración:** 25 horas  
**Responsable:** 2 developers

#### Setup:
```bash
npm install --save-dev jest @testing-library/react-native
npx jest --init
```

#### Tests prioritarios:
```typescript
// __tests__/hooks/useAuth.test.ts
describe('useAuth', () => {
  test('register with invalid email fails', async () => {
    const { result } = renderHook(() => useAuth())
    
    await expect(
      result.current.register('invalid', 'pass123')
    ).rejects.toThrow('Email inválido')
  })
  
  test('password must be 8+ chars', async () => {
    const { result } = renderHook(() => useAuth())
    
    await expect(
      result.current.register('valid@email.com', 'short')
    ).rejects.toThrow('Mínimo 8 caracteres')
  })
})

// __tests__/screens/SearchScreen.test.tsx
describe('SearchScreen', () => {
  test('search requires origin and destination', () => {
    const { getByText } = render(<SearchScreen />)
    const searchBtn = getByText('Buscar')
    
    fireEvent.press(searchBtn)
    
    expect(getByText('Origen requerido')).toBeTruthy()
  })
})
```

#### Target: 70%+ coverage

**Checklist:**
- [ ] Jest configurado
- [ ] useAuth.test.ts completo
- [ ] useBookings.test.ts completo
- [ ] SearchScreen.test.tsx completo
- [ ] ChatScreen.test.tsx básico

---

## SPRINT 4: SEGURIDAD (Días 15-18)

### Tarea 4.1: Encriptar Datos Sensibles
**Duración:** 8 horas

```typescript
// npm install expo-secure-store

// src/services/secureStorage.ts
import * as SecureStore from 'expo-secure-store'

export const secureStorage = {
  setToken: (token: string) => SecureStore.setItemAsync('auth_token', token),
  getToken: () => SecureStore.getItemAsync('auth_token'),
  setPassword: (pass: string) => SecureStore.setItemAsync('password', pass),
  // AsyncStorage para datos no-sensibles
}
```

---

### Tarea 4.2: Validar Uploads
**Duración:** 6 horas

```typescript
// src/services/documentUpload.ts
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export const validateDocument = (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Solo PDF, JPG, PNG permitidos')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Máximo 10 MB')
  }
}
```

---

## SPRINT 5: PERFORMANCE (Días 19-21)

### Tarea 5.1: Optimizar Chat
**Duración:** 8 horas

```typescript
// Paginación
const loadConversation = (conversationId, limit = 30, offset = 0) => {
  return supabase
    .from('messages')
    .select()
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
}

// Virtual scrolling para 1000+ mensajes
import { VirtualizedList } from 'react-native'
```

### Tarea 5.2: Lazy Load Screens
**Duración:** 6 horas

```typescript
// AppNavigator.tsx
const ChatScreen = lazy(() => import('./ChatScreen'))
const ReviewsScreen = lazy(() => import('./ReviewsScreen'))
```

---

## ANTES vs DESPUÉS

### Métrica: Tiempo de Respuesta Chat

| Escenario | ANTES | DESPUÉS |
|-----------|-------|---------|
| Usuario A envía mensaje | 0s | 0s |
| Usuario B ve mensaje | 2-8s (polling) | 0.2-0.5s (WebSocket) |
| Latencia promedio | 5s | 0.35s |
| Mejora | ❌ | ✅ 14x más rápido |

---

## ANTES vs DESPUÉS

### Métrica: Consumo de Batería

| Escenario | ANTES | DESPUÉS |
|-----------|-------|---------|
| Chat abierto 1 hora | -35% batería | -5% batería |
| 10 chats activos | -350% (imposible) | Viable |
| Ahorro | ❌ | ✅ 7x menos batería |

---

## Criterios de Aceptación

```
SPRINT 1: ✅ TypeScript compila, validación básica
SPRINT 2: ✅ Chat en tiempo real, errores manejados
SPRINT 3: ✅ 70%+ test coverage
SPRINT 4: ✅ Datos encriptados, uploads validados
SPRINT 5: ✅ Performance optimizada, Stripe integrado

FINAL: app.json "ready": true
       Database migrations all up
       iOS build: ✅ Listo
       Android build: ✅ Listo
```

---

## Timeline Visual

```
Semana 1  |████████|  TypeScript + Validación + Rate Limiting
Semana 2  |████████|  Chat WebSocket + Error Handling
Semana 3  |████████|  Testing (70% coverage)
Semana 4  |████░░░░|  Seguridad + Performance
─────────────────────────────────────────────
Total: 3-4 semanas, entonces LAUNCH 🚀
```

---

## Recursos Necesarios

| Recurso | Cantidad | Costo |
|---------|----------|-------|
| Senior Dev | 1 FTE | $5,000-7,000 |
| Middle Dev | 1 FTE | $3,000-4,000 |
| QA Testing | 0.5 FTE | $1,500-2,000 |
| **Total** | | **$9,500-13,000** |

---

## Decisiones Críticas

1. **DEPRECATED COMPONENTS:** Borrar o completar IMPROVED_* files
   - Recomendación: **BORRAR** (no se usan, causan errores)

2. **STRIPE INTEGRATION:** Implementar ahora o después
   - Recomendación: **DESPUÉS** de Sprint 2 (funciona con cash primero)

3. **ADMIN DASHBOARD:** Expandir o keep basic
   - Recomendación: **KEEP BASIC** (funciona para MVP)

4. **GEOLOCALIZACIÓN:** Activar o no
   - Recomendación: **ESPERAR** (nice-to-have, no crítico)

---

## Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| No compila TypeScript | ALTA | CRÍTICO | ⚡ Sprint 1, Día 1 |
| Race condition en booking | MEDIA | CRÍTICO | Supabase RPC (ya existe) |
| Chat lento | MEDIA | ALTO | Sprint 2, migrar WebSocket |
| Ataque fuerza bruta OTP | MEDIA | ALTO | Sprint 1, rate limiting |
| Datos encriptados débil | BAJA | MEDIO | Sprint 4, SecureStore |

---

## Contacto & Escalación

- **Bloqueador crítico?** → Escalar a Tech Lead
- **Pregunta arquitectura?** → Revisar ANALISIS_COMPLETO_CODEBASE.md
- **Bug encontrado?** → Crear issue con template

