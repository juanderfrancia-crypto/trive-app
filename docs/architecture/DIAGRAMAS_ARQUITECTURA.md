# 🏗️ DIAGRAMAS DE ARQUITECTURA - TRIVE-APP

## 1. ARQUITECTURA GENERAL (Alto Nivel)

```
┌────────────────────────────────────────────────────────────────────┐
│                       TRIVE MOBILE APP                              │
│                    (React Native + Expo)                            │
└────────────────────────────────────────────────────────────────────┘
         │                                              │
         │                                              │
    ┌────▼─────────────────────────────────────────────▼────┐
    │          NAVEGACIÓN PRINCIPAL (AppNavigator)          │
    │  Stack + Tabs (Bottom) + Drawer (Menu lateral)       │
    └────┬──────────────────────────────┬──────────────────┘
         │                              │
    ┌────▼────────────────────┐   ┌────▼─────────────────┐
    │    PANTALLAS (40+)      │   │  COMPONENTES (20+)   │
    │                         │   │                      │
    │ • HomeScreen            │   │ • ChatBubble         │
    │ • SearchScreen          │   │ • SearchBar          │
    │ • SeatSelectionScreen   │   │ • RatingStars        │
    │ • BookingScreen         │   │ • MessageInput       │
    │ • TripStatusScreen      │   │ • Toast              │
    │ • ChatScreen            │   │ • OfflineBanner      │
    │ • DriverRegisterScreen  │   │ • ErrorBoundary      │
    │ • DriverPanelScreen     │   │ ... más              │
    │ • ProfileScreen         │   │                      │
    │ • AdminDashboardScreen  │   │                      │
    │ ... y 30 más ...        │   │                      │
    └────────────────────────┘   └──────────────────────┘
         │
         │
    ┌────▼──────────────────────────────────────────────────┐
    │         HOOKS (Lógica de negocio)                     │
    │                                                        │
    │  • useAuth                 • useBookings              │
    │  • useRoutes               • useChat                  │
    │  • useNotifications        • useProfile               │
    │  • usePushNotifications    • useUserLocation          │
    │  • useAvailableRides       • useRatingAnalytics       │
    │  • useFavoriteRoutes       • useNetworkStatus         │
    │  • useCancellationHistory  ... más                    │
    └────┬──────────────────────────────────────────────────┘
         │
         │
    ┌────▼──────────────────────────────────────────────────┐
    │         SERVICIOS (API + Helpers)                     │
    │                                                        │
    │  • supabase.ts             • messages.ts              │
    │  • pushNotifications.ts     • driverDocuments.ts       │
    │  • driverApproval.ts        • photoUpload.ts          │
    │  • errorHandler.ts          • analytics.ts            │
    │  • biometricAuth.ts         • notificationPrefs.ts    │
    │  • activityLogger.ts        ... más                   │
    └────┬──────────────────────────────────────────────────┘
         │
         │
    ┌────▼──────────────────────────────────────────────────┐
    │         ESTADO GLOBAL (Zustand Store)                 │
    │                                                        │
    │  • user / authUser         • balance                  │
    │  • selectedRoute           • bookingData              │
    │  • selectedSeat            • hasSeenOnboarding        │
    │  • notificationUnreadCount • ... más                  │
    │                                                        │
    │  Persistencia: AsyncStorage                           │
    └────┬──────────────────────────────────────────────────┘
         │
         │
    ┌────▼──────────────────────────────────────────────────┐
    │         SUPABASE (Backend)                            │
    │                                                        │
    │  • PostgreSQL Database                                │
    │  • Authentication (OTP + Email)                       │
    │  • Storage (Fotos, Documentos)                        │
    │  • Real-time Subscriptions                            │
    │  • Row-Level Security (RLS)                           │
    └────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────────┐
│              Usuario Abre App                        │
│                    │                                 │
│                    ▼                                 │
│        ¿Existe sesión en AsyncStorage?             │
│         │                        │                  │
│       SÍ ▼                        ▼ NO              │
│    ┌────────────┐          ┌──────────────┐       │
│    │ Restaurar  │          │  LoginScreen │       │
│    │  sesión   │          │              │       │
│    └────┬───────┘          │ • Email/pass │       │
│         │                  │ • OTP SMS    │       │
│         │                  └────┬─────────┘       │
│         │                       │                  │
│         │    ┌──────────────────┘                  │
│         │    │                                     │
│         ▼    ▼                                     │
│    useAuth.restoreSession()                       │
│         │                                         │
│         ▼                                         │
│    supabase.auth.getSession()                    │
│         │                                         │
│         ├─ Valid? ──▶ YES: Cargar perfil        │
│         │              │                         │
│         │              ▼                         │
│         │         profiles table                  │
│         │              │                         │
│         │              ▼                         │
│         │         setUser() + setAuthUser()      │
│         │              │                         │
│         │              ▼                         │
│         │         ✅ HomeScreen                  │
│         │                                        │
│         └─ Invalid? ──▶ NO: LoginScreen         │
│                           │                     │
│                           ▼                     │
│                      🔴 Error Toast             │
└─────────────────────────────────────────────────────┘
```

