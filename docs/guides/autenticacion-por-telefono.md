# Autenticación por número de teléfono — InstaJobs

## Descripción general

InstaJobs **no usa correo electrónico ni contraseña**. El único método de acceso es el número de teléfono celular colombiano, verificado mediante un código OTP (One-Time Password) enviado por SMS.

Este mismo flujo sirve para **registro y para inicio de sesión**: si el número ya existe en el sistema, el usuario inicia sesión; si es nuevo, el sistema crea la cuenta automáticamente.

---

## Tecnología utilizada

| Componente | Servicio |
|---|---|
| Autenticación | Supabase Auth (proveedor: Phone/OTP) |
| Envío de SMS | Twilio (integrado con Supabase) |
| Prefijo telefónico | Colombia únicamente: `+57` |

---

## Flujo paso a paso

### Paso 1 — Pantalla de bienvenida

El usuario abre la app y ve la pantalla de bienvenida con dos botones: **Ingresar** y **Registrarse**. Ambos dirigen al mismo flujo — no hay distinción entre crear cuenta e iniciar sesión.

---

### Paso 2 — Ingresar número de teléfono (`PhoneScreen`)

- El usuario escribe su número celular de **10 dígitos** (sin prefijo — el `+57` se agrega automáticamente).
- Ejemplo válido: `3101234567`
- El botón **Enviar código** se habilita solo cuando el número tiene 10 dígitos.
- Al presionar, la app llama a `sendOtp(phone)` que invoca `supabase.auth.signInWithOtp({ phone: '+57' + phone })`.
- Supabase envía un SMS con un código de 6 dígitos al número ingresado vía Twilio.

> **Nota:** Solo funciona con números colombianos por ahora. Soporte internacional está planificado.

---

### Paso 3 — Verificación del código OTP (`OTPScreen`)

- El usuario ingresa el código de **6 dígitos** recibido por SMS.
- Los campos avanzan automáticamente al siguiente dígito al escribir.
- Si el código es incorrecto, muestra alerta y limpia los campos.
- Si el usuario no recibió el SMS, puede presionar **"¿No llegó el código? Reenviar"** para solicitar uno nuevo.
- Al completar los 6 dígitos, la verificación se ejecuta automáticamente (sin necesidad de presionar un botón adicional).
- La función `verifyOtp(phone, otp)` llama a `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- Supabase devuelve una **sesión activa** con el `user.id` del usuario.

---

### Paso 4 — Detección de usuario nuevo o existente

Después de la verificación exitosa, el `AuthProvider` consulta la tabla `users` en Supabase:

- **Si el usuario YA existe** (número registrado previamente): se carga su perfil y se redirige directamente a la pantalla de inicio (`HomeScreen`). El proceso de registro no se vuelve a mostrar.

- **Si el usuario es NUEVO** (primera vez que usa ese número): se marca `isNewUser = true` y se redirige al flujo de configuración inicial (Pasos 5 y 6).

---

## Diagrama del flujo

```
Abrir app
    │
    ▼
WelcomeScreen
    │
    ▼
PhoneScreen ──► Ingresa número (+57XXXXXXXXXX)
    │
    ▼
[Supabase envía SMS con código OTP vía Twilio]
    │
    ▼
OTPScreen ──► Ingresa código de 6 dígitos
    │
    ▼
[Supabase verifica OTP y crea sesión]
    │
    ├── Usuario EXISTENTE ──────────────────► HomeScreen
    │
    └── Usuario NUEVO
            │
            ▼
        RoleScreen ──► Elige rol (cliente o trabajador)
            │
            ▼
        OnboardingScreen ──► Completa perfil + acepta términos
            │
            ▼
        HomeScreen
```

---

## Comportamiento de sesión

- La sesión se mantiene activa de forma persistente — el usuario **no necesita volver a ingresar su número** cada vez que abre la app.
- La sesión se invalida únicamente si el usuario presiona **"Cerrar sesión"** desde su perfil.
- Si Supabase no puede resolver la sesión (error de red severo), el usuario ve la pantalla de carga hasta que haya conexión.

---

## Validaciones aplicadas

| Validación | Regla |
|---|---|
| Longitud del número | Exactamente 10 dígitos |
| Formato colombiano | Debe empezar por `3` (líneas móviles) |
| WhatsApp (onboarding trabajador) | 10 dígitos, empieza por `3` |
| Código OTP | Exactamente 6 dígitos numéricos |
| Términos y condiciones | Deben aceptarse para completar el registro |
