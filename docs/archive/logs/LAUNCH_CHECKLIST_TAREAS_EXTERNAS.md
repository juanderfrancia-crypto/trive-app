# 🚀 CHECKLIST PARA LANZAR TRIVE A MERCADO

## ✅ CÓDIGO: YA HECHO (Yo me encargo)

```
✅ Memory leak en countdown → ARREGLADO
✅ Race condition cancelación → ARREGLADO  
✅ Validación ruta cancelada → ARREGLADO
✅ Múltiples ratings → ARREGLADO
✅ Analytics service → CREADO
✅ RLS Policies SQL → CREADO
✅ Race condition booking → CREADO
✅ Error handling base → LISTO
✅ UI/UX base → FUNCIONAL
```

---

## 🔧 TAREAS EXTERNAS: TÚ HACES (No puedo hacerlas remotamente)

### **PRIORIDAD 1: SEGURIDAD (CRÍTICO)**

#### 1️⃣ **Crear cuenta Sentry para Crash Reporting**
- [ ] Ir a https://sentry.io/signup/
- [ ] Crear cuenta (usa email empresa)
- [ ] Crear proyecto "Trive Mobile" (React Native)
- [ ] Copiar el DSN (verá: `https://xxxxx@sentry.io/xxxxx`)
- [ ] Pegar en `src/services/analytics.ts` línea 13:
  ```typescript
  const SENTRY_DSN = 'TU_DSN_AQUÍ';
  ```
- [ ] Instalar en terminal:
  ```bash
  npm install @sentry/react-native @sentry/expo
  ```
- [ ] En `App.tsx`, importar y llamar ANTES de todo:
  ```typescript
  import { initSentryAnalytics } from './src/services/analytics';
  initSentryAnalytics();
  ```

**¿Por qué?** Sin esto, NO sabrás si la app crashea en producción.

---

#### 2️⃣ **Ejecutar RLS Policies en Supabase**
- [ ] Abrir Supabase Dashboard
- [ ] Ir a: SQL Editor → New Query
- [ ] Copiar contenido de `RLS_POLICIES_SECURITY.sql`
- [ ] Pegar y ejecutar (RUN)
- [ ] Esperar a que complete SIN ERRORES
- [ ] Verificar que todas las tablas tienen RLS habilitado:
  ```sql
  SELECT tablename FROM pg_tables 
  WHERE schemaname='public' AND rowsecurity=true;
  ```

**¿Por qué?** Sin RLS, User A puede ver datos de User B (demanda GDPR).

---

#### 3️⃣ **Ejecutar función RPC en Supabase**
- [ ] Abrir Supabase Dashboard → SQL Editor → New Query
- [ ] Copiar contenido de `FIX_RACE_CONDITION_ATOMIC_BOOKING.sql`
- [ ] Pegar y ejecutar
- [ ] Actualizar `src/hooks/useBookings.ts`:
  - [ ] Buscar función `finalizePendingBookings`
  - [ ] Reemplazar con el código comentado en el SQL (línea ~70)
- [ ] Instalar dependencia (si no la tienes):
  ```bash
  npm install uuid
  ```

**¿Por qué?** Sin esto, Users pueden reservar más asientos que existen.

---

### **PRIORIDAD 2: LEGAL (CRÍTICO)**

#### 4️⃣ **Crear Términos de Servicio y Privacidad**
- [ ] Ir a https://termly.io/ (o similar)
- [ ] Crear documentos para:
  - [ ] Términos de Servicio (ToS)
  - [ ] Política de Privacidad
  - [ ] Política de Cookies
  - [ ] GDPR Compliance (derecho al olvido)
- [ ] Guardar PDFs en carpeta `legal/`
- [ ] En `App.tsx`, agregar pantalla de aceptación en primer login:
  ```typescript
  // Mostrar ToS/Privacy antes de acceder a la app
  if (!user?.accepted_terms) {
    return <TermsAcceptanceScreen />;
  }
  ```

**¿Por qué?** App Store/Play Store rechaza apps sin estos documentos.

---

#### 5️⃣ **Registrar política de refund**
- [ ] Definir: ¿Cuándo se devuelve dinero si se cancela viaje?
  - Ejemplo: Refund 100% si cancela >2 horas antes
  - Ejemplo: Refund 50% si cancela 1-2 horas
  - Ejemplo: Sin refund si cancela <1 hora
- [ ] Documentar en REFUND_POLICY.md
- [ ] Mostrar en app (PaymentScreen)

**¿Por qué?** Usuarios necesitan saber cuándo recuperan su dinero.

---

### **PRIORIDAD 3: REGISTROS Y CONFIGURACIÓN**

#### 6️⃣ **Registrar empresa (Si no la tienes)**
- [ ] Registrar empresa legalmente (Cámara de Comercio)
- [ ] Obtener NIT/RUC
- [ ] Abrir cuenta bancaria empresa

**¿Por qué?** Para recibir pagos y pagar taxes.

---

