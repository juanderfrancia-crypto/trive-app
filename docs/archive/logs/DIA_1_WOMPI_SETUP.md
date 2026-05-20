# 🚀 DÍA 1 - SETUP WOMPI - PLAN DE ACCIÓN INMEDIATO

**Fecha**: 23 de abril de 2026  
**Tiempo estimado**: 2-3 horas  
**Objetivo**: Tener credenciales de Wompi y listas para integración  

---

## ✅ CHECKLIST DÍA 1

- [ ] **PASO 1**: Crear cuenta en Wompi (15 min)
- [ ] **PASO 2**: Completar verificación KYC (30-60 min)
- [ ] **PASO 3**: Obtener credenciales API (10 min)
- [ ] **PASO 4**: Instalar librerías npm (5 min)
- [ ] **PASO 5**: Guardar credenciales en .env (5 min)
- [ ] **PASO 6**: Verificar conexión a Wompi (10 min)

---

## 🎯 PASO 1: CREAR CUENTA WOMPI (15 minutos)

### 1.1 Registrarse

```
URL: https://www.wompi.co

1. Haz click en "Crear cuenta empresarial"
2. Llena el formulario:
   - Email: [Tu email principal]
   - Contraseña: [Fuerte, 12+ caracteres]
   - País: Colombia
   - Tipo de negocio: Ride-sharing / Transporte
3. Acepta términos
4. Click "Crear cuenta"
```

### 1.2 Verificar email

```
1. Revisa tu email
2. Busca "Bienvenido a Wompi"
3. Click en "Verificar email"
4. Serás redirigido a dashboard
```

---

## 🎯 PASO 2: COMPLETAR VERIFICACIÓN KYC (30-60 minutos)

### 2.1 Información de Negocio

```
Dashboard Wompi → Configuración → Información Empresarial

Completa:
├─ Nombre de Empresa: [Tu empresa]
├─ Tipo de empresa: 
│  └─ Selecciona: "Plataforma de transporte/Ride-sharing"
├─ NIT: [Tu NIT - 10 dígitos]
├─ Teléfono: [Tu teléfono]
├─ Dirección: [Tu dirección en Colombia]
├─ Ciudad: [Ej: Bogotá, Medellín, etc]
└─ Descripción de negocio:
   └─ "App de viajes compartidos para Colombia. 
       Conectamos pasajeros con conductores. 
       Método de pago: Nequi, DaviPlata, Tarjetas."
```

### 2.2 Información de Contacto

```
├─ Nombre del representante: [Tu nombre]
├─ Email: [Tu email]
├─ Teléfono: [Tu teléfono]
├─ Cargo: [Ej: CEO, Founder]
└─ Documento de identidad (PDF): [Tu CC]
```

### 2.3 Información Bancaria

```
Cuenta donde recibirás dinero:

├─ Banco: [Ej: Bancolombia, BBVA, Davivienda]
├─ Tipo de cuenta: Corriente o Ahorros
├─ Número de cuenta: [Tu número de cuenta]
├─ Titular: [Tu nombre]
├─ Documento del titular: [Tu CC]
└─ CLABE/IBAN: [Wompi te pide esto]
```

**IMPORTANTE**: 
- Verifica que el nombre sea idéntico al de tu documento
- Wompi validará esto con el banco (puede tardar 24-48h)

### 2.4 Información de Activos

```
Wompi te preguntará:

├─ ¿Cuál es el monto mensual esperado? 
│  └─ Respuesta: "100,000,000 COP" (conservador)
│
├─ ¿Cuál es el monto máximo por transacción?
│  └─ Respuesta: "500,000 COP"
│
├─ ¿Qué productos usarás?
│  └─ Respuesta: 
│     - Payments API (tarjeta)
│     - Nequi (wallet)
│     - DaviPlata (wallet)
│     - PSE (transferencia)
│
└─ URL de tu sitio web:
   └─ Respuesta: [Tu landing page o "en desarrollo"]
```

### 2.5 Confirmación

```
1. Revisa todo
2. Click "Enviar para aprobación"
3. Wompi dirá: "Tu solicitud está en revisión"
4. Espera email de aprobación (usualmente < 24h)

Si Wompi te pide más documentos:
├─ Proporciona
├─ Espera 24h
└─ Te aprobarán
```

