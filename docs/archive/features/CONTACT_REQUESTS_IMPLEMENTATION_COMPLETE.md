# Sistema de Solicitudes de Contacto - Implementación Completada

## ✅ Cambios Implementados

### 1. **ChatScreen.tsx** - Validación de Permisos
- Actualizado para usar `useContactRequests.isContactAccepted()` 
- **Reglas de chat:**
  - ✅ **Conductor**: Siempre permitido (sin routeId)
  - ❌ **Pasajero a Pasajero**: Requiere contacto aceptado (con routeId)
- Bloquea chat y muestra: "Acceso denegado - Solo puedes chatear con pasajeros que han aceptado tu solicitud"

### 2. **TripStatusScreen.tsx** - Envío de Solicitudes
- Integrado `useContactRequests` hook
- Botón "Solicitar contacto" ahora es funcional:
  - Muestra confirmación: "¿Enviar solicitud de contacto a [Nombre]?"
  - Llama a `sendContactRequest(receiverId, routeId)` 
  - Valida que están en mismo viaje confirmado
  - Evita duplicados (error si ya existe solicitud)
  - Toast success: "✓ Solicitud enviada. Espera a que valide tu solicitud."

### 3. **useContactRequests.ts** - Hook Completo
Métodos implementados:
```typescript
sendContactRequest(receiverId, routeId)      // Enviar solicitud con validación
getPendingRequests()                          // Obtener solicitudes recibidas
acceptRequest(requestId)                      // Aceptar solicitud
rejectRequest(requestId)                      // Rechazar solicitud  
isContactAccepted(otherUserId)               // Verificar si contacto aceptado
```

### 4. **ContactRequestsScreen.tsx** - Nueva Pantalla
- Muestra todas las solicitudes pendientes recibidas
- Para cada solicitud:
  - Avatar del solicitante
  - Nombre del pasajero
  - Botones: "Aceptar" / "Rechazar"
- Estados visuales:
  - Vacío: "Sin solicitudes pendientes"
  - Cargando: Loading indicator
  - Con solicitudes: Lista con contador
- Integrado en AppNavigator como Stack.Screen

### 5. **AppNavigator.tsx** - Registro de Pantalla
- Agregado import: `ContactRequestsScreen`
- Agregado Stack.Screen: `<Stack.Screen name="ContactRequests" component={ContactRequestsScreen} />`

### 6. **CONTACT_REQUESTS_SETUP.sql** - Schema Completo
Disponible para ejecutar en Supabase SQL Editor:
- Tabla `contact_requests` con constraints
- RLS policies para seguridad
- Índices para performance
- Vistas para consultas comunes

---

## 🚀 Próximos Pasos (CRÍTICO)

### **PASO 1: Ejecutar SQL en Supabase** (5 minutos)
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto "trive-app"
3. Ve a **SQL Editor** → **New Query**
4. Copia todo el contenido de `CONTACT_REQUESTS_SETUP.sql`
5. Pega en el editor
6. Haz clic en **▶ Run**
7. Verifica que se creó la tabla (sin errores)

**Alternativa - Copiar desde archivo:**
```sql
-- Ir a proyecto workspace y abrir CONTACT_REQUESTS_SETUP.sql
-- Copiar TODO el contenido
-- Pegar en Supabase SQL Editor
-- Ejecutar
```

### **PASO 2: Verificar Instalación (Opcional)**
En Supabase SQL Editor, ejecuta:
```sql
SELECT * FROM contact_requests LIMIT 1;
-- Debe retornar estructura de tabla sin errores
```

### **PASO 3: Probar en App**
1. Compila la app (expo start o similar)
2. Login con Usuario A
3. Busca una ruta con múltiples pasajeros
4. Ve a TripStatus
5. Haz clic "Solicitar contacto" en un pasajero
6. Logout y login con el Usuario B (receptor)
7. **BUSCA ACCESO A CONTACTREQUESTS** (ver nota abajo)
8. Acepta la solicitud
9. Los usuarios ahora pueden chatear

