# 💳 SETUP STRIPE - GUÍA PASO A PASO

**Tiempo estimado:** 30-45 minutos  
**Costo:** Gratis (comisiones por transacción)

---

## 🎯 QUÉ ES STRIPE

Stripe procesa pagos de tarjeta de crédito/débito. 
- Cobra 2.9% + $0.30 por transacción
- Deposita dinero en tu banco cada día
- Maneja seguridad PCI compliance

---

## 📋 QUÉ NECESITAS

```
✅ Cuenta de correo
✅ Teléfono
✅ Información de tu empresa
✅ Número de banco (IBAN o ACH)
✅ Identificación personal (DNI/Pasaporte)
✅ 30 minutos
```

---

## ⚙️ PASO 1: CREAR CUENTA STRIPE

### 1.1 Abre sitio
```
Ir a: https://stripe.com/
```

### 1.2 Click "Sign Up"
```
En esquina superior derecha
```

### 1.3 Llenar información
```
Email: [tu email]
Contraseña: [segura, 12+ caracteres]
País: [tu país]
```

### 1.4 Verificar email
```
Stripe envía email
Click link en el email
```

---

## 🔐 PASO 2: COMPLETAR PERFIL

### 2.1 Business Information
```
Account name: TRIVE (o tu nombre empresa)
Timezone: [tu zona horaria]
Currency: USD, EUR, ARS, etc.
```

### 2.2 Personal Information
```
Full name: [Tu nombre completo]
Email: [Tu email]
Phone: [Tu teléfono]
```

### 2.3 Business Type
```
Business type: Self-employed / Sole proprietor
Product: Ride-sharing / Transportation
Monthly volume: $1,000-10,000 (estimado)
```

### 2.4 Address
```
Street: [Tu dirección]
City: [Tu ciudad]
State/Province: [Tu estado/provincia]
Postal code: [Tu código postal]
Country: [Tu país]
```

---

## 🏦 PASO 3: INFORMACIÓN BANCARIA

### 3.1 Agregar cuenta bancaria

```
Dashboard → Settings → Payouts
Click "Add bank account"
```

### 3.2 Por país:

**ARGENTINA:**
```
Bank Name: [Tu banco, ej: Banco Galicia]
Account type: Savings / Checking
Account number: [Tu número de cuenta]
CUIT: [Tu CUIT]
```

**MÉXICO:**
```
Bank Name: [Tu banco, ej: BBVA]
Account type: Savings / Checking
CLABE: [Código de 18 dígitos]
RFC: [Tu RFC]
```

**ESPAÑA:**
```
Bank Name: [Tu banco, ej: BBVA]
IBAN: [Tu IBAN de 24 caracteres]
Account holder: [Tu nombre]
```

**COLOMBIA:**
```
Bank Name: [Tu banco, ej: Bancolombia]
Account type: Savings / Checking
Account number: [Tu número]
Document ID: [Tu cédula]
```

### 3.3 Esperar verificación
```
Stripe: 1-2 días hábiles
Cuando esté verificada: Recibirás email
```

---

## 🔑 PASO 4: OBTENER CLAVES API

### 4.1 Ir a API Keys
```
Dashboard → Developers → API Keys
```

### 4.2 Copiar claves

```
PUBLISHABLE KEY (público):
pk_live_xxxxx... [long string]
Usar en: frontend/cliente

SECRET KEY (privado):
sk_live_xxxxx... [long string]
Usar en: backend/servidor SOLAMENTE
```

⚠️ **IMPORTANTE:** Nunca compartas SECRET KEY

### 4.3 Crear archivo .env
```
En tu proyecto raíz crear archivo:
.env.local (NO commitear a git)

Contenido:
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
```

---

## 💻 PASO 5: INTEGRAR EN CÓDIGO

### 5.1 Instalar biblioteca
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 5.2 Crear servicio de pagos
```typescript
// src/services/stripe.ts

import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE);

export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd'
) => {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency }),
  });
  return response.json();
};
```

### 5.3 Crear pantalla de pago
```typescript
// src/screens/PaymentScreen.tsx

import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export const PaymentScreen = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handlePayment = async () => {
    const cardElement = elements!.getElement(CardElement);
    const { token } = await stripe!.createToken(cardElement!);
    
    if (token) {
      // Enviar token al servidor
      await fetch('/api/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id, amount: 2000 }),
      });
    }
  };

  return (
    <div>
      <CardElement />
      <button onClick={handlePayment}>Pagar $20</button>
    </div>
  );
};
```

---

## ✅ PASO 6: SETUP WEBHOOKS (IMPORTANTE)

### 6.1 Por qué webhooks
```
Stripe notifica a tu servidor cuando:
- Pago exitoso
- Pago fallido
- Disputa iniciada
- Reembolso completado
```