---

## 🎯 PASO 3: OBTENER CREDENCIALES API (10 minutos)

### 3.1 Una vez aprobado

```
Dashboard Wompi → Configuración → API

Verás:
├─ Public Key (empezando con "pub_")
│  └─ COPIAR esto → guardarlo temporalmente
│
├─ Private Key (empezando con "prv_")
│  └─ ⚠️ CONFIDENCIAL - guardarlo temporalmente
│
└─ Integrity Key (para webhooks)
   └─ COPIAR esto → guardarlo temporalmente
```

### 3.2 También obtener credenciales de prueba

```
En el mismo lugar, busca "Ambiente"

Selecciona: "Test" (Sandbox)

Verás credenciales de prueba:
├─ pub_test_xxxxx
├─ prv_test_xxxxx
└─ int_test_xxxxx

Copia todas (las usarás para testing)
```

---

## 🎯 PASO 4: INSTALAR LIBRERÍAS NPM (5 minutos)

```bash
cd c:\Users\T460s\trive-app

# Instalar Wompi SDK
npm install wompi

# Instalar axios (para requests HTTP)
npm install axios

# Instalar para manejo de secrets
npm install dotenv
```

**Verificar instalación**:
```bash
npm list wompi axios dotenv
# Debería mostrar las versiones instaladas
```

---

## 🎯 PASO 5: GUARDAR CREDENCIALES EN .ENV (5 minutos)

### 5.1 Crear archivo .env (si no existe)

```bash
# En la raíz del proyecto: c:\Users\T460s\trive-app\.env

Crear o editar archivo con:

# ==================== WOMPI ====================
# Credenciales DESARROLLO (Test/Sandbox)
WOMPI_PUBLIC_KEY_DEV=pub_test_xxxxxxxxxxxxx
WOMPI_PRIVATE_KEY_DEV=prv_test_xxxxxxxxxxxxx
WOMPI_INTEGRITY_KEY_DEV=int_test_xxxxxxxxxxxxx

# Credenciales PRODUCCIÓN (Live)
# (Las llenaremos después cuando esté aprobado)
WOMPI_PUBLIC_KEY_PROD=pub_live_xxxxxxxxxxxxx
WOMPI_PRIVATE_KEY_PROD=prv_live_xxxxxxxxxxxxx
WOMPI_INTEGRITY_KEY_PROD=int_live_xxxxxxxxxxxxx

# Backend URL
BACKEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 5.2 Crear .env.example (sin valores)

```bash
# En la raíz del proyecto
cp .env .env.example

# Luego edita .env.example para que quede:

WOMPI_PUBLIC_KEY_DEV=your_public_key_here
WOMPI_PRIVATE_KEY_DEV=your_private_key_here
WOMPI_INTEGRITY_KEY_DEV=your_integrity_key_here

WOMPI_PUBLIC_KEY_PROD=your_public_key_here
WOMPI_PRIVATE_KEY_PROD=your_private_key_here
WOMPI_INTEGRITY_KEY_PROD=your_integrity_key_here

BACKEND_URL=http://localhost:3000
NODE_ENV=development
```

### 5.3 Actualizar .gitignore

```bash
# Abre .gitignore en la raíz y asegúrate que contenga:

# Environment variables
.env
.env.local
.env.*.local
.env.production.local

# NO comitear credenciales
.env.example # Opcional comentario que esto es ejemplo
```

**VERIFICAR**: 
```bash
git status

# No debería mostrar cambios en .env
# Si muestra .env, hazlo:

git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## 🎯 PASO 6: VERIFICAR CONEXIÓN (10 minutos)

### 6.1 Crear archivo de prueba

```typescript
// src/services/wompi-test.ts

import axios from 'axios';

const WOMPI_API_URL = 'https://api.wompi.co/v1';
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY_DEV;

export async function testWompiConnection() {
  try {
    // Test 1: Verificar que tenemos clave pública
    console.log('✓ Clave pública configurada');
    
    // Test 2: Hacer ping a Wompi
    const response = await axios.get(`${WOMPI_API_URL}/transactions`, {
      headers: {
        'Authorization': `Bearer ${process.env.WOMPI_PRIVATE_KEY_DEV}`,
      },
    });
    
    console.log('✓ Conexión a Wompi exitosa');
    console.log('✓ Transacciones encontradas:', response.data.data.length);
    
    return {
      success: true,
      message: 'Wompi está conectado correctamente',
    };
  } catch (error) {
    console.error('✗ Error conectando a Wompi:', error);
    return {
      success: false,
      message: 'Error de conexión a Wompi',
    };
  }
}

// Ejecutar para verificar
testWompiConnection();
```

