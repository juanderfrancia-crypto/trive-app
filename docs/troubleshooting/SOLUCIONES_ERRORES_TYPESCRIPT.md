# 🔧 GUÍA DE SOLUCIONES - Cómo Fijar Cada Error

**Objetivo:** Guía paso-a-paso para corregir los 100+ errores TypeScript

---

## ERROR 1: Missing Module '../theme/theme'

**Archivos Afectados:**
- IMPROVED_CHAT_BUBBLE.tsx:7
- IMPROVED_CONVERSATION_ITEM.tsx:7
- IMPROVED_MESSAGE_INPUT.tsx:7

### OPCIÓN A: Borrar componentes (RECOMENDADO)

```bash
# Si no se usan
rm src/components/IMPROVED_CHAT_BUBBLE.tsx
rm src/components/IMPROVED_CONVERSATION_ITEM.tsx
rm src/components/IMPROVED_MESSAGE_INPUT.tsx

# Verificar que no se importen en otro lado
grep -r "IMPROVED_" src/
# Si no hay resultados, están limpios
```

### OPCIÓN B: Completar si se necesitan

```typescript
// Asegurarse que theme.ts existe y exporta todo
// src/theme/theme.ts

export const theme = {
  colors: {
    primary: '#0040A1',
    primary_light: '#4A7FDB',
    primary_dark: '#001F5C',
    accent: '#FF6B6B',
    background: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    secondary: '#6B7280',
    dark: '#111827',
    // ... más colores
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 28, fontWeight: 'bold' },
    h3: { fontSize: 24, fontWeight: 'bold' },
    body: { fontSize: 16 },
    body2: { fontSize: 14 },
    caption: { fontSize: 12 },
    button: { fontSize: 16, fontWeight: '600' },
    subtitle1: { fontSize: 18 },
    subtitle2: { fontSize: 16 },
    labelSmall: { fontSize: 12 },
  }
}
```

---

## ERROR 2: activeOpacity Not Valid in ViewStyle

**Ubicación:** IMPROVED_CONVERSATION_ITEM.tsx:70

### ❌ Incorrecto:
```typescript
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    activeOpacity: 0.7,  // ❌ No es propiedad de View
  }
})
```

### ✅ Correcto:
```typescript
// En el StyleSheet, quitar activeOpacity
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  }
})

// Luego en el render, usar <TouchableOpacity>:
<TouchableOpacity
  activeOpacity={0.7}
  style={styles.container}
  onPress={() => handlePress()}
>
  {/* contenido */}
</TouchableOpacity>
```

---

## ERROR 3: flexDirection Must Be Literal Type

**Ubicación:** src/components/ChatBubble.tsx:105

### ❌ Incorrecto:
```typescript
const direction = isOwn ? 'row-reverse' : 'row'
// ...
<View style={[
  { flexDirection: direction }  // ❌ direction es string, no literal
]}>
```

### ✅ Correcto:
```typescript
// Opción 1: Usar condicional en styles
<View style={[
  isOwn ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }
]}>

// Opción 2: Type casting
<View style={[
  { flexDirection: (isOwn ? 'row-reverse' : 'row') as const }
]}>

// Opción 3: Usar StyleSheet.create
const styles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
  rowNormal: { flexDirection: 'row' }
})

<View style={isOwn ? styles.rowReverse : styles.rowNormal}>
```

---

## ERROR 4: stopAsync() Doesn't Exist in Recording

**Ubicación:** src/hooks/useAudioRecorder.ts:49, 50, 79, 80

### ❌ Incorrecto:
```typescript
// expo-av version antigua
const status = await recording.stopAsync()
```

### ✅ Correcto:
```typescript
// Revisar versión de expo-av
npm list expo-av

// Actualizar si es necesario
npm update expo-av

// Usar método correcto según versión:
// Opción 1: stop() (más nuevo)
const status = await recording.stopAsync()

// Opción 2: pauseAsync() (alternativa)
await recording.pauseAsync()
const status = await recording.getStatusAsync()

// Opción 3: Esperar a completarse
await recording.finishRecordingAsync()
const uri = recording.getURI()
```

