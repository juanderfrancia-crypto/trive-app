# 🎯 RESUMEN EJECUTIVO - TRIVE-APP (Quick Reference)

## EN UNA LÍNEA
**App de ride-sharing React Native que conecta pasajeros con conductores** en Colombia. Dos roles completamente independientes con chat integrado, sistema de calificaciones y gestión de pagos.

---

## 📊 ESTADÍSTICAS RÁPIDAS

| Métrica | Valor |
|---------|-------|
| **Pantallas** | 40+ |
| **Hooks personalizados** | 15+ |
| **Servicios** | 17 |
| **Errores TypeScript** | 0 ✅ |
| **Componentes UI** | 20+ |
| **Líneas de código** | ~50,000+ |
| **Stack** | React Native + Expo + TypeScript |
| **Estado de usuario** | Zustand + AsyncStorage |

---

## 🏃 FLUJOS MÁS IMPORTANTES (En orden de uso)

```
👤 PASAJERO                           🚗 CONDUCTOR
├─ Login/Register                     ├─ Login/Register
├─ HomeScreen                         ├─ HomeScreen
├─ Buscar rutas (SearchScreen)        ├─ Crear ruta (DriverRegisterScreen)
├─ Seleccionar asientos               ├─ Ver pasajeros en tiempo real
├─ Confirmar + Pagar                  ├─ Actualizar estado viaje
├─ Ver estado del viaje                ├─ Chat con pasajeros
├─ Chat con conductor                 ├─ Ver ganancias
└─ Calificar al conductor             └─ Ver historial de viajes
```

---

## 🔑 CONCEPTOS CLAVE

### Tabla de Datos Central
```
┌─────────────┐       ┌──────────┐       ┌──────────┐
│   ROUTES    │──────│ BOOKINGS │──────│ PROFILES │
│ (Viajes)    │       │(Reservas)│       │ (Usuarios)
└─────────────┘       └──────────┘       └──────────┘
      │                      │                  │
      ├─ driver_id ────────  │                  │
      └─ origin             │                  │
         destination        │                  ├─ name
         departure_time     │                  ├─ phone
         price_per_seat ────┤─ passenger_id ───┤
         total_seats        │                  ├─ role (passenger|driver)
         vehicle_type       │                  └─ avatar_url
                            │
                            ├─ route_id (→ ROUTES)
                            ├─ seat_number
                            ├─ payment_status
                            └─ booking_status
```

### Estados de Booking
```
pending ──→ confirmed ──→ active ──→ completed
  ↑ (Esperando pago)       ↑ (Viaje en curso)
  │                        │
  └────── cancelled ← ─ ← ─ ┘
```

### Estados de Ruta
```
scheduled ──→ in_progress ──→ completed
                   ↑
                   └── cancelled
```

---

## 🎬 ESCENAS COMUNES

### Escena 1: Pasajero Busca Viaje
```
HomeScreen
   │
   ├─ Escribe origen: "Armenia"
   ├─ Escribe destino: "Cali"
   └─ Presiona "Buscar"
          │
          ▼
    SearchScreen (fetchRoutes)
    └─ Muestra lista de rutas disponibles
          │
          ▼
    Usuario selecciona una
          │
          ▼
    SeatSelectionScreen
    └─ Grid de asientos
          │
          ▼
    Usuario selecciona asientos
          │
          ▼
    BookingScreen
    └─ Desglose de costos
          │
          ▼
    "Confirmar y Pagar"
          │
          ▼
    ✅ Booking creado
          │
          ▼
    TripStatusScreen (espera viaje)
```

### Escena 2: Chat en Vivo
```
TripStatusScreen
   │
   ├─ Presiona ícono "Chat"
   │
   ▼
ChatScreen
   │
   ├─ Carga conversación existente
   │
   ▼
MessageInput
   │
   ├─ User escribe mensaje
   ├─ Presiona envío
   │
   ▼
sendMessage()
   │
   ├─ Inserta en BD
   ├─ Notificación push
   │
   ▼
Aparece en chat
```

---

## 🛠️ SERVICIOS CRÍTICOS

