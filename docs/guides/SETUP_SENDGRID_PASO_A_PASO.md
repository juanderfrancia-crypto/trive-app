# 📧 SETUP SENDGRID - GUÍA PASO A PASO

**Tiempo estimado:** 20-30 minutos  
**Costo:** Gratis (100 emails/día) o $20/mes (5,000 emails/mes)

---

## 🎯 QUÉ ES SENDGRID

SendGrid envía emails de tu app:
- Verificación de email
- Confirmación de reserva
- Recordatorio de viaje
- Recibo de pago
- Soporte al cliente

---

## 📋 QUÉ NECESITAS

```
✅ Cuenta de correo
✅ Tu dominio (ej: trive.app)
✅ Acceso a DNS (para verificación)
✅ 20 minutos
```

---

## ⚙️ PASO 1: CREAR CUENTA SENDGRID

### 1.1 Abre sitio
```
Ir a: https://sendgrid.com/
```

### 1.2 Click "Sign Up"
```
En esquina superior derecha
```

### 1.3 Llenar formulario
```
Email: [tu email]
Contraseña: [segura, 12+ caracteres]
First name: [Tu nombre]
Last name: [Tu apellido]
Company: TRIVE
Country: [tu país]
```

### 1.4 Verificar email
```
SendGrid envía email
Click link en el email
```

---

## 🔑 PASO 2: OBTENER API KEY

### 2.1 Ir a API Keys
```
Dashboard → Settings → API Keys
```

### 2.2 Click "Create API Key"
```
Name: TRIVE Production
Permissions: Full Access (para empezar)
```

### 2.3 Copiar y guardar
```
Tu API Key (largo string):
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

⚠️ IMPORTANTE: Guardar en lugar seguro
No commitear a Git
```

### 2.4 Crear archivo .env
```
En raíz del proyecto:
.env.local

Contenido:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@trive.app
```

---

## 🔐 PASO 3: VERIFICAR DOMINIO (IMPORTANTE)

### 3.1 Por qué verificar
```
Para que emails NO vayan a SPAM:
- Verificar que TÚ controlas el dominio
- Agregar registros DNS
- Aumentar "deliverability" (entreg)
```

### 3.2 Ir a Sender Authentication
```
Settings → Sender Authentication
Click "Verify a Domain"
```

### 3.3 Ingresar dominio
```
Domain: trive.app (o tu dominio)
Default: No (puedes hacerlo después)
```

### 3.4 Copiar registros DNS
```
SendGrid te muestra 3 registros:

1. CNAME: 
   Name: m1._domainkey.trive.app
   Value: m1.trive.app.sendgrid.net.

2. CNAME:
   Name: m2._domainkey.trive.app
   Value: m2.trive.app.sendgrid.net.

3. CNAME:
   Name: em.trive.app
   Value: u12345678.wl.sendgrid.net.
```

### 3.5 Agregar a tu DNS
```
Ir al proveedor de tu dominio:
GoDaddy, Namecheap, CloudFlare, etc.

Agregar los 3 registros CNAME:
(Instrucciones varían por proveedor)

Ejemplo (GoDaddy):
- DNS Management
- Add Record
- Type: CNAME
- Name: [del registro]
- Value: [del registro]
- Save
```

### 3.6 Esperar verificación
```
Puede tardar:
- Algunos minutos (si DNS rápido)
- Hasta 48 horas (si DNS lento)

En SendGrid, click "Verify" periódicamente
```

### 3.7 Cuando esté verificado
```
Verás: ✅ Domain verified
Emails ahora irán a Inbox, no SPAM
```

---

## 💻 PASO 4: INTEGRAR EN CÓDIGO

### 4.1 Instalar librería
```bash
npm install @sendgrid/mail
```

### 4.2 Crear servicio de emails
```typescript
// src/services/email.ts

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  replyTo,
}: SendEmailProps) => {
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject,
      html,
      replyTo: replyTo || process.env.SENDGRID_FROM_EMAIL!,
    });
    console.log(`✅ Email enviado a ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return false;
  }
};
```

### 4.3 Crear plantillas de email

```typescript
// src/services/emailTemplates.ts

export const emailTemplates = {
  verificationEmail: (verificationLink: string) => ({
    subject: '🔐 Verifica tu email - TRIVE',
    html: `
      <h1>Bienvenido a TRIVE</h1>
      <p>Haz click para verificar tu email:</p>
      <a href="${verificationLink}">Verificar Email</a>
    `,
  }),

  bookingConfirmation: (bookingId: string, tripDetails: any) => ({
    subject: '✅ Tu reserva está confirmada - TRIVE',
    html: `
      <h2>¡Reserva Confirmada!</h2>
      <p><strong>ID:</strong> ${bookingId}</p>
      <p><strong>Origen:</strong> ${tripDetails.origin}</p>
      <p><strong>Destino:</strong> ${tripDetails.destination}</p>
      <p><strong>Fecha:</strong> ${tripDetails.departureTime}</p>
      <p><strong>Precio:</strong> $${tripDetails.price}</p>
      <a href="https://trive.app">Ver en la app</a>
    `,
  }),

  bookingCancellation: (bookingId: string, refundAmount: number) => ({
    subject: '❌ Tu reserva fue cancelada - TRIVE',
    html: `
      <h2>Reserva Cancelada</h2>
      <p>Tu reserva #${bookingId} fue cancelada.</p>
      <p><strong>Reembolso:</strong> $${refundAmount}</p>
      <p>El dinero debería llegar en 3-5 días hábiles.</p>
    `,
  }),

  paymentReceipt: (
    transactionId: string,
    amount: number,
    date: string
  ) => ({
    subject: '💰 Recibo de pago - TRIVE',
    html: `
      <h2>Recibo de Transacción</h2>
      <p><strong>ID:</strong> ${transactionId}</p>
      <p><strong>Monto:</strong> $${amount}</p>
      <p><strong>Fecha:</strong> ${date}</p>
      <p>Conserva este email para tus registros.</p>
    `,
  }),
};
```

### 4.4 Usar en tu código

```typescript
// En tu hook o servicio de registro:

