# 🔗 RECURSOS RÁPIDOS WOMPI

## 📌 LINKS IMPORTANTES

```
WOMPI OFICIAL:
├─ Web: https://www.wompi.co
├─ Dashboard: https://dashboard.wompi.co
├─ API Docs: https://docs.wompi.co
├─ Support: support@wompi.co
└─ Docs API: https://docs.wompi.co/es/api

SDK/LIBRERÍAS:
├─ Wompi SDK: https://www.npmjs.com/package/wompi
├─ Wompi React Native: https://github.com/Wompi-Lab/react-native-sdk
└─ Axios: https://www.npmjs.com/package/axios

DOCUMENTACIÓN TÉCNICA:
├─ Crear Transacción: https://docs.wompi.co/es/api/crear-transaccion
├─ Consultar Transacción: https://docs.wompi.co/es/api/consultar-transaccion
├─ Webhooks: https://docs.wompi.co/es/api/webhooks
└─ Métodos de Pago: https://docs.wompi.co/es/api/metodos-pago
```

---

## 💳 MÉTODOS DE PAGO EN WOMPI

### NEQUI
```
Tipo: NEQUI
Parámetro: "phone_number": "3001234567"
Comisión: 0% (usuario paga)
Tiempo: Instantáneo
Usuarios Colombia: 10+ millones
```

### DAVIPLATA
```
Tipo: DAVIPLATA (o BANK_TRANSFER)
Parámetro: "phone_number": "3009876543"
Comisión: 0% (usuario paga)
Tiempo: Instantáneo
Usuarios Colombia: 3+ millones
```

### TARJETA DE CRÉDITO
```
Tipo: CARD
Parámetros: Número, expiración, CVV
Comisión: 2.2% + $600 COP (Wompi cobra)
Tiempo: Instantáneo
Usuarios: Visa, Mastercard, Amex
```

### PSE (Transferencia Bancaria)
```
Tipo: BANK_TRANSFER
Parámetro: account_number, account_type
Comisión: 2.2%
Tiempo: 1-2 horas
Usuarios: Todos los bancos colombianos
```

---

## 📋 TABLA RÁPIDA - INFORMACIÓN NECESARIA

### Para Registro de Wompi
```
┌─────────────────────────────┬───────────────────────┐
│ Campo                       │ Ejemplo               │
├─────────────────────────────┼───────────────────────┤
│ Email                       │ empresa@email.com     │
│ Contraseña                  │ [Fuerte, 12+ chars]   │
│ Nombre Empresa              │ Trive Colombia SAS    │
│ NIT                         │ 1234567890            │
│ Tipo Negocio                │ Ride-sharing          │
│ Teléfono                    │ +57 1 234 5678        │
│ País                        │ Colombia              │
│ Ciudad                      │ Bogotá                │
│ Documento Representante     │ [CC PDF]              │
│ Banco                       │ Bancolombia           │
│ Tipo Cuenta                 │ Corriente             │
│ Número Cuenta               │ [Tu número]           │
│ Nombre Titular              │ [Tu nombre completo]  │
│ Monto Mensual Esperado      │ $100,000,000         │
│ Monto Máximo por Transacción│ $500,000             │
└─────────────────────────────┴───────────────────────┘
```

---

## 🧪 CREDENCIALES DE PRUEBA

### Números de Teléfono (Sandbox)
```
NEQUI (Aprobado):
├─ 3001234567
├─ 3009876543
└─ 3005555555

DAVIPLATA (Aprobado):
├─ 3001234567
├─ 3009876543
└─ Cualquier número de 10 dígitos

Resultado: AUTOMÁTICAMENTE APROBADO en sandbox
```

### Tarjetas (Sandbox)
```
APROBADA:
├─ Número: 4242 4242 4242 4242
├─ Expiración: 12/25
├─ CVV: 123
└─ Resultado: APPROVED

RECHAZADA:
├─ Número: 5555 5555 5555 4444
├─ Expiración: 12/25
├─ CVV: 123
└─ Resultado: DECLINED
```

---

## 📁 ESTRUCTURA DE CARPETAS NECESARIA

```
trive-app/
├── src/
│   ├── services/
│   │   ├── wompi.ts          ← Crear (cliente Wompi)
│   │   └── wompi-test.ts     ← Crear (testing)
│   ├── hooks/
│   │   └── useWompiPayment.ts ← Crear (hook de pago)
│   └── screens/
│       └── BookingScreen.tsx ← Actualizar (UI)
├── backend/
│   ├── routes/
│   │   └── wompi.ts          ← Crear (endpoints)
│   └── webhooks/
│       └── wompi-webhook.ts  ← Crear (webhook handler)
├── .env                       ← Crear/Actualizar
├── .env.example              ← Crear
└── .gitignore                ← Verificar
```

---

## 🔐 VARIABLES DE ENTORNO NECESARIAS

```env
# DESARROLLO (Test/Sandbox)
WOMPI_PUBLIC_KEY_DEV=pub_test_xxxxxxxxxxxxx
WOMPI_PRIVATE_KEY_DEV=prv_test_xxxxxxxxxxxxx
WOMPI_INTEGRITY_KEY_DEV=int_test_xxxxxxxxxxxxx

# PRODUCCIÓN (Live)
WOMPI_PUBLIC_KEY_PROD=pub_live_xxxxxxxxxxxxx
WOMPI_PRIVATE_KEY_PROD=prv_live_xxxxxxxxxxxxx
WOMPI_INTEGRITY_KEY_PROD=int_live_xxxxxxxxxxxxx

# APP
BACKEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📦 LIBRERÍAS A INSTALAR

```bash
# Wompi SDK
npm install wompi