### 6.2 Ejecutar la prueba

```bash
# En VS Code terminal:
npx ts-node src/services/wompi-test.ts

# Esperado:
# ✓ Clave pública configurada
# ✓ Conexión a Wompi exitosa
# ✓ Transacciones encontradas: 0
```

---

## 📋 AL FINAL DE DÍA 1

Tendrás:
- ✅ Cuenta Wompi creada y verificada
- ✅ Credenciales API obtenidas
- ✅ Librerías npm instaladas
- ✅ .env configurado con credenciales
- ✅ Conexión verificada

---

## 🎯 PRÓXIMO: DÍA 2-3 (Implementación)

```
DÍA 2-3: BACKEND + FRONTEND
├─ Crear endpoints en backend para Wompi
├─ Implementar hook useWompiPayment
├─ Actualizar BookingScreen
├─ Integrar formularios de pago
└─ Testing inicial
```

---

## ⚠️ NOTAS IMPORTANTES DÍA 1

```
✅ DO:
  ✓ Usar email corporativo (no personal)
  ✓ NIT correcto de la empresa
  ✓ Información bancaria exacta
  ✓ Guardar credenciales en .env
  ✓ NO commitar .env

❌ DON'T:
  ✗ Usar email personal
  ✗ Omitir información KYC
  ✗ Compartir credenciales
  ✗ Comitear .env a GitHub
  ✗ Usar credenciales en código
```

---

## 🆘 SI ALGO FALLA

### No recibo email de Wompi
```
1. Revisar spam
2. Esperar 5-10 minutos
3. Reenviar email desde dashboard
4. Contactar: support@wompi.co
```

### Wompi rechaza mi solicitud KYC
```
1. Revisar documentación
2. CC debe ser clara y legible
3. Nombre debe coincidir exactamente
4. Contactar support@wompi.co con documentación
```

### No puedo acceder a credenciales API
```
1. Verificar que estés aprobado
2. Ir a Configuración → API
3. Si no ves nada, contactar support@wompi.co
4. Esperar confirmación de aprobación (email)
```

---

## 📞 CONTACTO WOMPI

```
Email: support@wompi.co
Chat: En dashboard (visto para aprobación)
Teléfono: +57 (1) 647 4330
Horario: L-V 8AM-6PM Colombia
```

---

## ⏱️ TIMELINE HOY (DÍA 1)

```
09:00 - Crear cuenta (15 min)
09:15 - KYC y verificación (45 min)
10:00 - Obtener credenciales (15 min)
10:15 - Instalar librerías (5 min)
10:20 - Configurar .env (10 min)
10:30 - Verificar conexión (15 min)
10:45 - ✅ DÍA 1 COMPLETO

ESPERAR: Wompi aprobación (usualmente < 24h)
```

---

## ✅ CONFIRMACIÓN DE COMPLETADO DÍA 1

Cuando termines, responde con:

```
✅ Cuenta Wompi creada: SÍ / NO
✅ KYC completado: SÍ / NO
✅ Credenciales obtenidas: SÍ / NO
✅ .env configurado: SÍ / NO
✅ npm install completado: SÍ / NO
✅ Conexión verificada: SÍ / NO

Credenciales de prueba guardadas: SÍ / NO
```

Entonces procederemos con:
- **DÍA 2**: Backend Wompi
- **DÍA 3**: Frontend BookingScreen
- **DÍA 4**: Testing completo

---

## 🚀 ¿LISTO PARA EMPEZAR DÍA 1?

**Necesitas 2-3 horas libres sin interrupciones.**

¿Procedemos ahora mismo?

Responde cuando:
1. Hayas creado la cuenta Wompi
2. Completes KYC
3. Obtengas credenciales

Puedo ayudarte en cada paso si tienes dudas.