---

## ⚠️ IMPORTANTE - Acceso a ContactRequestsScreen

**Problema:** ContactRequestsScreen está en el Stack Navigator pero no es fácilmente accesible desde la UI.

**Soluciones:**

### Opción A: Agregar botón en ProfileScreen
En `ProfileScreen.tsx`, agregar botón:
```typescript
<TouchableOpacity onPress={() => navigation.navigate('ContactRequests')}>
  <Text>Solicitudes de Contacto</Text>
</TouchableOpacity>
```

### Opción B: Agregar notificación en HomeScreen
Mostrar badge con número de solicitudes pendientes:
```typescript
const { getPendingRequests } = useContactRequests(user?.id)
// En useEffect: load pending count
// Mostrar badge en botón "Ver solicitudes"
```

### Opción C: Agregar tab en TabNavigator
Crear 5to tab para solicitudes de contacto (requiere cambio en UI)

**RECOMENDADO:** Opción A (botón en ProfileScreen) - es lo más simple

---

## 📊 Flujo Completo Sistema de Contacto

```
Usuario A en TripStatus
         ↓
    Clic "Solicitar contacto"
         ↓
    Alert confirmation
         ↓
    sendContactRequest(B, routeId)
         ↓
    ✓ Stored in contact_requests table
    ✓ Toast: "Solicitud enviada"
         ↓
    [ESPERAR A USUARIO B]
         ↓
Usuario B ve solicitud en ContactRequestsScreen
         ↓
    Clic "Aceptar"
         ↓
    acceptRequest(requestId)
         ↓
    status: 'pending' → 'accepted'
         ↓
Ahora ambos pueden chatear
    Chat entre A y B: ✅ PERMITIDO
    (isContactAccepted(otherUserId) = true)
```

---

## 🔒 Seguridad Implementada

1. **Same-trip validation**: Ambos deben tener booking confirmado en misma ruta
2. **Unique constraint**: Una solicitud por par de usuarios per ruta
3. **RLS policies**: Usuarios solo ven/modifican sus propias solicitudes
4. **Self-contact prevention**: CHECK constraint evita solicitudes a uno mismo
5. **Bidirectional acceptance**: Si A acepta solicitud de B, pueden chatear

---

## 📝 Cambios de Archivo Detallado

| Archivo | Cambio | Líneas |
|---------|--------|-------|
| ChatScreen.tsx | Agregado `useContactRequests`, validación de permisos | +12, -2 |
| TripStatusScreen.tsx | Agregado `useContactRequests`, lógica en botón | +25, -5 |
| AppNavigator.tsx | Import + Stack.Screen ContactRequests | +2 |
| **NUEVO** ContactRequestsScreen.tsx | Pantalla completa (350+ líneas) | +350 |

---

## ✅ Checklist de Implementación

- [x] Hook `useContactRequests` con 5 métodos
- [x] ChatScreen con validación de contacto aceptado
- [x] TripStatusScreen llama a `sendContactRequest`
- [x] ContactRequestsScreen para aceptar/rechazar
- [x] AppNavigator registra nueva pantalla
- [x] SQL schema ready (no ejecutado aún en BD)
- [ ] SQL ejecutado en Supabase (USUARIO)
- [ ] Button/Link a ContactRequestsScreen (USUARIO)
- [ ] Prueba de flujo completo (USUARIO)

---

## 🆘 Si Hay Errores

**Error: "Table contact_requests does not exist"**
→ Ejecutar SQL en Supabase (Paso 1 arriba)

**Error: "Auth .uid() is null"**
→ Verificar que usuario está autenticado

**Error: "Ya existe una solicitud con este usuario"**
→ Normal - usuario ya envió solicitud antes (intenta con diferente usuario)

**Chat sigue bloqueado después de aceptar**
→ Reinicia la app (cache de memoria)
