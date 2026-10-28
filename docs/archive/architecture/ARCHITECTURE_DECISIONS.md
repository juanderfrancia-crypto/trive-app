# 🏗️ DECISIONES ARQUITECTURA & TECH STACK

## CONTEXTO
La app está 37% completa. Los siguientes 7 días definirán si es viable. Este documento fija las decisiones técnicas críticas.

---

## DECISION 1: SISTEMA DE PAGOS

### Opción A: CASH ONLY (Recomendado MVP Rápido)
```
✅ PROS:
  - Implementación: 2 horas
  - Sin riesgo de errores de integración
  - Perfect para validar mercado (¿quién viaja?)
  - Conductor controla si marcó como pagado

❌ CONS:
  - Manual (no escalable)
  - Fraud: Si conductor marca pero no recibió dinero
  - User experience: "Espera al conductor confirmar"
  - Revenue uncertainty (¿cuánto realmente cobra?)

📊 RECOMENDACIÓN: MVP Beta (Days -7)
```

**Implementación Cash**:
```sql
-- bookings table changes
ALTER TABLE bookings ADD payment_method VARCHAR(20) DEFAULT 'cash';
ALTER TABLE bookings ADD payment_status VARCHAR(20) DEFAULT 'pending';
-- Estados: pending → verified (conductor confirma) → settled (pasajero paga)

-- Conductor ve "Pendiente pago: $25,000 en efectivo"
```

---

### Opción B: MERCADO PAGO (Recomendado MVP Sólido)
```
✅ PROS:
  - Pago automático confirmado
  - Revenue 100% transparente
  - Historial de transacciones
  - Escalable a 10K usuarios
  - Cumple regulaciones financieras

❌ CONS:
  - Complejidad: Webhook + estados
  - Depend en servicio 3rd party
  - Fees: 7% de cada viaje
  - Time: 8 horas implementación
  - Testing: Necesita tarjeta real

📊 RECOMENDACIÓN: MVP Producción (Days 5-7)
```

**Implementación MP**:
```typescript
// Flujo:
1. User presiona "Continuar con Mercado Pago"
2. SDK MP abre checkout
3. Usuario paga
4. MP envía webhook → Backend actualiza payment_status='completed'
5. Booking confirmado automáticamente
```

---

### Opción C: STRIPE (Global)
```
❌ NO RECOMENDADO PARA LATAM
- Fees altos para regiones latinas (2.9% + $0.30)
- Mercado Pago es standard en AR/BR/CO/MX
- Pero IF quieres global → Stripe es better known
```

---

## 🎯 RECOMENDACIÓN FINAL - PAYMENTS

| Timeline | Choice | Reasoning |
|----------|--------|-----------|
| **Days 1-4** | CASH | Valida market, 0% fraud risk, fast |
| **Days 5-7** | MERCADO PAGO | Escalable, profesional |
| **After launch** | Both (User choice) | "Pagar ahora" MP o "Efectivo al conductor" |

---

## DECISION 2: GPS & MAPAS

### Opción A: NO GPS (Pasar)
```
✅ PROS:
  - 0 complejidad
  - User aún puede buscar viajes por ciudades
  - Frontend 2 horas (remove feature flags)

❌ CONS:
  - Ruta se ve como "Armenia → Cali" (texto)
  - No sé si está en ruta correcta hasta subir
  - Bad UX (especialmente conductores)
  - Competitive disadvantage

📊 NO RECOMENDADO - Mínimo MVP necesita mapas
```

---

### Opción B: EMBED GOOGLE MAPS (Rápido)
```
✅ PROS:
  - Implementación: 2 horas
  - Dirección embebida y funciona
  - Performance: 0 impacto (HTML embed)
  - Usuario ve ruta antes de booking

❌ CONS:
  - No tracking en vivo
  - No es interactivo
  - User no puede hacer zoom
  - No integra con GPS device

📊 RECOMENDADO PARA MVP - Days 3-4
```

**Implementación**:
```typescript
const RouteMapEmbed = ({ origin, destination }: Props) => {
  const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=YOUR_API&origin=${origin}&destination=${destination}&zoom=13`
  
  return (
    <WebView 
      source={{ uri: mapUrl }}
      style={{ height: 300 }}
    />
  )
}
```

---

### Opción C: REACT NATIVE MAPS (Completo)
```
✅ PROS:
  - Interactive map (user puede zoom)
  - Real-time driver tracking (después)
  - Professional feel
  - Base para live GPS