**Código actualizado:**
```typescript
// src/hooks/useAudioRecorder.ts
export const useAudioRecorder = () => {
  const stopRecording = async () => {
    if (!recordingRef.current) return

    try {
      // Use finishRecordingAsync (más confiable)
      await recordingRef.current.finishRecordingAsync()
      const uri = recordingRef.current.getURI()
      return uri
    } catch (error) {
      console.error('Error stopping recording:', error)
      throw error
    }
  }
}
```

---

## ERROR 5: Missing Theme Properties

**Ubicación:** Multiple screens (AvailableRidesScreen.tsx, etc)

### ❌ Incorrecto:
```typescript
const colors = useTheme().colors
color: colors.secondary  // ❌ no existe
color: colors.text       // ❌ no existe
color: colors.dark       // ❌ no existe
```

### ✅ Correcto:

```typescript
// Actualizar src/theme/theme.ts:
export const lightTheme = {
  colors: {
    // Colores primarios
    primary: '#0040A1',
    primaryLight: '#4A7FDB',
    primaryDark: '#001F5C',
    primaryDarkest: '#000B28',
    
    // Colores secundarios
    secondary: '#6B7280',        // ← Agregar
    secondaryLight: '#D1D5DB',
    secondaryDark: '#374151',
    
    // Colores de texto
    text: '#1F2937',             // ← Agregar
    textLight: '#6B7280',
    textDark: '#111827',
    dark: '#111827',             // ← Agregar
    
    // Colores de estado
    accent: '#FF6B6B',
    accentLight: '#FFA8A8',
    accentDark: '#E63946',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    
    // Colores de fondo
    background: '#FFFFFF',
    backgroundAlt: '#F9FAFB',
    
    // Bordes
    border: '#E5E7EB',
    divider: '#D1D5DB',
    
    // Gradientes
    gradient3D1: '#0040A1',
    gradient3D2: '#4A7FDB',
    gradient3D3: '#8BA5E8',
  },
  
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
    h4: { fontSize: 20, fontWeight: 'bold', lineHeight: 28 },
    
    body: { fontSize: 16, lineHeight: 24 },
    body2: { fontSize: 14, lineHeight: 20 },       // ← Agregar
    
    caption: { fontSize: 12, lineHeight: 16 },     // ← Agregar
    button: { fontSize: 16, fontWeight: '600' },   // ← Agregar
    
    subtitle1: { fontSize: 18, fontWeight: '500' }, // ← Agregar
    subtitle2: { fontSize: 16, fontWeight: '500' }, // ← Agregar
    labelSmall: { fontSize: 12, fontWeight: '500' }, // ← Agregar
    
    semibold: { fontWeight: '600' },
  }
}
```

---

## ERROR 6: Invalid Icon Name

**Ubicación:** 
- ActiveTripsScreen.tsx:310 (chair-outline)
- ContactRequestsScreen.tsx:105 (inbox-outline)
- OfflineBanner.tsx:28 (wifi-off)

### ❌ Incorrecto:
```typescript
import Icon from '@expo/vector-icons/MaterialCommunityIcons'

// ❌ Iconos que no existen
<Icon name="chair-outline" />
<Icon name="inbox-outline" />
<Icon name="wifi-off" />
```

### ✅ Correcto:
```typescript
// Revisar nombre correcto en:
// https://expo.dev/tools/icons

// Reemplazar con equivalentes válidos:
<Icon name="chair" />              // ✅ Chair existe
<Icon name="email-outline" />      // ✅ Para inbox
<Icon name="wifi-off" />           // ✅ Este sí existe

// O usar alternativas:
<Icon name="car-outline" />        // ← Recomendado para trips
<Icon name="message-outline" />    // ← Para contact requests
<Icon name="signal-cellular-off" /> // ← Para offline
```

---

## ERROR 7: animationEnabled Not Valid in NavigationOptions

**Ubicación:** src/navigation/AppNavigator.tsx:125, 193

### ❌ Incorrecto:
```typescript
<Stack.Screen
  name="VerifyEmail"
  component={VerifyEmailScreen}
  options={{
    animationEnabled: false,  // ❌ No válido en React Navigation v6
  }}
/>
```