### 1. useAuth.ts
```typescript
signInWithOtp(phone)          // OTP por SMS
verifyOTP(phone, token)       // Verifica OTP
login(email, password)        // Email + contraseña
signUp(email, password)       // Registro nuevo
logout()                      // Cierra sesión
restoreSession()              // Restaura de AsyncStorage
```

### 2. useRoutes.ts
```typescript
fetchRoutes(origin?, dest?, type?, sortBy?, limit?) // Buscar
createRoute(routeData)                              // Crear
getRouteById(routeId)                               // Detalles
```

### 3. useBookings.ts
```typescript
createBooking(routeId, passengerId, seatNum, price) // Una reserva
reservePendingBookings(routeId, seats, price)       // Múltiples (pending)
finalizePendingBookings(bookingIds, paymentMethod)  // Confirmar pago (RPC)
cancelBooking(bookingId)                            // Cancelar
```

### 4. useChat.ts
```typescript
loadConversation(otherUserId)  // Cargar mensajes
send(text)                     // Enviar mensaje
sendAudioMessage(audioUri)     // Enviar audio
deleteConversation(userId)     // Eliminar chat
```

### 5. useNotifications.ts
```typescript
fetchNotifications()     // Obtener todas
markAsRead(notifId)      // Marcar como leída
markAllAsRead()          // Marcar todas
```

---

## 📱 PANTALLAS PRINCIPALES (TOP 15)

| Screen | Rol | Propósito |
|--------|-----|-----------|
| `HomeScreen` | Ambos | Dashboard principal |
| `SearchScreen` | Pasajero | Buscar rutas disponibles |
| `SeatSelectionScreen` | Pasajero | Seleccionar asientos |
| `BookingScreen` | Pasajero | Confirmar reserva |
| `TripStatusScreen` | Pasajero | Ver estado del viaje |
| `ChatScreen` | Ambos | Chat bidireccional |
| `DriverRegisterScreen` | Conductor | Crear nueva ruta |
| `DriverPanelScreen` | Conductor | Control de viaje en vivo |
| `ProfileScreen` | Ambos | Perfil e información personal |
| `SettingsScreen` | Ambos | Configuración general |
| `NotificationsScreen` | Ambos | Notificaciones en vivo |
| `AdminDashboardScreen` | Admin | Gestión de documentos |
| `DriverDocumentsScreen` | Conductor | Subir documentos |
| `EarningsScreen` | Conductor | Ver ganancias |
| `LoginScreen` | Ambos | Autenticación |

---

## 🎨 DISEÑO (Tema)

```
PRIMARY (Azul Tech)      → #154AA8  (Botones, headers)
PRIMARY LIGHT            → #2E5FBF  (Hover states)
ACCENT                   → #2E7DC0  (Acentos)
SUCCESS                  → #10B981  (✓ Confirmaciones)
ERROR                    → #EF4444  (❌ Errores)
BACKGROUND              → #FAFAFA  (Fondos)
TEXT PRIMARY            → #0F0F0F  (Negro profundo)
TEXT SECONDARY          → #5A5A5A  (Gris)
```

---

## 🔐 SEGURIDAD EN CAPAS

```
Capa 1: Autenticación
├─ OTP por SMS (Supabase Auth)
├─ Email/Password
└─ Tokens JWT con expiración

Capa 2: Row-Level Security (RLS)
├─ Usuarios ven solo sus mensajes
├─ Conductores ven solo sus documentos
└─ Admin ve lo que necesita

Capa 3: Validación
├─ Cliente (React): Tipos, rangos
└─ Servidor (Supabase): Funciones SQL

Capa 4: Almacenamiento
├─ Fotos de perfil: Públicas
├─ Documentos: Privados
└─ Archivos: Encriptados en transit
```

---

## ⚡ PERFORMANCE INSIGHTS