❌ CONS:
  - Tiempo: 8 horas (primero), 4h debugging
  - Performance: Usa CPU/battery
  - Complexity: Depende de react-native-maps
  - Testing: Necesita GPS simulator

📊 RECOMENDADO PARA MVP+ - Days 5-7 or post-launch
```

---

### Opción D: CUSTOM POLYLINE + STATIC MAP (Balanceado)
```
✅ PROS:
  - Muestra ruta exacta (polyline)
  - No es totalmente interactivo (mejor perf)
  - Ready para live GPS después
  - Look profesional

❌ CONS:
  - Tiempo: 6 horas
  - Necesita polycoding/waypoints

📊 RECOMENDADO PARA MVP Sólido
```

---

## 🎯 RECOMENDACIÓN FINAL - GPS

| Timeline | Choice | Implementation |
|----------|--------|------------------|
| **Days 1-4** | Embed Google Maps | 2h, funciona |
| **Days 5-7** | React Native Maps | If time allows, +8h |
| **Post-MVP** | Live GPS Tracking | Conductor + Passenger tracking en vivo |

---

## DECISION 3: NOTIFICACIONES

### Opción A: IN-APP ONLY (Hoy)
```
✅ PROS:
  - 0 setup
  - Funciona offline (muestra saved messages)
  
❌ CONS:
  - User no sabe que tiene notif si app cerrada
  - Mensajes se pierden si cambias teléfono
  - Bad UX: "Why didn't they tell me?"
```

---

### Opción B: PUSH NOTIFICATIONS (iOS priority)
```
✅ PROS:
  - Notif incluso app cerrada
  - iOS: Funciona via Expo
  - Engagement: 10x mejor
  
❌ CONS:
  - Android: Más complicado
  - Expo iOS: Beta feature
  - Testing: Necesita device real

📊 RECOMENDADO PARA MVP
```

**Status actual**: iOS funciona, Android es TO-DO.

**Implementation minimal**:
```typescript
// En usePushNotifications.ts
const registerForPushNotifications = async () => {
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync()
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data
  // Guardar token en BD → usar para enviar notif
}
```

---

## 🎯 RECOMENDACIÓN FINAL - NOTIF

| Phase | Choice | Details |
|-------|--------|---------|
| **MVP Beta** | Push iOS only | Expo notifications |
| **MVP v1.1** | Add Android | FCM setup or Firebase |
| **Post-launch** | Webhooks | Booking updates → push |

---

## DECISION 4: REAL-TIME UPDATES

### Opción A: POLLING (Current)
```
✅ PROS:
  - Simple: Fetch every 5s
  - Funciona sin websockets
  - App es mobile: Batería OK
  
❌ CONS:
  - Delay: 5s mínimo
  - Server load: Si 1000 users polling
  - Expensive data (en plan preago)
```

---

### Opción B: WEBSOCKETS + SUPABASE REALTIME
```
✅ PROS:
  - Instant updates (< 100ms)
  - Server efficient
  - Supabase tiene built-in
  
❌ CONS:
  - Complejidad: Room subscriptions
  - Requires Supabase Pro
  - Mobile battery drain (conexión abierta)
  - Debugging: Hard

📊 POST-LAUNCH FEATURE (no MVP)
```

---

## 🎯 RECOMENDACIÓN FINAL - REALTIME

| Phase | Choice | Reasoning |
|-------|--------|-----------|
| **MVP** | Polling each 5s | Bueno para beta, bajo setup |
| **v1.1** | WebSockets | Si performance issue existe |
| **Scaling** | Message queue (Kafka) | Si 10K+ users |

---

## DECISION 5: AUTH FLOW

### Current State
- ✅ Email + Password
- ✅ OTP via SMS (Twilio?)
- ❌ Social login (Google/Apple) - Nice to have, no MVP

### Recomendación
```
✅ MANTENER COMO ESTÁ
   - Funciona
   - Beta users acostumbrados
   - Social login post-launch

🟡 MEJORAR (optional):
   - "Permanece conectado" (refresh token)
   - Session timeout 30min
   - Device fingerprinting (fraude)
```

---

## DECISION 6: PAYMENT GATEWAY ERROR HANDLING

### Scenario: "Transacción rechazada"
```
User presiona "Pagar con MP" → tarjeta rechazada → ???

CORRECTO:
1. MP devuelve error 400 → User ve: "Tarjeta rechazada"
2. User puede reintentar
3. Booking NO se crea hasta confirmación ✅

INCORRECTO (Evitar):
1. Booking se crea con payment_status='pending'
2. User se va sin saber si pagó
3. Conductor ve booking no pagado

