# 🎯 INSTRUCCIONES PASO A PASO PARA LANZAR TRIVE

## ⏱️ Tiempo total: ~4-6 semanas

---

## FASE 1: SEGURIDAD EN SUPABASE (20 minutos)

### PASO 1: Ejecutar RLS Policies

1. Abre tu Supabase Dashboard
2. Ve a: **SQL Editor** → Click **New Query**
3. Copia TODA el contenido de este archivo:
   ```
   RLS_POLICIES_SECURITY.sql
   ```
4. Pega en el editor
5. Click **RUN** y espera a que termine ✅
6. Si ves error, **REPORTA A DEVELOPER** (probablemente permisos)

**Qué hace:** Impide que User A vea datos de User B (GDPR compliance)

---

### PASO 2: Ejecutar Función de Booking Atómico

1. En SQL Editor → Click **New Query**
2. Copia TODA el contenido de este archivo:
   ```
   FIX_RACE_CONDITION_ATOMIC_BOOKING.sql
   ```
3. Pega en el editor
4. Click **RUN** y espera ✅
5. Si ves error, **REPORTA A DEVELOPER**

**Qué hace:** Previene sobreventa de asientos (2 users no pueden reservar más que lo disponible)

---

### PASO 3: Actualizar useBookings.ts

1. Abre archivo:
   ```
   src/hooks/useBookings.ts
   ```
2. Busca función: `finalizePendingBookings`
3. Reemplázala con el código en el comentario de:
   ```
   FIX_RACE_CONDITION_ATOMIC_BOOKING.sql línea ~70
   ```

---

## FASE 2: ANALYTICS (10 minutos)

### PASO 4: Crear Cuenta Sentry

1. Ve a https://sentry.io/signup/
2. Crea cuenta (usa email de tu empresa)
3. Haz login
4. Click **Create Project**
5. Selecciona: **React Native**
6. Selecciona: **Expo**
7. Te dará un **DSN** que se ve así:
   ```
   https://abc123@sentry.io/98765
   ```
8. **COPIA ESE DSN**

---

### PASO 5: Configurar Sentry en App

1. Abre `src/services/analytics.ts`
2. Línea 13, reemplaza:
   ```typescript
   const SENTRY_DSN = 'YOUR_SENTRY_DSN';
   ```
   Con tu DSN del paso anterior:
   ```typescript
   const SENTRY_DSN = 'https://abc123@sentry.io/98765';
   ```
3. Guarda el archivo

---

### PASO 6: Instalar Dependencias de Sentry

En terminal, corre:

```bash
npm install @sentry/react-native @sentry/expo
```

O si usas yarn:

```bash
yarn add @sentry/react-native @sentry/expo
```

Espera a que termine (2-3 minutos)

---

### PASO 7: Activar Sentry en App.tsx

1. Abre `App.tsx`
2. Busca los comentarios de Sentry (línea 7-9)
3. Descomenta:
   ```typescript
   // import { initSentryAnalytics, useCrashReporter } from "./src/services/analytics";
   // initSentryAnalytics();
   ```
4. Guarda

Ahora cuando la app crashee, Sentry lo reportará automáticamente.

---

## FASE 3: LEGAL & DOCUMENTOS (5-8 horas)

### PASO 8: Crear Términos de Servicio

1. Ve a https://termly.io/ o https://iubenda.com/
2. Click **Create** (puedes empezar gratis)
3. Llena:
   - Nombre de app: **Trive**
   - Tipo: Aplicación Mobile
   - Plataforma: iOS + Android
   - Datos sensibles: pagos, ubicación
4. Genera documento
5. Descarga como **PDF**
6. Guarda en carpeta: `legal/TERMS_OF_SERVICE.pdf`

---

### PASO 9: Crear Política de Privacidad