### 6.2 Crear endpoint
```typescript
// Tu backend: src/api/stripe-webhooks.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Pago exitoso: actualizar BD
      const paymentIntent = event.data.object;
      console.log('Pago exitoso:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      // Pago fallido: notificar usuario
      console.log('Pago fallido');
      break;

    case 'charge.refunded':
      // Reembolso: actualizar BD
      console.log('Reembolso procesado');
      break;
  }
}
```

### 6.3 Configurar en Stripe
```
Dashboard → Developers → Webhooks
Click "Add endpoint"

URL: https://tu-dominio.com/api/webhooks/stripe
Eventos a escuchar:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
- charge.dispute.created

Copiar "Signing secret" (used para verificar webhook)
```

---

## 🧪 PASO 7: PROBAR EN MODO TEST

### 7.1 Cambiar a test mode
```
Dashboard: Toggle "Test mode" (esquina superior)
```

### 7.2 Tarjetas de prueba
```
Visa (exitoso):      4242 4242 4242 4242
Visa (rechazado):    4000 0000 0000 0002
Mastercard (exitoso): 5555 5555 5555 4444

CVV: 123
Fecha: Cualquier fecha futura (ej: 12/25)
```

### 7.3 Probar pago
```
1. En tu app, ir a pantalla de pago
2. Usar tarjeta de prueba 4242 4242 4242 4242
3. Entrar datos: CVV 123, fecha 12/25
4. Click "Pagar"
5. Debería completarse exitosamente
```

### 7.4 Verificar en Stripe
```
Dashboard → Payments
Deberías ver tu transacción de prueba
```

---

## 🚀 PASO 8: IR A PRODUCCIÓN

### 8.1 Activar modo live
```
Dashboard: Toggle "Test mode" OFF
Aparecerán tus claves live
```

### 8.2 Actualizar variables de entorno
```
.env.production:
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

### 8.3 Hacer pago de prueba real
```
Pedir a amigo/familiar:
- Usar tarjeta real
- Monto pequeño ($1-5)
- Verificar que funciona
- Reembolsar el dinero
```

### 8.4 Monitorear transacciones
```
Dashboard → Payments
Deberías ver transacciones reales
```

---

## 💰 PASO 9: GESTIONAR DINERO

### 9.1 Dónde van los pagos
```
Cada transacción:
- Cliente paga $20
- Stripe cobra 2.9% + $0.30 = $0.88
- Tú recibes: $19.12
```

### 9.2 Pagos (Payouts)
```
Dashboard → Payouts

Stripe deposita dinero en tu banco:
- Automático cada día (si hay saldo >$100)
- Mínimo $100 por depósito
- Tarda 1-2 días hábiles
```

### 9.3 Ver historial
```
Dashboard → Payouts → History
Ver todos los depósitos a tu banco
```

---

## 🛡️ PASO 10: SEGURIDAD

### 10.1 Nunca
```
❌ Guardar datos de tarjeta en tu servidor
❌ Guardar PIN o CVV
❌ Pasar SECRET KEY por cliente
❌ Loguear números completos de tarjeta
```

### 10.2 Siempre
```
✅ Usar Stripe.js (Stripe maneja seguridad)
✅ Guardar solo token de Stripe
✅ Usar HTTPS en todo
✅ Validar firmas de webhooks
```

### 10.3 PCI Compliance
```
Stripe maneja todo (eres "level 4" automático)
- No necesitas certificación extra
- No necesitas auditoría PCI
```

---

## 📞 CONTACTO STRIPE

```
Centro de ayuda: https://support.stripe.com
Email soporte: support@stripe.com
Chat: Dashboard → Help
Teléfono: [Varía por país]
```

---

## ✅ CHECKLIST FINAL

```
✅ Cuenta Stripe creada
✅ Email verificado
✅ Información personal completada
✅ Cuenta bancaria agregada
✅ Banco verificó mi cuenta (1-2 días)
✅ API keys copiadas
✅ Variables de entorno (.env) creadas
✅ Librerías instaladas (npm install)
✅ Servicio de Stripe creado
✅ Pantalla de pago integrada
✅ Webhooks configurados
✅ Tarjetas de prueba testeadas
✅ Pago de prueba hecho
✅ Modo live activado
✅ Primer pago real completado
```

---

**Tiempo total:** ~45 minutos (sin esperar verificación bancaria)  
**Próximo paso:** Setup SendGrid (emails)

---

**NOTAS:**
- El dinero debería llegar a tu banco en 1-2 días
- Comprueba tu email de Stripe regularmente (pueden pedir más info)
- Si rechaza cuenta bancaria: intenta otrá, o contacta support

¿Necesitas ayuda en algún paso específico?