---

## 3. FLUJO DE RESERVA (BOOKING)

```
┌───────────────────────────────────────────────────────────┐
│              HomeScreen                                    │
│         (Usuario es Pasajero)                             │
└──────────────┬────────────────────────────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Ingresa:         │
        │ • Origen        │
        │ • Destino       │
        └────┬─────────────┘
             │
             ▼
      fetchRoutes()
      (useRoutes hook)
             │
             ▼
      Supabase Query:
      SELECT * FROM routes
      WHERE status = 'scheduled'
      AND origin LIKE %...%
      AND destination LIKE %...%
      AND departure_time > NOW()
             │
             ▼
      ┌──────────────────┐
      │ SearchScreen     │
      │ (Lista de rutas) │
      └────┬─────────────┘
           │
           ▼
    Usuario selecciona
    una ruta
           │
           ▼
    setSelectedRoute(route)
    ──────────────────────
    (Guard en store)
           │
           ▼
    ┌──────────────────────┐
    │ SeatSelectionScreen  │
    │                      │
    │ getRouteBookings()   │
    │ (obtener ocupados)   │
    └────┬────────────────┘
         │
         ▼
    Mostrar GRID de asientos
    (Ocupados = ROJO, Libre = VERDE)
         │
         ▼
    Usuario toca asientos
    (puede seleccionar múltiples)
         │
         ▼
    Presiona "Confirmar"
         │
         ▼
    ┌──────────────────────────┐
    │ BookingScreen            │
    │                          │
    │ Desglose:                │
    │ • Precio × Asientos      │
    │ • Impuestos              │
    │ • Total                  │
    │                          │
    │ Método de pago:          │
    │ • Efectivo               │
    │ • Tarjeta (ready)        │
    │                          │
    │ Drop-off (opcional)      │
    └────┬──────────────────────┘
         │
         ▼
    Presiona "Confirmar y Pagar"
         │
         ▼
    reservePendingBookings()
    ────────────────────────
    [INSERT into bookings]
    • booking_status = 'pending'
    • payment_status = 'pending'
    (x cantidad de asientos)
         │
         ▼
    finalizePendingBookings()
    ─────────────────────────
    [RPC CALL: finalize_bookings_atomic]
         │
    ┌────┴──────────────────────────┐
    │ Backend (Transacción Atómica): │
    │                                │
    │ 1. Lock row en BD              │
    │ 2. Verifica asientos libre     │
    │ 3. UPDATE bookings:            │
    │    - status = 'confirmed'      │
    │    - payment_status = 'paid'   │
    │ 4. UPDATE routes:              │
    │    - available_seats --        │
    │ 5. Unlock row                  │
    │ 6. COMMIT o ROLLBACK           │
    │                                │
    └────┬──────────────────────────┘
         │
         ▼
    ✅ Booking Confirmado
         │
    ┌────┴─────────────────────────┐
    │                               │
    ├─ Toast: "✓ Reserva exitosa"  │
    ├─ setBookingData(booking)     │
    ├─ Send notification           │
    │  to driver (push)            │
    └─ Navigate to               
       TripStatusScreen            
             │
             ▼
      ✅ Usuario ve viaje
         en vivo
```

---

## 4. FLUJO DE CHAT