📌 SOLUCIÓN: 
   - NUNCA crear booking antes de confirmar pago
   - Pagar PRIMERO → DESPUÉS crear booking
```

---

## DECISION 7: DATABASE SCALING

### Current Schema
- Routes: ~100-1000
- Bookings: ~100-10K
- Users: ~100-1K (beta)

### Recomendación
```
MVP (hasta 5K users):
✅ Supabase default (PostgreSQL 9.6)
✅ Índices en: user_id, route_id, status
✅ Backups automáticos

v1.1 (5K-50K):
🟡 Upgrade Postgres size
🟡 Add read replicas para analytics
🟡 Cache con Redis (opcional)

Scaling (50K+):
❌ Considerar arquitectura sharding
```

---

## DECISION 8: ERROR TRACKING

### Opción A: CONSOLE.LOG (Current)
```
❌ BAD
- No tienes trazabilidad
- User reporta bug → No sabes qué pasó
```

### Opción B: SENTRY (Recomendado)
```
✅ GOOD
- Automático error tracking
- Stack traces + context
- Free tier: 10K events/mes

SETUP (10 minutes):
1. Crear cuenta Sentry.io (free tier)
2. npm install @sentry/react-native
3. Sentry.init({ dsn: 'YOUR_DSN' })
4. Todo error se reporta automáticamente

COSTO: Free hasta 10K eventos = PERFECTO para MVP
```

---

## DECISION 9: MONITORING & ALERTS

### Recomendación MVP
```
✅ Uptime monitoring:
  - Pingdom: Verifica API viva cada 5min
  - Costo: Free tier

✅ Error tracking:
  - Sentry: Alertas si crash rate > 2%
  - Costo: Free tier

✅ Database:
  - Supabase built-in monitoring
  - Alertas si CPU > 80%
  - Costo: Included

SETUP TIME: 1 hour
```

---

## 🎯 TECH STACK FINAL

| Layer | Technology | Status | Notes |
|-------|-----------|--------|-------|
| **Frontend** | React Native 54 + Expo | ✅ |  |
| **Language** | TypeScript | ✅ |  |
| **Navigation** | React Navigation v5 | ✅ |  |
| **State** | Zustand + Context | ✅ |  |
| **Backend** | Supabase (PostgreSQL) | ✅ |  |
| **Auth** | Supabase Auth | ✅ | +OTP |
| **Storage** | Supabase Storage (public) | ✅ | Fotos |
| **Payments** | Cash (MVP1) → MP (MVP2) | 🟡 | Days 2-3 |
| **Maps** | Google Maps Embed (MVP1) | 🟡 | Days 3-4 |
| **Push Notif** | Expo Notifications | 🟡 | iOS only |
| **Error Tracking** | Sentry | ❌ | TO-DO: 1h setup |
| **Monitoring** | Sentry + Pingdom | ❌ | TO-DO: 1h setup |
| **Database Backups** | Supabase auto | ✅ |  |

---

## 🚀 CRITICAL PATH

```
DÍA 1: Race condition FIX
  - 2 horas
  - Blocker el resto

DÍA 2: Payments (CASH)
  - 4 horas
  - Sin ella no puedes cobrar

DÍA 3: Maps (Embed)
  - 2 horas
  - Mejora UX significante

DÍA 4: QA
  - 8 horas
  - Encontrar bugs

DÍA 5-7: Hotfix + Launch
  - Build + monitoring + go live
```

---

## ⚠️ TECH DEBT (Post-Launch)

| Debt | Priority | Effort | Blocker? |
|------|----------|--------|----------|
| WebSocket real-time | Medium | 16h | No |
| Social login | Low | 8h | No |
| 2FA | Low | 6h | No |
| Admin dashboard | High | 24h | No |
| Chat system | High | 40h | No |
| Live GPS | High | 16h | No |
| iOS/Android native modules | Medium | 8h | No |

---

## ✅ FINAL ARCHITECTURE DECISION

**Phase 1: MVP Beta (Days 1-7)**
```
Cash Payments + Embed Maps + Push iOS
Simple, fast, validates market
Risk: Low (all features are proven)
```

**Phase 2: MVP Sólido (Weeks 2-3)**
```
Add: Mercado Pago + React Native Maps + Android Push
Risk: Medium (integrations)
```

**Phase 3: MVP+ (Month 2)**
```
Add: WebSocket + Chat + Admin dashboard
Risk: High (architectural changes)
```

---

**Documento aprobado por**: GitHub Copilot MVP Assessment  
**Revisión**: Si cambios en scope, revisar secciones 1-8