1. En el mismo servicio (termly/iubenda)
2. Crea **Privacy Policy** (no Terms, sino Privacy)
3. Asegúrate que menciona:
   - Qué datos recopilas (ubicación, nombre, email)
   - Para qué los usas (matching de viajes)
   - GDPR derecho a ser olvidado
   - Cómo contactarte
4. Descarga como **PDF**
5. Guarda en: `legal/PRIVACY_POLICY.pdf`

---

### PASO 10: Crear Política de Refunds

1. Crea archivo: `legal/REFUND_POLICY.md`
2. Escribe tu política. Ejemplo:
   ```
   # POLÍTICA DE REEMBOLSOS - TRIVE
   
   ## Cancelación de viajes
   
   - Si cancelas **más de 2 horas antes**: 100% reembolso
   - Si cancelas **1-2 horas antes**: 50% reembolso  
   - Si cancelas **menos de 1 hora**: Sin reembolso
   
   ## Viaje cancelado por conductor
   
   - 100% reembolso + $5 crédito extra
   
   ## Viaje incompleto
   
   - Evaluar caso individual
   - Contactar a support@trive.app
   ```
3. Muestra esta política en app (PaymentScreen)

---

### PASO 11: Registrar Empresa Legalmente (Opcional pero recomendado)

Dependiendo de tu país:

**Colombia:**
- Cámara de Comercio de tu ciudad
- NIT único
- Costo: ~$50,000 COP

**Argentina:**
- AFIP
- CUIT
- Costo: ~AR$2,000

**México:**
- Servicio de Administración Tributaria (SAT)
- RFC
- Costo: Gratis

Esto es para poder recibir pagos legalmente.

---

## FASE 4: SETUP PAGOS Y EMAILS (3-4 horas)

### PASO 12: Setup Stripe (o similar)

1. Ve a https://stripe.com/
2. Click **Sign up**
3. Crea cuenta
4. Ve a **Developers** → **API keys**
5. Copia:
   - Publishable Key
   - Secret Key
6. En código:
   ```typescript
   // src/services/payments.ts
   const STRIPE_PUBLISHABLE = 'pk_live_xxxxx';
   const STRIPE_SECRET = 'sk_live_xxxxx'; // ⚠️ Nunca en cliente!
   ```

**¿Qué es?** Sistema para procesar pagos de usuarios. Stripe toma 2.9% + $0.30

---

### PASO 13: Setup SendGrid (Emails)

1. Ve a https://sendgrid.com/
2. Click **Sign up**
3. Verifica tu email
4. Ve a **Settings** → **API Keys**
5. Crea nuevo API Key
6. Copia la key
7. En código:
   ```typescript
   // src/services/email.ts
   const SENDGRID_API_KEY = 'SG.xxxxx';
   ```

**¿Qué es?** Envía emails de confirmación, recordatorios, etc.

---

### PASO 14: Setup Twilio (SMS - Opcional)

1. Ve a https://www.twilio.com/
2. Sign up
3. Ve a **Console** → **Account SID & Auth Token**
4. En código:
   ```typescript
   // src/services/sms.ts
   const TWILIO_ACCOUNT_SID = 'ACxxxxx';
   const TWILIO_AUTH_TOKEN = 'xxxxx';
   ```

**¿Qué es?** Envía SMS a usuarios (ubicación del conductor, confirmaciones, etc.)

---

## FASE 5: APP STORE & PLAY STORE (6-8 horas)

### PASO 15: Registrar en App Store (iOS)

1. Ve a https://developer.apple.com/
2. Click **Account**
3. Necesitas **Apple Developer Membership** ($99/año)
4. Paga y completa el setup
5. Ve a https://appstoreconnect.apple.com/
6. Click **Create New App**
7. Llena:
   - **Name:** Trive
   - **Primary Language:** Español
   - **Bundle ID:** com.trive.app (o similar)
   - **Category:** Travel
   - **Subscription Type:** No (es gratis)
8. En **App Information**:
   - Icon (1024x1024 PNG)
   - Description (máx 4000 chars)
   - Keywords
   - Support URL (tu email)
   - Privacy Policy URL (tu legal/PRIVACY_POLICY.pdf)