| Aspecto | Status | Notas |
|---------|--------|-------|
| Compilación TypeScript | ✅ Limpia | Sin errores |
| Bundle Size | ✅ OK | ~5-7MB apk |
| Startup Time | ✅ <3s | Session restore rápido |
| Lista Rutas (100 items) | ✅ Smooth | FlatList virtualized |
| Chat (1000+ mensajes) | ⚠️ Mejora | Cambiar a WebSocket |
| Imágenes | ⚠️ Mejorar | Comprimir before upload |

---

## 🚀 DEPLOYMENT STATUS

### Ambiente
```
Development:  Local dev server (Expo Go)
Staging:      Compiled APK/IPA
Production:   EAS Build (Expo Application Services)
```

### Build
```
Android:  expo run:android (local) o eas build --platform android
iOS:      expo run:ios (local) o eas build --platform ios
Web:      expo start --web
```

### Database
```
Supabase Project: iksenkkaxlmdiyeezoym
Conexión: supabase.ts configurado
Auth: Funcionando
Storage: Funcionando
RLS: Configurado
```

---

## 🐛 KNOWN ISSUES & WORKAROUNDS

### Issue 1: Chat lento con muchos mensajes
**Causa:** Polling cada 2 segundos  
**Workaround:** Limitar a últimos 100 mensajes  
**Solución:** Migrar a Supabase Realtime  

### Issue 2: Sentry deshabilitado
**Causa:** Incompatibilidad con Metro/Expo  
**Workaround:** Logs manuales en consola  
**Solución:** Esperar sentry-expo actualización  

### Issue 3: Pagos sin integración Stripe
**Causa:** API aún no conectada  
**Workaround:** Pagos en efectivo funcionan  
**Solución:** Implementar stripe-react-native  

---

## 📚 ESTRUCTURA RÁPIDA

```
src/
├── components/       → UI reutilizable (botones, inputs, etc)
├── screens/         → Pantallas (40+)
├── hooks/           → Lógica personalizada (15+)
├── services/        → API calls (17)
├── store/           → Zustand global state
├── theme/           → Colores y tipografía
├── utils/           → Helpers (validaciones, etc)
└── navigation/      → Estructura de navegación

app.json            → Config de Expo
package.json        → Dependencias
tsconfig.json       → Config TypeScript
tailwind.config.js  → Estilos (si aplica)
```

---

## 🎓 QUICK START PARA NUEVOS DEVS

### 1. Entender autenticación
```
Abre: src/hooks/useAuth.ts
Lee: Cómo funciona OTP + email/password
```

### 2. Entender bookings
```
Abre: src/hooks/useBookings.ts
Lee: Cómo create, reserve, finalize funcionan
```

### 3. Entender chat
```
Abre: src/hooks/useChat.ts
Lee: Polling (puede mejorar a WebSocket)
```

### 4. Entender estado global
```
Abre: src/store/useAppStore.ts
Lee: Zustand patterns + AsyncStorage persistence
```

### 5. Explorar un screen completo
```
Abre: src/screens/HomeScreen.tsx
Lee: Cómo usa hooks y componentes juntos
```

---

## 💡 PUNTOS A RECORDAR

✅ **Siempre** validar data en cliente y servidor  
✅ **Siempre** usar try-catch en llamadas async  
✅ **Siempre** mostrar loading states  
✅ **Siempre** usar TypeScript (no any)  
✅ **Siempre** cachear queries cuando sea posible  

❌ **Nunca** almacenar tokens en estado global sin persistencia  
❌ **Nunca** hacer queries N+1 en bucles  
❌ **Nunca** ignorar errores de autenticación  
❌ **Nunca** subir archivos sin validación  
❌ **Nunca** hacer transacciones sin atomicidad  

---

## 📞 RESOURCES

- **Código principal:** [App.tsx](./App.tsx)
- **Navegación:** [src/navigation/AppNavigator.tsx](./src/navigation/AppNavigator.tsx)
- **Análisis detallado:** [ANALISIS_COMPLETO_CODEBASE.md](./ANALISIS_COMPLETO_CODEBASE.md)
- **Docs de Supabase:** https://supabase.com/docs
- **React Native:** https://reactnative.dev/

---

**Fecha:** 20 de abril de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ PROD READY (con mejoras recomendadas)