```
┌────────────────────────────────────────────────┐
│         ChatScreen Loads                        │
│         (useChat hook initializes)              │
└─────────┬──────────────────────────────────────┘
          │
          ▼
    getChatContactsForUser(userId)
    ─────────────────────────────
    FOR PASSENGERS:
      1. SELECT routes WHERE passenger_id = ?
      2. SELECT drivers from those routes
      3. Get driver profiles
         
    FOR DRIVERS:
      1. SELECT routes WHERE driver_id = ?
      2. SELECT passengers from those routes
      3. Get passenger profiles
          │
          ├─ Returns: [ChatContact]
          │   • user_id
          │   • name
          │   • relation (driver|passenger)
          │
          ▼
    getConversations(userId)
    ─────────────────────────
    FOR EACH CONTACT:
      • Get last_message
      • Get unread_count
      • Sort by last_message_time DESC
          │
          ├─ Returns: [Conversation]
          │   • other_user_id
          │   • last_message
          │   • unread_count
          │
          ▼
    Display Conversation List
    (polling cada 2 segundos)
          │
          ▼
    User taps conversation
          │
          ▼
    loadConversation(otherUserId)
    ─────────────────────────────
    SELECT * FROM messages
    WHERE (from_user_id = me AND to_user_id = other)
    OR (from_user_id = other AND to_user_id = me)
    ORDER BY created_at ASC
          │
          ▼
    Display conversation
    with ChatBubbles
    (polling cada 2 seg)
          │
          ▼
    ┌─────────────────────────┐
    │ User writes message     │
    │                         │
    │ [Text input field]      │
    │        OR               │
    │ [Mic button] → audio    │
    │        ↓                │
    │    [Send button]        │
    └────┬────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ sendMessage() / Audio      │
    │                            │
    │ INSERT into messages:      │
    │ • from_user_id            │
    │ • to_user_id              │
    │ • message text            │
    │ • message_type (text|audio)
    │ • is_read = false         │
    │ • created_at = NOW()      │
    │                            │
    │ IF audio:                  │
    │ • Upload to Storage       │
    │ • Set audio_url          │
    │                            │
    └────┬──────────────────────┘
         │
         ▼
    Recipient gets
    PUSH NOTIFICATION
    (sendPushNotificationToUser)
         │
         ▼
    ┌────────────────────────┐
    │ Advanced Features:      │
    │                         │
    │ Reply to message        │
    │ ├─ reply_to_id         │
    │ ├─ Show quoted msg    │
    │                        │
    │ Pin message            │
    │ ├─ is_pinned = true   │
    │ ├─ Show pinned bar    │
    │                        │
    │ Edit message           │
    │ ├─ edited_at           │
    │ ├─ Show "edited" tag   │
    │                        │
    │ React with emoji       │
    │ ├─ emoji_reactions     │
    │ ├─ Show reactions      │
    │                        │
    │ Archive conversation   │
    │ ├─ archived = true     │
    │ ├─ Move to Archives tab│
    │                        │
    │ Mark as read           │
    │ ├─ is_read = true      │
    │ ├─ read_at = NOW()     │
    │                        │
    └────────────────────────┘
```

---

## 5. FLUJO DE CONDUCTOR (DRIVER)