9. En **Screenshots**:
   - Mínimo 2 screenshots
   - Máximo 10
   - Tamaño: 1242×2208 px (iPhone 6.7")
10. En **Preview**:
    - Video demo (opcional, 30 seg máx)
11. Click **Save** y espera aprobación (2-5 días)

---

### PASO 16: Registrar en Play Store (Android)

1. Ve a https://play.google.com/console
2. Click **Create app**
3. Necesitas pagar **$25 USD** (único pago)
4. Llena:
   - **App name:** Trive
   - **Default language:** Español
   - **App or game:** App
   - **Free or paid:** Free
5. Ve a **Setup** → **Store listing**
6. Llena mismo contenido que iOS (icon, screenshots, description)
7. Ve a **Release** → **Create new release**
8. Sube tu APK/AAB (lo generas con EAS)
9. Click **Review release** y espera aprobación (1-3 días)

---

## FASE 6: BUILD & TESTING (2-3 semanas)

### PASO 17: Build para Testing Interno

En terminal:

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Espera ~15 min por build
```

---

### PASO 18: Invitar Testers (Beta)

**iOS (TestFlight):**
1. App Store Connect
2. TestFlight
3. Click **Create test group**
4. Invita testers por email

**Android (Google Play Beta):**
1. Play Console
2. Release → Internal testing
3. Invita testers por email

---

### PASO 19: Testing Checklist (5-10 días)

Con 50+ testers beta, verifica:

```
FUNCIONALIDAD:
☐ Signup funciona
☐ Login funciona
☐ Search de rutas funciona
☐ Booking funciona (2 users simultáneamente)
☐ Pago procesa correctamente
☐ Chat funciona
☐ Rating funciona
☐ Cancel funciona
☐ Emails se envían

CRASHES:
☐ 0 crashes reportados en Sentry
☐ Usar app por 30 min sin cerrar
☐ Buscar 50+ rutas
☐ Hacer 2+ bookings
☐ Enviar 10+ mensajes

PERFORMANCE:
☐ App no se ralentiza
☐ Imágenes cargan rápido
☐ Battery drain es normal
```

---

### PASO 20: Arreglar Bugs

Los testers encontrarán bugs. Prioridad:

🔴 **CRÍTICO** (fix en <4h):
- Crash
- Booking no funciona
- Pago no procesa
- Data corrupta

🟡 **ALTO** (fix en <1 día):
- UI glitch
- Lentitud
- Mensaje no envía

🟢 **BAJO** (fix después de launch):
- Typo
- Ícono no visible
- Spacing raro

---

## FASE 7: LAUNCH (1 día)

### PASO 21: Final Checks

```bash
# Verificar que NO hay errors
npm run build

# Verificar que Sentry está configurado
# Ir a src/services/analytics.ts
# Verificar SENTRY_DSN !== 'YOUR_SENTRY_DSN'

# Verificar que SQL fue ejecutado en Supabase
# SELECT * FROM pg_tables WHERE rowsecurity = true;
# Debería haber >5 tablas con RLS
```

---

### PASO 22: Submitter a Stores

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android

# Espera aprobación (2-5 días)
```

---

### PASO 23: Monitorear Sentry (Primera semana)

1. Cada mañana, abre sentry.io
2. Mira si hay crashes nuevos
3. Si hay crash crítico: **hotfix en <4h**
4. Monitorea: crashes, usuarios, engagement

---

## FASE 8: MARKETING (Ongoing)

### PASO 24: Lanzamiento Público

- Email a lista de espera
- Post en redes sociales
- Video demo en YouTube
- Invite influencers
- Prensa local

---

## 📋 RESUMEN DE ARCHIVOS

Estos son los archivos que necesitas para el checklist:

| Archivo | Qué Es | Cuándo |
|---------|--------|--------|
| `RLS_POLICIES_SECURITY.sql` | SQL para seguridad | Ejecutar en Supabase (Paso 1) |
| `FIX_RACE_CONDITION_ATOMIC_BOOKING.sql` | SQL para booking atómico | Ejecutar en Supabase (Paso 2) |
| `src/services/analytics.ts` | Sentry integration | Configurar DSN (Paso 5) |
| `App.tsx` | App root | Descomentar Sentry (Paso 7) |
| `legal/TERMS_OF_SERVICE.pdf` | Documento legal | Crear (Paso 8) |
| `legal/PRIVACY_POLICY.pdf` | Documento legal | Crear (Paso 9) |
| `legal/REFUND_POLICY.md` | Política de refunds | Crear (Paso 10) |
| `LAUNCH_CHECKLIST_TAREAS_EXTERNAS.md` | Guía completa | Referencia |
| `APP_READY_FOR_PRODUCTION.md` | Estado de app | Referencia |

---

## ✅ CHECKLIST ANTES DE LANZAR

```
SEGURIDAD:
  ☐ RLS Policies ejecutadas en Supabase
  ☐ Atomic booking RPC ejecutado
  ☐ Sentry DSN configurado
  ☐ Sentry reporta crashes correctamente

LEGAL:
  ☐ Términos de Servicio creados y mostrados
  ☐ Política de Privacidad creada
  ☐ Refund Policy escrita
  ☐ Empresa registrada (opcional pero recomendado)

PAGOS & EMAILS:
  ☐ Stripe cuenta creada y keys configuradas
  ☐ SendGrid cuenta creada y keys configuradas
  ☐ Emails se envían correctamente

STORES:
  ☐ App Store Connect account creado
  ☐ Play Store Console account creado
  ☐ Metadata completada (description, keywords, etc.)
  ☐ Screenshots y icons listos

TESTING:
  ☐ 50+ users en beta por 1-2 semanas
  ☐ 0 crashes críticos encontrados
  ☐ Booking funciona simultáneamente (2+ users)
  ☐ Sentry monitoreado sin errores graves

BUILDS:
  ☐ Build iOS sin errores
  ☐ Build Android sin errores
  ☐ Ambos builds testeados en física devices

FINAL:
  ☐ Submitter a App Store
  ☐ Submitter a Play Store
  ☐ Esperar aprobación (2-5 días)
  ☐ Launch! 🎉
```

---

## 🎯 TIMELINE RECOMENDADO

```
HOY:
├─ 20 min: RLS en Supabase
├─ 10 min: Atomic booking
└─ 10 min: Sentry setup
   Total: 40 minutos

MAÑANA:
├─ 30 min: Instalar Sentry
├─ 30 min: Legal docs (ToS, Privacy)
└─ 1 hr: Setup Stripe + SendGrid
   Total: 2 horas

ESTA SEMANA:
├─ 2 hrs: Build para testing
├─ 1 hr: Invitar 50 testers
└─ 3 hrs: Register en stores
   Total: 6 horas

PRÓXIMAS 2 SEMANAS:
├─ Beta testing
├─ Arreglar bugs
└─ Final checks
   Total: 20 horas

LANZAMIENTO:
├─ Submit a stores
├─ Esperar aprobación (2-5 días)
└─ LAUNCH 🚀

TOTAL: ~4-6 semanas
```

---

## 💰 COSTOS APROXIMADOS

```
App Store                  $99/año
Play Store                 $25 (único)
Sentry                     Gratis (hasta 10k/mes)
Stripe                     2.9% + $0.30 por transacción
SendGrid                   Gratis (100/día)
Twilio SMS                 $0.0075 por SMS
Dominio                    ~$12/año
TOTAL MÍNIMO:              ~$150/año + % transacciones
```

---

**¡Listo! Sigue estos pasos y tu app estará en el mercado en 4-6 semanas.** 🚀

Si tienes dudas en cualquier paso, consulta los archivos comentados o pregunta.