### ✅ Correcto:
```typescript
// En React Navigation v6+, usar 'animationEnabled' en navigator props
// No en screen options

// Opción 1: En el Screen
<Stack.Screen
  name="VerifyEmail"
  component={VerifyEmailScreen}
  options={{
    // Quitar animationEnabled
    headerShown: true,
    animationTypeForReplace: false,  // ← Alternativa
  }}
/>

// Opción 2: En el Navigator
<Stack.Navigator
  screenOptions={{
    animationEnabled: false,  // ✅ Aquí sí funciona
  }}
>
```

---

## ERROR 8: Cannot Find Property 'name' on type 'User'

**Ubicación:** src/screens/ChatScreen.tsx:311

### ❌ Incorrecto:
```typescript
// User type no tiene 'name'
const userName = currentUser.name  // ❌ Property 'name' doesn't exist
```

### ✅ Correcto:
```typescript
// Opción 1: Actualizar User type
interface User {
  id: string
  email: string
  name: string      // ← Agregar
  avatar?: string
}

// Opción 2: Usar propiedades que existen
const userName = currentUser.email.split('@')[0]

// Opción 3: Obtener de perfil
const profile = await getProfile(currentUser.id)
const userName = profile.full_name
```

---

## ERROR 9: String Cannot Be Assigned to String[]

**Ubicación:** src/screens/ChatScreen.tsx:286

### ❌ Incorrecto:
```typescript
const loadMessages = (conversationId: string) => {
  // Función espera array pero recibe string
  fetchMessages(conversationId)  // ❌ conversationId es string
}

// En la función:
const fetchMessages = (conversationIds: string[]) => {
  // Espera array
}
```

### ✅ Correcto:
```typescript
// Opción 1: Pasar array
const loadMessages = (conversationId: string) => {
  fetchMessages([conversationId])  // ✅ Envuelto en array
}

// Opción 2: Cambiar signature de función
const fetchMessages = (conversationId: string | string[]) => {
  const ids = Array.isArray(conversationId) ? conversationId : [conversationId]
  // ...
}

// Opción 3: Usar overloads
function fetchMessages(id: string): Promise<Message[]>
function fetchMessages(ids: string[]): Promise<Message[]>
function fetchMessages(input: string | string[]) {
  const ids = Array.isArray(input) ? input : [input]
  // ...
}
```

---

## ERROR 10: Property 'id' Does Not Exist on string

**Ubicación:** src/screens/ChatScreen.tsx:1124

### ❌ Incorrecto:
```typescript
const messages: string[] = []

// Luego intenta acceder a .id
messages.map(msg => msg.id)  // ❌ string no tiene 'id'
```

### ✅ Correcto:
```typescript
interface Message {
  id: string
  text: string
  userId: string
  createdAt: Date
}

const messages: Message[] = []

// Ahora sí
messages.map(msg => msg.id)  // ✅ OK
```

---

## RESUMEN: Orden de Fixes

```
1. Eliminar o completar IMPROVED_* components (2h)
2. Actualizar src/theme/theme.ts (2h)
3. Fijar tipos en ChatBubble (2h)
4. Actualizar User type y interfaces (2h)
5. Fijar useAudioRecorder (2h)
6. Fijar NavigationOptions (1h)
7. Reemplazar icons incorrectos (1h)

TOTAL: 12 horas = 1.5 días de trabajo

Después: `npx tsc --noEmit` debería estar limpio ✅
```

---

## Script Automático de Búsqueda de Errores

```bash
# Buscar todos los archivos con problemas
grep -r "IMPROVED_" src/                    # Componentes deprecated
grep -r "activeOpacity" src/                # Props inválidas
grep -r "animationEnabled" src/             # Options inválidas
grep -r "wifi-off" src/                     # Icons inválidos
grep -r "chair-outline" src/                # Icons inválidos
grep -r "inbox-outline" src/                # Icons inválidos

# Contar errores
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

---

## Verificación Final

```bash
# Después de fijar todos los errores:

# 1. TypeScript debe compilar limpio
npx tsc --noEmit

# 2. Lint check
npx eslint src/ --max-warnings 0

# 3. Build test
npm start -- --clear

# Si todo pasa: ✅ LISTO para siguientes fases
```