import { sendEmail } from './services/email';
import { emailTemplates } from './services/emailTemplates';

const handleUserSignup = async (email: string, name: string) => {
  // ... crear usuario en BD ...

  const verificationLink = `https://trive.app/verify?token=xyz123`;
  const emailTemplate = emailTemplates.verificationEmail(verificationLink);

  await sendEmail({
    to: email,
    ...emailTemplate,
  });
};
```

---

## 📧 PASO 5: ENVIAR EMAIL DE PRUEBA

### 5.1 Desde la app
```
En tu código de signup/testing:

await sendEmail({
  to: 'tu-email@gmail.com',
  subject: 'Test TRIVE',
  html: '<h1>¡Hola! Si ves esto, SendGrid funciona.</h1>',
});
```

### 5.2 Verificar recepción
```
1. Abre Gmail/Outlook
2. Busca "Test TRIVE"
3. Verifica que llegó (chequea SPAM si no está en Inbox)
4. Clickea y verifica contenido
```

### 5.3 Si llega a SPAM
```
- Dominio no verificado aún (espera 48h)
- O marca como "No es SPAM"
- Una vez verificado, irá a Inbox automáticamente
```

---

## 📊 PASO 6: MONITOREAR ENTREGAS

### 6.1 Dashboard
```
Dashboard → Email Activity
Verás:
- Emails enviados ✅
- Emails abiertos 👁️
- Emails clickeados 🔗
- Bounces (no entregados) ❌
- Spam reports 🚫
```

### 6.2 Analítica por email
```
Dashboard → Reporting
- Mensajes entregados
- Tasa de apertura
- Tasa de click
- Unsubscribes
```

---

## 🎨 PASO 7: PERSONALIZAR EMAILS (Opcional)

### 7.1 Agregar logo
```html
<img src="https://trive.app/logo.png" width="100">
```

### 7.2 Agregar firma
```html
<p>
  <strong>TRIVE Team</strong><br>
  support@trive.app<br>
  +1-800-TRIVE-APP
</p>
```

### 7.3 Agregar colores
```html
<p style="color: #007AFF; font-size: 16px;">
  Tu reserva está confirmada
</p>
```

---

## 🛡️ PASO 8: LIDAR CON UNSUBSCRIBES

### 8.1 Obligatorio por ley
```
Cada email DEBE tener:
- Link para desuscribirse
- Link "Preference Center"
- Información de contacto
```

### 8.2 Agregar al template
```html
<footer>
  <p>
    <a href="https://trive.app/unsubscribe?token=xyz">
      Desuscribirse
    </a> | 
    <a href="https://trive.app/preferences">
      Preferencias de email
    </a>
  </p>
</footer>
```

### 8.3 Manejar unsubscribes
```typescript
const handleUnsubscribe = async (userId: string) => {
  // Actualizar BD
  await db.users.update(userId, {
    emailOptIn: false,
  });
};
```

---

## 💰 PLANES

| Plan | Costo | Límite |
|------|-------|--------|
| **Gratis** | $0 | 100 emails/día |
| **Essentials** | $20/mes | 5,000 emails/mes |
| **Pro** | $90/mes | 50,000 emails/mes |
| **Advanced** | $300+ | Custom |

---

## 📞 SENDGRID SUPPORT

```
Centro de ayuda: https://docs.sendgrid.com
Email soporte: support@sendgrid.com
Chat (plan pago): Dashboard → Help
```

---

## ✅ CHECKLIST FINAL

```
✅ Cuenta SendGrid creada
✅ Email verificado
✅ API Key generada
✅ API Key en .env.local
✅ Dominio agregado
✅ 3 registros DNS verificados (esperar 48h)
✅ Librería instalada (npm install)
✅ Servicio de email creado (email.ts)
✅ Plantillas creadas (emailTemplates.ts)
✅ Email de prueba enviado
✅ Email recibido correctamente
✅ Logo y firma agregados (opcional)
✅ Links de unsubscribe añadidos
✅ Nombres de emails dinámicos
✅ Probado en producción
```

---

**Tiempo total:** ~30 minutos (sin esperar DNS)  
**Próximo paso:** Testing interno

---

**EJEMPLOS DE EMAILS A ENVIAR:**

1. ✉️ Bienvenida + verificación (signup)
2. ✉️ Confirmación de reserva (booking)
3. ✉️ Recordatorio 1 hora antes del viaje
4. ✉️ Recibo de pago (post-viaje)
5. ✉️ Solicitud de calificación (post-viaje)
6. ✉️ Cancelación de viaje (si aplica)
7. ✉️ Recuperación de contraseña
8. ✉️ Confirmación de cambio de email
9. ✉️ Reportar problema/disputa
10. ✉️ Newsletter (opcional)

¿Necesitas ayuda con algún email específico?