```
┌──────────────────────────────────┐
│    Driver Login                  │
│    role = 'driver'               │
└────────┬──────────────────────────┘
         │
         ▼
    ProfileScreen
    (Driver Menu)
         │
         ▼
    Check: ¿Documentos verificados?
    ──────────────────────────────
    checkDriverApprovalStatus()
         │
    ┌────┴────────────────────────────┐
    │ NO: Mostrar qué docs faltan      │
    │ • Cédula                         │
    │ • Licencia                       │
    │ • SOAT                           │
    │ • Tecnomecánica                  │
    │ • Antecedentes                   │
    │                                  │
    │ → Navigate to DriverDocuments    │
    │   para subir                     │
    │                                  │
    └────────────────────────────────┘
         │
    SÍ ▼
    ┌──────────────────────────┐
    │ DriverRegisterScreen     │
    │                          │
    │ Campos:                  │
    │ • Origen (ciudad)        │
    │ • Zona de salida         │
    │ • Destino (ciudad)       │
    │ • Zona de llegada        │
    │ • Fecha                  │
    │ • Hora de salida         │
    │ • Duración viaje         │
    │ • Tipo vehículo          │
    │ • Total asientos         │
    │ • Precio por asiento     │
    │ • Info vehículo (auto)   │
    │ • Descripción (opt)      │
    │                          │
    └────┬──────────────────────┘
         │
         ▼
    validateForm()
         │
         ├─ Origen? ✓
         ├─ Destino? ✓
         ├─ Duración ≥ 5 min? ✓
         ├─ Asientos válidos? ✓
         ├─ Precio > 0? ✓
         └─ Vehículo registrado? ✓
         │
         ▼
    createRoute()
    ──────────────
    INSERT into routes:
    • driver_id
    • origin, destination
    • departure_time
    • price_per_seat
    • total_seats
    • available_seats = total_seats
    • vehicle_type
    • vehicle_make, model, year, plate
    • status = 'scheduled'
         │
         ▼
    ✅ Ruta Creada
         │
    ┌────┴──────────────────────────┐
    │                                │
    ├─ Toast: "Ruta creada"         │
    ├─ Navigate to DriverPanelScreen│
    │                                │
    └────────────────────────────────┘
         │
         ▼
    ┌───────────────────────────┐
    │ DriverPanelScreen (Vivo)  │
    │                           │
    │ Muestra:                  │
    │ • Pasajeros confirmados   │
    │ • Asientos ocupados       │
    │ • Hora de salida          │
    │ • Origen → Destino        │
    │                           │
    │ Acciones:                 │
    │ • Iniciar Viaje           │
    │ • Viaje Completado        │
    │ • Cancelar (con penalty)  │
    │ • Chat con pasajeros      │
    │                           │
    └────┬──────────────────────┘
         │
         ▼
    Presiona "Iniciar Viaje"
         │
         ▼
    UPDATE routes SET status = 'in_progress'
         │
         ▼
    Send notification to all passengers
    "El conductor está en camino..."
         │
         ▼
    🚗 Viaje en curso
    (puede chatear, ver pasajeros)
         │
         ▼
    Presiona "Viaje Completado"
         │
         ▼
    UPDATE routes SET status = 'completed'
         │
         ▼
    UPDATE wallet_balance
    (Agregar ganancias - comisión)
         │
         ▼
    Send notification to passengers
    "Viaje completado. Por favor, califica."
         │
         ▼
    ✅ Viaje Finalizado
         │
         ▼
    EarningsScreen
    (Ver ganancias totales)
```

---

## 6. ESTRUCTURA DE DATOS CENTRAL

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUTES (Viajes)                           │
├─────────────────────────────────────────────────────────────┤
│ id                PK                                          │
│ driver_id         FK → profiles                              │
│ origin            VARCHAR                                    │
│ destination       VARCHAR                                    │
│ departure_time    TIMESTAMP                                  │
│ arrival_time      TIMESTAMP                                  │
│ price_per_seat    NUMERIC                                    │
│ total_seats       INT                                        │
│ available_seats   INT (calculated)                           │
│ vehicle_type      ENUM (auto|taxi|busetica|buseta)          │
│ vehicle_make      VARCHAR                                    │
│ vehicle_model     VARCHAR                                    │
│ vehicle_year      INT                                        │
│ vehicle_plate     VARCHAR                                    │
│ status            ENUM (scheduled|in_progress|completed)    │
│ created_at        TIMESTAMP                                  │
│ updated_at        TIMESTAMP                                  │
└──────────┬────────────────────────────────────────────────────┘
           │
           │ 1 ── N
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BOOKINGS (Reservas)                       │
├─────────────────────────────────────────────────────────────┤
│ id                PK                                          │
│ route_id          FK → routes                                │
│ passenger_id      FK → profiles                              │
│ seat_number       INT                                        │
│ price             NUMERIC                                    │
│ payment_method    VARCHAR (cash|card)                        │
│ payment_status    ENUM (pending|paid|refunded)              │
│ booking_status    ENUM (pending|confirmed|cancelled)        │
│ dropoff_point     VARCHAR (optional)                         │
│ created_at        TIMESTAMP                                  │
│ updated_at        TIMESTAMP                                  │
└──────────┬────────────────────────────────────────────────────┘
           │
           │ N ── 1
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROFILES (Usuarios)                       │
├─────────────────────────────────────────────────────────────┤
│ id                PK (UUID from Supabase Auth)               │
│ name              VARCHAR                                    │
│ email             VARCHAR UNIQUE                             │
│ phone             VARCHAR                                    │
│ role              ENUM (passenger|driver|support)           │
│ avatar_url        TEXT                                       │
│ rating            NUMERIC (0-5)                              │
│ is_driver_verified BOOLEAN                                   │
│ balance           NUMERIC (wallet balance)                   │
│ membership_type   ENUM (free|basic|premium|vip)             │
│ membership_expiry TIMESTAMP                                  │
│ push_token        VARCHAR (for notifications)               │
│ created_at        TIMESTAMP                                  │
│ updated_at        TIMESTAMP                                  │
└─────────────────────────────────────────────────────────────┘
           │
           │ 1 ── N (many relationships)
           ├──────────────┬──────────────┬──────────────┐
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌─────────────┐
    │ MESSAGES │    │ REVIEWS  │   │ DRIVERS  │   │ NOTIFICATIONS│
    │          │    │          │   │          │   │              │
    │ (Chat)   │    │ (Rating) │   │ (Verif)  │   │ (Notif Push) │
    │          │    │          │   │          │   │              │
    └──────────┘    └──────────┘   └──────────┘   └─────────────┘