#### 7️⃣ **Configurar sistema de pagos**
- [ ] Elegir proveedor (Stripe, PayPal, Mercado Pago, etc.)
- [ ] Crear cuenta comerciante
- [ ] Obtener API keys
- [ ] Configurar en `src/services/payments.ts`:
  ```typescript
  const STRIPE_KEY = 'pk_live_xxxxx';
  ```
- [ ] Crear forma de PAYOUT para conductores (transferencia bancaria)

**¿Por qué?** Necesitas procesar pagos de usuarios.

---

#### 8️⃣ **Configurar emails**
- [ ] Elegir servicio (SendGrid, Mailgun, AWS SES)
- [ ] Crear cuenta y obtener API key
- [ ] Configurar templates de email:
  - [ ] Confirmación de booking
  - [ ] Recordatorio 1 hora antes
  - [ ] Rating después del viaje
  - [ ] Verificación de cuenta
- [ ] Configurar en `src/services/email.ts`

**¿Por qué?** Usuarios necesitan confirmación de viaje por email.

---

#### 9️⃣ **Configurar SMS (Opcional pero recomendado)**
- [ ] Elegir proveedor (Twilio, Nexmo, local)
- [ ] Crear cuenta y obtener API key
- [ ] Configurar en `src/services/sms.ts`
- [ ] Mensajes importantes:
  - [ ] "Conductor está en camino"
  - [ ] "Viaje completado, califica"
  - [ ] "Código de verificación"

**¿Por qué?** SMS llega incluso sin internet (mejor que push notifications).

---

### **PRIORIDAD 4: APP STORE/PLAY STORE**

#### 🔟 **Registrar app en App Store (iOS)**
- [ ] Ir a https://developer.apple.com/
- [ ] Pagar cuota anual ($99 USD)
- [ ] Crear App Store Connect account
- [ ] Crear nuevo app en App Store Connect
- [ ] Llenar:
  - [ ] Nombre de app
  - [ ] Descripción
  - [ ] Screenshots (minimum 2)
  - [ ] Icon (1024x1024 PNG)
  - [ ] Privacidad
  - [ ] Categoría
  - [ ] Edad mínima
  - [ ] Precio (gratuito)
- [ ] Build ipa con:
  ```bash
  eas build --platform ios --auto-submit
  ```

**¿Por qué?** iOS users = 40% del mercado.

---

#### 1️⃣1️⃣ **Registrar app en Play Store (Android)**
- [ ] Ir a https://play.google.com/console
- [ ] Pagar cuota única ($25 USD)
- [ ] Crear app
- [ ] Llenar mismo contenido que iOS
- [ ] Build apk con:
  ```bash
  eas build --platform android --auto-submit
  ```

**¿Por qué?** Android users = 60% del mercado.

---

#### 1️⃣2️⃣ **Crear material promocional**
- [ ] Logo (PNG transparente)
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] Screenshots para marketing (5-8)
- [ ] Video demo 15-30 seg (opcional)

**¿Por qué?** Convierte descargas en App Store/Play Store.

---

### **PRIORIDAD 5: TESTING Y LAUNCH**

#### 1️⃣3️⃣ **Testing interno (Tú + Team)**
- [ ] Crear 5-10 cuentas de test
- [ ] Probar workflow completo:
  - [ ] Signup/Login
  - [ ] Search rutas
  - [ ] Booking (simultáneo con otro user)
  - [ ] Pago
  - [ ] Chat
  - [ ] Rating
  - [ ] Cancel booking
- [ ] Probar crashes (mata app, abre, verifica Sentry)
- [ ] Probar sin internet
- [ ] Probar con internet lenta (3G)

**Duración:** 2-3 horas

---

#### 1️⃣4️⃣ **Beta testing (Friends + familia)**
- [ ] Invitar 20-50 personas a beta
- [ ] Usar TestFlight (iOS) o Google Play Beta
- [ ] Recopilar feedback por 1-2 semanas
- [ ] Arreglar bugs reportados
- [ ] Medir:
  - [ ] Crashes (via Sentry)
  - [ ] User flow completion rate
  - [ ] Rating/Reviews

**Duración:** 1-2 semanas

---

#### 1️⃣5️⃣ **Go-live**
- [ ] Crear cuenta banco para recibir dinero
- [ ] Esperar aprobación App Store/Play Store (~2-5 días)
- [ ] Ejecutar en terminal:
  ```bash
  eas submit --platform ios
  eas submit --platform android
  ```
- [ ] Monitorear Sentry durante primeras 24h
- [ ] Hotfix team en standby

---

### **PRIORIDAD 6: POST-LAUNCH**

#### 1️⃣6️⃣ **Monitoreo diario (Primera 1 semana)**
- [ ] Ver Sentry cada mañana (crashes importantes)
- [ ] Ver Analytics (qué features usan)
- [ ] Ver App Store reviews (qué se quejan)
- [ ] Responder reviews negativos
- [ ] Fix bugs CRÍTICOS en max 4 horas

---

#### 1️⃣7️⃣ **Marketing**
- [ ] Post en redes sociales
- [ ] Email a lista de espera
- [ ] Influencers/bloggers de transporte
- [ ] Google Ads (opcional)
- [ ] Eventos locales (explica app)

---

---

## 📋 TABLA RESUMIDA

