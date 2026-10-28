# 💳 PLAN DE INTEGRACIÓN DE PAGOS - TRIVE APP

**Decisión Recomendada**: Stripe (documentación mejor) o MercadoPago (mejor para LATAM)

**Timeline**: 4-5 días para completar

---

## 🎯 OPCIÓN 1: STRIPE (RECOMENDADO)

### Ventajas:
- ✅ Mejor documentación
- ✅ SDKs en React Native excelentes
- ✅ Webhooks confiables
- ✅ Testing environment realista
- ✅ Soporte en español

### Desventajas:
- ❌ Más comisiones en LATAM (2.9% + $0.30)
- ❌ Requiere SSN/Tax ID para payout

---

## 🎯 OPCIÓN 2: MERCADOPAGO (LATINO-ESPECÍFICO)

### Ventajas:
- ✅ Mejor comisión LATAM (2.99%)
- ✅ Presencia local Colombia
- ✅ Interfaz en español
- ✅ Wallets locales (NequiBox)
- ✅ Documentación en español

### Desventajas:
- ❌ SDKs menos maduros
- ❌ Documentación a veces confusa
- ❌ Support lento

---

## 📋 PASOS PARA INTEGRACIÓN STRIPE

### DÍA 1: SETUP

#### 1. Crear cuenta Stripe
```
1. Ir a https://dashboard.stripe.com/register
2. Registrarse como empresa/freelancer
3. Verificar email
4. Completar KYC (Conocer Tu Cliente):
   - Nombre
   - Email
   - Negocio: "Ride-sharing app"
   - Sitio web: (puede ser landing page)
   - Documento de identidad
5. Aceptar términos de Stripe
6. Acceso a dashboard
```

#### 2. Obtener claves API
```
Dashboard Stripe:
├─ Developers → API Keys
├─ Copiar:
│  ├─ pk_test_... (Publishable Key - exponible)
│  ├─ sk_test_... (Secret Key - CONFIDENCIAL)
│  ├─ pk_live_... (Production Publishable)
│  └─ sk_live_... (Production Secret)
└─ Guardar en .env (NO en código fuente)
```

#### 3. Instalar librerías
```bash
npm install @stripe/react-native-stripe-sdk
npm install @react-native-community/async-storage
npx expo install @react-native-community/netinfo
```

#### 4. Crear backend endpoint (Node.js/Python)
Necesitas un servidor que procese los pagos:

```javascript
// backend/payment-endpoint.js (Node.js con Express)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, userId, bookingId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency: 'cop', // Pesos colombianos
      metadata: {
        userId: userId,
        bookingId: bookingId
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      status: 'success'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/confirm-payment', async (req, res) => {
  const { paymentIntentId, bookingId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Actualizar booking en Supabase
      await updateBookingStatus(bookingId, 'paid');
      res.json({ success: true });
    } else {
      res.json({ success: false, status: paymentIntent.status });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

### DÍA 2-3: IMPLEMENTAR FRONTEND

#### 1. Crear hook de pagos con Stripe

```typescript
// src/hooks/useStripePayment.ts

import { useStripe, useCardForm } from '@stripe/react-native-stripe-sdk';
import { useState } from 'react';

export const useStripePayment = () => {
  const stripe = useStripe();
  const { cardDetails, handleCardChange, confirmPayment } = useCardForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async (
    amount: number,
    bookingId: string,
    userId: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Crear payment intent en backend
      const response = await fetch(
        'https://tu-backend.com/api/create-payment-intent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, userId, bookingId })
        }
      );

      const { clientSecret } = await response.json();

      // 2. Confirmar pago con Stripe
      const { paymentIntent, error: confirmError } = await confirmPayment(
        clientSecret,
        {
          type: 'Card',
          billingDetails: {
            name: 'Usuario', // Obtener del profile
            email: 'usuario@example.com' // Obtener del profile
          }
        }
      );

      if (confirmError) {
        setError(confirmError.localizedMessage);
        return { success: false };
      }

      // 3. Confirmar en backend
      if (paymentIntent?.status === 'Succeeded') {
        await fetch('https://tu-backend.com/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentIntentId: paymentIntent.id,
            bookingId 
          })
        });

        return { success: true, paymentIntentId: paymentIntent.id };
      }

      return { success: false };
    } catch (err) {
      setError(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    processPayment,
    cardDetails,
    handleCardChange,
    loading,
    error
  };
};
```

#### 2. Actualizar BookingScreen

```typescript
// src/screens/BookingScreen.tsx - CAMBIOS

import { useStripePayment } from '../hooks/useStripePayment';
import { CardField } from '@stripe/react-native-stripe-sdk';