```

---

## 7. CICLO DE VIDA DE UNA SESIÓN

```
┌─────────────────────────────────────────────────────────────┐
│           APP STARTUP (App.tsx → AppNavigator)               │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────┐
    │ useAuth hook initializes       │
    │ (en AppNavigator useEffect)    │
    │                                │
    │ Restaurar sesión:              │
    │ 1. supabase.auth.getSession() │
    │ 2. Buscar perfil en BD         │
    │ 3. Cargar en store (Zustand)   │
    └────┬─────────────────────────────┘
         │
         ▼
    ¿Hay sesión válida?
         │
    ┌────┴──────────────────────────┐
    │ SÍ                   NO        │
    ▼                     ▼         │
   ┌────────────┐    ┌──────────────┼─┐
   │ HomeScreen │    │ LoginScreen  │ │
   │ (Usuario   │    │ (Selecciona: │ │
   │  logueado) │    │  Email+Pass  │ │
   │            │    │     o        │ │
   └────────────┘    │   OTP SMS)   │ │
         │           │              │ │
         │           └──────┬───────┘ │
         │                  │         │
         │         ┌────────▼──────┐  │
         │         │ VerifyEmail   │  │
         │         │ Screen (opt)  │  │
         │         └────────┬──────┘  │
         │                  │         │
         │                  ▼         │
         │         ┌──────────────┐   │
         │         │ Register or  │   │
         │         │ Login        │   │
         │         │ Success ✅   │   │
         │         └──────┬───────┘   │
         │                │           │
         ├────────────────┤           │
         │                │           │
         ▼                ▼           │
    ┌──────────────────────────┐     │
    │ Restaurar estado:        │     │
    │ • setUser(profile)       │     │
    │ • setAuthUser(authUser)  │     │
    │ • Cargar notificaciones  │     │
    │ • Cargar preferencias    │     │
    │ • Registrar push token   │     │
    └────┬───────────────────┘      │
         │                          │
         ▼                          │
    ┌──────────────────────────┐    │
    │ USUARIO NAVEGANDO        │    │
    │                          │    │
    │ App en vivo:             │    │
    │ • Busca rutas            │    │
    │ • Reserva viaje          │    │
    │ • Chatea                 │    │
    │ • Ve notificaciones      │    │
    │ • Configura perfil       │    │
    └────────────────────────┘     │
         │                         │
         ▼                         │
    Usuario presiona "Logout"      │
         │                         │
         ▼                         │
    ┌───────────────────────────┐  │
    │ logout() - useAuth.ts     │  │
    │                           │  │
    │ 1. supabase.auth.signOut()│  │
    │ 2. setUser(null)          │  │
    │ 3. setAuthUser(null)      │  │
    │ 4. Limpiar AsyncStorage   │  │
    │ 5. Limpiar notificaciones │  │
    │ 6. Limpiar push token     │  │
    └────┬────────────────────┘   │
         │                        │
         ▼                        │
    ┌──────────────────────────┐  │
    │ LoginScreen (nuevo ciclo)│ │
    └──────────────────────────┘  │
         │                        │
         ▼                        │
    🔄 Loop                        │
                                   │
(* En cualquier momento, si       │
   token expira o hay error       │
   de auth, vuelve a LoginScreen) │
                                   │