| # | Tarea | Quién | Tiempo | Crítico? |
|---|-------|-------|--------|----------|
| 1 | Sentry Setup | TÚ | 10 min | 🔴 SÍ |
| 2 | RLS en Supabase | TÚ | 5 min | 🔴 SÍ |
| 3 | RPC Atomic Booking | TÚ | 10 min | 🔴 SÍ |
| 4 | ToS/Privacy/GDPR | TÚ + Abogado | 3-5 hrs | 🔴 SÍ |
| 5 | Refund Policy | TÚ | 1 hr | 🟡 MEDIO |
| 6 | Registrar empresa | TÚ | 1-2 hrs | 🔴 SÍ |
| 7 | Setup Pagos (Stripe) | TÚ | 2 hrs | 🔴 SÍ |
| 8 | Setup Emails | TÚ | 1 hr | 🟡 MEDIO |
| 9 | Setup SMS | TÚ | 1 hr | 🟡 MEDIO |
| 10 | Registrar App Store | TÚ | 2 hrs | 🔴 SÍ |
| 11 | Registrar Play Store | TÚ | 2 hrs | 🔴 SÍ |
| 12 | Material promocional | TÚ + Designer | 4-6 hrs | 🟡 MEDIO |
| 13 | Testing interno | TÚ + Team | 2-3 hrs | 🔴 SÍ |
| 14 | Beta testing | Users | 1-2 wks | 🟡 MEDIO |
| 15 | Go-live | TÚ | 30 min | 🔴 SÍ |
| 16 | Monitoreo | TÚ | Daily | 🔴 SÍ |

---

## ⏱️ TIMELINE RECOMENDADO

```
HOY (Semana 1):
├─ Sentry setup (10 min)
├─ RLS + RPC en Supabase (15 min)
└─ Testing interno (2-3 hrs)

SEMANA 1-2:
├─ ToS/Privacy (5 hrs)
├─ Setup Pagos + Emails (3 hrs)
├─ App Store/Play Store (4 hrs)
└─ Beta testing (prep)

SEMANA 2-3:
├─ Beta con 50 users
├─ Arreglar feedback
└─ Material promocional (4-6 hrs)

SEMANA 3-4:
├─ Aprobación App Store/Play Store
├─ Go-live
└─ Monitoreo intenso

TOTAL: ~4 semanas hasta público
```

---

## ❓ PREGUNTAS FRECUENTES

### **¿Cuánto cuesta lanzar la app?**
```
App Store           $99/año (iOS)
Play Store          $25 (Android, único pago)
Sentry              Gratis (hasta 10k eventos/mes)
Stripe              2.9% + $0.30 por transacción
SendGrid emails     Gratis (100/día), $9.95 (5000/mes)
Twilio SMS          $0.0075 por SMS
TOTAL MÍNIMO:       ~$150 + 2-3% de transacciones
```

### **¿Qué pasa si un user cancela después de pagar?**
- Verificar en BD que `payment_status = 'completed'`
- Procesar refund a través de Stripe
- Enviar email confirmando reembolso
- Loguear en Sentry (para auditar)

### **¿Qué pasa si la app crashea?**
- Sentry reporta automáticamente
- Recibes email de Sentry
- Ves stack trace completo
- Puedes hacer hotfix en max 4 hrs

### **¿Puedo lanzar sin RLS policies?**
- **NO** (data leak = GDPR fine = ilegal)

### **¿Puedo lanzar sin RPC atomic?**
- **TÉCNICAMENTE SÍ**, pero con riesgo de sobresignación
- Recomendado ANTES de lanzar a 1000+ users

---

## ✅ CHECKLIST FINAL ANTES DE LANZAR

```
SEGURIDAD:
  ☐ RLS policies activadas en Supabase
  ☐ RPC atomic booking funcionando
  ☐ Sentry DSN configurado y reportando
  ☐ HTTPS habilitado en API

LEGAL:
  ☐ ToS visible en signup
  ☐ Privacy policy aceptada
  ☐ GDPR compliance (delete account funciona)
  ☐ Refund policy clara

FUNCIONALIDAD:
  ☐ Signup/Login funciona
  ☐ Search funciona
  ☐ Booking funciona (con 2 users simultáneamente)
  ☐ Chat funciona
  ☐ Rating funciona
  ☐ Cancel funciona
  ☐ Pago funciona
  ☐ Emails se envían

STORES:
  ☐ App Store connect setup
  ☐ Play Store console setup
  ☐ Icons/screenshots/description listos
  ☐ Privacy label configurado (iOS)

TESTING:
  ☐ 0 crashes en testing interno
  ☐ 0 TypeScript errors
  ☐ Testing con 50+ users beta
  ☐ Sentry monitoreado por 1 semana

MONITORING:
  ☐ Sentry alertas configuradas
  ☐ Team preparado para hotfixes
  ☐ Logs configurados
  ☐ Analytics funcionando
```

---

## 🎉 ¡LISTO PARA LANZAR!

Cuando hayas completado todo esto, tu app estará **production-ready** y segura para 100,000+ users.

**¿Necesitas ayuda en algo de esto? Pregunta.** 🚀