# HTTP Client
npm install axios

# Environment Variables
npm install dotenv

# TypeScript (si no tienes)
npm install -D typescript

# Tipos (opcional pero recomendado)
npm install -D @types/axios
```

---

## 🔄 ENDPOINTS WOMPI - RESUMEN

### 1. Crear Transacción
```
POST /api/transactions
Body: {
  "amount_in_cents": 150000000,
  "currency": "COP",
  "customer_email": "usuario@email.com",
  "customer_phone_number": "3001234567",
  "payment_method": {
    "type": "NEQUI",
    "phone_number": "3001234567"
  },
  "reference": "booking_123",
  "description": "Reserva viaje Trive"
}
Response: {
  "id": "trans_xxxxx",
  "status": "PENDING",
  "redirect_to_payment_link": "https://..."
}
```

### 2. Consultar Transacción
```
GET /api/transactions/trans_xxxxx
Response: {
  "id": "trans_xxxxx",
  "status": "APPROVED",
  "amount_in_cents": 150000000,
  "payment_method": {...}
}
```

### 3. Webhook Event
```
POST /webhook/wompi
Body: {
  "event": {
    "type": "transaction.updated"
  },
  "data": {
    "id": "trans_xxxxx",
    "status": "APPROVED"
  }
}
```

---

## 🧪 HERRAMIENTAS DE TESTING

### Postman (Recomendado)
```
1. Descargar: https://www.postman.com/downloads/
2. Importar colección de Wompi
3. URL: https://api.wompi.co/v1
4. Headers:
   Authorization: Bearer prv_test_xxxxx
   Content-Type: application/json
```

### cURL (Terminal)
```bash
# Crear transacción
curl -X POST https://api.wompi.co/v1/transactions \
  -H "Authorization: Bearer prv_test_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_in_cents": 150000000,
    "currency": "COP",
    "customer_email": "test@test.com",
    "payment_method": {"type": "NEQUI", "phone_number": "3001234567"}
  }'
```

---

## ✅ CHECKLIST ANTES DE EMPEZAR

```
ANTES DE CREAR CUENTA:
├─ [ ] Tengo NIT de mi empresa
├─ [ ] Tengo documento de identidad digital (CC)
├─ [ ] Tengo información bancaria
├─ [ ] Tengo email corporativo
└─ [ ] Dedico 2-3 horas sin interrupciones

DURANTE REGISTRO:
├─ [ ] Email verificado
├─ [ ] KYC completado
├─ [ ] Documento subido
├─ [ ] Información bancaria correcta
└─ [ ] En espera de aprobación

DESPUÉS DE APROBACIÓN:
├─ [ ] Credenciales copiadas
├─ [ ] .env configurado
├─ [ ] npm install completado
├─ [ ] Conexión verificada
└─ [ ] ✅ LISTO PARA DÍA 2
```

---

## 🆘 FAQ RÁPIDO

### ¿Cuánto tarda la aprobación?
**Respuesta**: Usualmente < 24 horas. A veces instantáneo.

### ¿Qué pasa si me rechazan?
**Respuesta**: Wompi te enviará email con razón. Proporciona documentación adicional.

### ¿Cuál es la comisión Wompi?
**Respuesta**: 
- Nequi/DaviPlata: 0% (usuario paga)
- Tarjeta: 2.2% + $600 COP
- PSE: 2.2%

### ¿Debo usar sandbox primero?
**Respuesta**: SÍ. Sandbox es gratis y para testing. Luego producción.

### ¿Puedo procesar dinero real en sandbox?
**Respuesta**: NO. Sandbox es solo para testing. Dinero real en producción.

### ¿Qué pasa si olvido guardar credenciales?
**Respuesta**: Puedes acceder desde dashboard Wompi → Configuración → API

### ¿Es seguro guardar en .env?
**Respuesta**: SÍ, si NO commitas el archivo. Usa .env.example en Git.

### ¿Cuánto dinero llega a mi cuenta?
**Respuesta**: 
- Nequi: 100% (usuario paga comisión de Nequi aparte)
- Tarjeta: 97.8% (restamos 2.2%)
- PSE: 97.8% (restamos 2.2%)

---

## 📞 SOPORTE RÁPIDO

```
Problema           → Solución
─────────────────────────────────────────────────
No me envía email  → Revisar spam, esperar 10 min
KYC rechazado      → Documento debe ser claro/legible
No veo credenciales→ Esperar aprobación, recargar página
Conexión falla     → Verificar credenciales, internet
Transacción falla  → Verificar número de teléfono
Webhook no funciona→ Verificar signature, logging

Email support: support@wompi.co
Chat: En dashboard
Tel: +57 (1) 647 4330
```

---

## 🎯 PRÓXIMO PASO

**Lee: [DIA_1_WOMPI_SETUP.md](DIA_1_WOMPI_SETUP.md)**

Luego vuelve aquí si necesitas estos recursos.

---

**¿LISTO PARA EMPEZAR?** 🚀