export const BookingScreen = () => {
  const { processPayment, handleCardChange, loading, error } = useStripePayment();
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'cash' o 'card'

  const handleConfirmBooking = async () => {
    if (paymentMethod === 'card') {
      // PROCESAR PAGO
      const result = await processPayment(
        totalPrice,
        bookingId,
        userId
      );

      if (result.success) {
        // ✅ Pago procesado, booking está confirmado
        showSuccessMessage('¡Reserva confirmada!');
        navigation.navigate('TripStatus', { bookingId });
      } else {
        // ❌ Pago rechazado
        showErrorMessage(error || 'Pago rechazado');
      }
    } else if (paymentMethod === 'cash') {
      // Pago en efectivo (solo confirmar reserva)
      finalizeCashBooking(bookingId);
      showMessage('Paga con el conductor en el viaje');
      navigation.navigate('TripStatus', { bookingId });
    }
  };

  return (
    <View>
      {/* Resumen de viaje */}
      <View style={styles.summary}>
        <Text>Origen: {origin}</Text>
        <Text>Destino: {destination}</Text>
        <Text>Asientos: {seats.join(', ')}</Text>
        <Text style={styles.price}>Total: ${totalPrice.toLocaleString('es-CO')}</Text>
      </View>

      {/* Selector de método pago */}
      <View style={styles.paymentMethods}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            paymentMethod === 'cash' && styles.activeMethod
          ]}
          onPress={() => setPaymentMethod('cash')}
        >
          <Text>💵 Pagar en efectivo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodButton,
            paymentMethod === 'card' && styles.activeMethod
          ]}
          onPress={() => setPaymentMethod('card')}
        >
          <Text>💳 Tarjeta de crédito</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario de tarjeta si selecciona card */}
      {paymentMethod === 'card' && (
        <View style={styles.cardContainer}>
          <CardField
            postalCodeEnabled={true}
            placeholder={{
              number: '4242 4242 4242 4242',
            }}
            cardStyle={{
              backgroundColor: '#FFFFFF',
              textColor: '#000000',
              borderColor: '#cccccc',
              borderWidth: 1,
              borderRadius: 8,
              fontSize: 16,
              placeholders: {
                number: '0000 0000 0000 0000',
              },
            }}
            onCardChange={handleCardChange}
            style={styles.cardField}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      {/* Botón confirmar */}
      <TouchableOpacity
        style={[styles.confirmButton, loading && styles.disabled]}
        onPress={handleConfirmBooking}
        disabled={loading}
      >
        <Text style={styles.confirmButtonText}>
          {loading ? 'Procesando...' : 'Confirmar Reserva'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

### DÍA 4: TESTING

#### 1. Tarjetas de prueba Stripe

```
Pago exitoso:
  Número: 4242 4242 4242 4242
  Expiración: 12/25
  CVC: 123

Pago rechazado:
  Número: 4000 0000 0000 0002
  Expiración: 12/25
  CVC: 123

3D Secure:
  Número: 4000 0025 0000 3155
  Expiración: 12/25
  CVC: 123
```

#### 2. Workflow de testing

```
1. [ ] Crear una ruta de prueba
2. [ ] Hacer reserva con tarjeta 4242...
3. [ ] Pago debe procesarse
4. [ ] Booking debe estar con status='confirmed'
5. [ ] Verificar en dashboard Stripe que aparezca la transacción
6. [ ] Intentar con tarjeta rechazada 4000...
7. [ ] Debe mostrar error "Pago rechazado"
8. [ ] Booking debe estar con status='pending'
```

---

### DÍA 5: WEBHOOK Y PRODUCCIÓN

#### 1. Configurar webhook Stripe

```
Dashboard Stripe:
├─ Developers → Webhooks
├─ Add endpoint
├─ URL: https://tu-backend.com/webhook/stripe
├─ Seleccionar eventos:
│  ├─ payment_intent.succeeded
│  ├─ payment_intent.payment_failed
│  └─ charge.refunded
└─ Copiar signing secret (CONFIDENCIAL)
```

#### 2. Implementar webhook en backend

```javascript
// backend/webhook-stripe.js

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Procesar eventos
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Actualizar booking a 'paid'
      updateBookingToPaid(paymentIntent.metadata.bookingId);
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      // Actualizar booking a 'failed'
      updateBookingToFailed(failedIntent.metadata.bookingId);
      break;

    case 'charge.refunded':
      const refund = event.data.object;
      // Procesar reembolso
      processRefund(refund.metadata.bookingId);
      break;
  }

  res.json({received: true});
});
```

#### 3. Mover a producción

```
.env.production:
├─ STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxx
├─ STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx (Solo en backend)
├─ BACKEND_URL=https://api.trive.app
└─ NODE_ENV=production
```

---

## 📋 PASOS PARA INTEGRACIÓN MERCADOPAGO

### DÍA 1: SETUP

#### 1. Crear cuenta MercadoPago
```
1. Ir a https://www.mercadopago.com.co
2. Click "Crear cuenta"
3. Registrarse con email
4. Verificar email
5. Ir a Configuración → Credenciales → Aplicaciones
6. Crear nueva aplicación
7. Copiar:
   - Access Token (Producción)
   - Public Key
```

#### 2. Instalar librerías
```bash
npm install @react-native-mercadopago/sdk
npm install axios
```

#### 3. Crear backend endpoint
```python
# backend/payment_mercadopago.py (Python con Flask)

import mercadopago
from flask import request, jsonify

SDK = mercadopago.SDK(ACCESS_TOKEN)

@app.route('/api/create-preference', methods=['POST'])
def create_preference():
    data = request.json
    
    preference_data = {
        "items": [
            {
                "title": "Viaje Trive",
                "quantity": 1,
                "currency_id": "COP",
                "unit_price": float(data['amount'])
            }
        ],
        "payer": {
            "email": data['email'],
            "name": data['name']
        },
        "back_urls": {
            "success": "https://tu-app.com/payment/success",
            "failure": "https://tu-app.com/payment/failure",
            "pending": "https://tu-app.com/payment/pending"
        },
        "auto_return": "approved",
        "notification_url": "https://tu-backend.com/webhook/mercadopago",
        "external_reference": data['bookingId']
    }
    
    preference_response = SDK.preference().create(preference_data)
    
    return jsonify({
        "init_point": preference_response["response"]["init_point"],
        "preference_id": preference_response["response"]["id"]
    })
```

---

## 🔐 VARIABLES DE ENTORNO NECESARIAS

```env
# .env.local (Development)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# .env.production
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_... (Solo en backend)

# Backend URL
BACKEND_URL=http://localhost:3000 (dev)
BACKEND_URL=https://api.trive.app (production)

# Webhook secrets
STRIPE_WEBHOOK_SECRET=whsec_...
MERCADOPAGO_WEBHOOK_TOKEN=...
```

---

## 📊 CAMBIOS EN BD NECESARIOS

```sql
-- Nueva tabla para rastrear pagos
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  payment_method VARCHAR(50), -- 'stripe', 'mercadopago', 'cash'
  payment_intent_id VARCHAR(255), -- ID de Stripe o MercadoPago
  status VARCHAR(50), -- 'pending', 'succeeded', 'failed', 'refunded'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Columna en bookings para marcar como pagado
ALTER TABLE bookings ADD COLUMN payment_transaction_id UUID REFERENCES payment_transactions(id);

-- Trigger para actualizar status automáticamente
CREATE TRIGGER update_booking_payment_status
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
  IF NEW.status = 'succeeded' THEN
    UPDATE bookings SET payment_status = 'completed' WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE bookings SET payment_status = 'failed' WHERE id = NEW.booking_id;
  END IF;
END;
```

---

## ✅ CHECKLIST FINAL

```
INTEGRACIÓN COMPLETADA:
├─ [ ] Cuenta creada en Stripe/MercadoPago
├─ [ ] Claves API obtenidas
├─ [ ] Backend implementado
├─ [ ] Frontend actualizado (BookingScreen)
├─ [ ] Webhook configurado
├─ [ ] Testing con tarjetas de prueba
├─ [ ] Transacciones aparecen en dashboard
├─ [ ] Bookings se marcan como 'paid'
├─ [ ] Conductores ven pasajeros pagados
├─ [ ] Variables de entorno en producción
├─ [ ] Tests end-to-end completados
└─ [ ] LISTO PARA PRODUCCIÓN
```

---

## 🚀 DESPUÉS DE INTEGRACIÓN

```
1. Limpiar test data en Supabase
2. Compilar app:
   eas build -p android --profile production
   eas build -p ios --profile production
3. Esperar ~25 minutos
4. Descargar APK e IPA
5. Upload a tiendas:
   - Google Play Console
   - App Store Connect
6. Submit for review
7. LIVE EN PRODUCCIÓN 🎉
```

---

## ⚠️ NOTAS IMPORTANTES

```
1. NUNCA comitear claves API en GitHub
2. Usar .env o secrets manager
3. Backend debe ser HTTPS en producción
4. Webhooks deben validar la firma
5. Logs de transacciones en BD
6. Implementar retry logic para fallos
7. Contactar a Stripe/MP para soporte antes de live
8. Tener plan de refunds listo
```

---

¿Cuál plataforma de pagos prefieres: **Stripe** o **MercadoPago**?

Puedo hacer un plan más detallado para la que elijas.