└──────────────────────────────────┘
```

---

## 8. INTEGRACIÓN CON SUPABASE (Real-time)

```
┌──────────────────────────────────────────────────┐
│           APP LISTENING TO CHANGES                │
└──────────────┬───────────────────────────────────┘
               │
         ┌─────┴──────────────────────────────────┐
         │                                        │
         ▼                                        ▼
    ┌──────────────────┐              ┌─────────────────────┐
    │ ChatScreen       │              │ TripStatusScreen    │
    │ (useChat)        │              │ (useBookings)       │
    │                  │              │                     │
    │ Polling:         │              │ Polling:            │
    │ • Conversation   │              │ • Bookings de ruta  │
    │   cada 2s        │              │   cada 2s           │
    │ • Mensajes       │              │ • Estado de ruta    │
    │   cada 2s        │              │   cada 2s           │
    └──────────────────┘              └─────────────────────┘
         │                                        │
         │                                        │
         └────────┬─────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │ Supabase API Calls (cada 2 segundos):│
    │                                      │
    │ • SELECT * FROM messages            │
    │ • SELECT * FROM bookings            │
    │ • SELECT * FROM routes              │
    │ • SELECT * FROM notifications       │
    │                                      │
    │ WHERE userId = currentUser           │
    │ ORDER BY created_at DESC            │
    └────────────┬─────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────┐
    │ Supabase Database (Real-time)         │
    │                                       │
    │ PostgreSQL:                           │
    │ • Tablas con datos en vivo            │
    │ • Triggers para notificaciones        │
    │ • Functions (RPC) para operaciones    │
    │ • RLS policies para seguridad         │
    │                                       │
    │ Storage:                              │
    │ • Fotos de perfil                     │
    │ • Documentos de conductores           │
    │ • Audios de mensajes                  │
    └───────────────────────────────────────┘
```

---

## 9. NOTIFICACIONES (Push)

```
┌────────────────────────────────────────────────┐
│       EVENTO EN BD (Supabase)                   │
│                                                │
│ • Nuevo mensaje recibido                       │
│ • Booking confirmado                           │
│ • Viaje iniciado                               │
│ • Conductor llegó                              │
│ • Viaje completado                             │
│ • Rating pendiente                             │
└────────┬────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ Supabase Webhook / Trigger       │
    │                                  │
    │ INSERT INTO notifications        │
    │ (auto-creada)                    │
    └────┬───────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ Push Notification Service        │
    │ (sendPushNotificationToUser)     │
    │                                  │
    │ Obtiene push_token de usuario    │
    │ Envía a Expo Push Service        │
    └────┬───────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ Expo Notification Server         │
    │                                  │
    │ Enruta a:                        │
    │ • Firebase Cloud Messaging (AND) │
    │ • Apple Push Notification (iOS)  │
    └────┬───────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ DISPOSITIVO DEL USUARIO          │
    │                                  │
    │ Recibe notificación push         │
    │ ├─ Mostrar alerta                │
    │ ├─ Reproducir sonido             │
    │ ├─ Vibración                     │
    │ └─ Badge en app                  │
    │                                  │
    │ Usuario presiona notificación    │
    │ ├─ Abre app                      │
    │ ├─ Navega a screen relevante     │
    │ └─ markAsRead(notification)      │
    └──────────────────────────────────┘
```

---

## 10. ERROR HANDLING (Centralizado)

```
┌────────────────────────────────────────────────────┐
│        ERROR OCURRE EN LA APP                       │
│                                                    │
│ • API call falla                                   │
│ • Validación falla                                 │
│ • Autenticación falla                              │
│ • Network se cae                                   │
└────────┬─────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ errorHandler.handle()            │
    │ (src/services/errorHandler.ts)   │
    │                                  │
    │ Parámetros:                      │
    │ • error (message)                │
    │ • errorType (AUTH, NETWORK, etc) │
    │ • severity (LOW, MEDIUM, HIGH)   │
    │ • showToast (bool)               │
    │ • context (debugging info)       │
    └────────┬────────────────────────┘
             │
             ├─ Categorizar error
             │
             ├─ Registrar en logs
             │
             ├─ Si severity HIGH/CRITICAL
             │  └─ Reportar (futuro: Sentry)
             │
             ├─ Si showToast = true
             │  └─ Mostrar Toast
             │  
             └─ Continuar app
                (o navegar atrás)

FLUJO ESPECÍFICO:

Network Error
     │
     ▼
"Sin conexión a internet"
(mostrar OfflineBanner)
     │
     ▼
Retry automático o manual

Auth Error
     │
     ▼
"Debes iniciar sesión"
     │
     ▼
Redirigir a LoginScreen

Validation Error
     │
     ▼
"Ingresa valores válidos"
     │
     ▼
Mostrar field errors

Database Error
     │
     ▼
"Error en servidor"
     │
     ▼
Contactar soporte o retry

Payment Error
     │
     ▼
"Error procesando pago"
     │
     ▼
Sugerir método alternativo
```

---

**Estos diagramas representan la arquitectura completa de TRIVE-APP**
