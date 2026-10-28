# 🔧 Solución: Email Rate Limit Exceeded

## ¿Por qué ocurre este error?

Supabase tiene **límites de velocidad (rate limits)** en el envío de correos de verificación:
- **Plan Gratuito:** Máximo 1 correo por usuario cada ~60 minutos
- **Múltiples intentos rápidos:** Si el usuario hace clic 2+ veces en "Registrarse" rápidamente

## ✅ Soluciones Implementadas

### 1. **Debounce en el Botón (YA ACTIVADO)**
```typescript
// RegisterScreen.tsx - Debounce de 3 segundos
const lastRegisterAttempt = useRef<number>(0)
if (now - lastRegisterAttempt.current < 3000) {
  Alert.alert('Espera un momento', 'Por favor espera unos segundos antes de intentar nuevamente')
  return
}
```
✅ Previene múltiples clics accidentales

### 2. **Mejor Manejo de Mensajes de Error (YA ACTIVADO)**
```typescript
// Detecta y muestra el error de rate limit de forma clara
if (errorMessage.includes('rate limit') || errorMessage.includes('too_many_requests')) {
  errorMessage = 'Demasiados intentos. Por favor espera 1 hora antes de intentar nuevamente.'
}
```
✅ El usuario sabe exactamente qué pasó y qué esperar

---

## 📋 Qué hacer cuando ocurre el error

**Opción A: Esperar (Método Recomendado para MVP)**
1. Usuario recibe el error
2. Espera 1 hora (el límite de Supabase)
3. Intenta registrarse de nuevo existosamente

**Opción B: Usar otro email**
- Registrarse con un correo electrónico diferente
- Funcionará inmediatamente sin esperar

---

## 🚀 Soluciones Adicionales (Para Producción)

Si el rate limit es un problema frecuente en producción, tienes estas opciones:

### Opción 1: Desactivar Email Automático y Hacerlo Manual
```typescript
// En useAuth.ts - Desactivar auto-email
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: name, phone },
    emailRedirectTo: undefined // Desactivar
  },
});
// Luego enviar manualmente: await sendEmailVerification(email)
```

### Opción 2: Usar SMS en lugar de Email
```typescript
// Cambiar a verificación por teléfono en lugar de email
// Ya tienes LoginPhoneScreen listo
// Esto evita completamente los límites de Supabase
```

### Opción 3: Upgrade de Plan en Supabase
- Plan **Pro** ($5-10/mes) tiene límites más altos
- Plan **Enterprise** sin límites

### Opción 4: Servicio SMTP Personalizado
- Configurar un provider como SendGrid/Mailgun
- Supabase lo permite en Settings → Email Configuration
- Más control y límites más altos

---

## 📊 Estado Actual (MVP)

| Aspecto | Estado |
|--------|--------|
| Debounce | ✅ Activado |
| Manejo de errores | ✅ Mejorado |
| Rate Limit Detection | ✅ Sí |
| Mensaje claro al usuario | ✅ Sí |
| Plan Producción | ⏳ A considerar |

---

## 🧪 Para Probar

1. **Test 1: Intento Normal**
   - Registrarse una vez → Funciona bien

2. **Test 2: Doble Clic Rápido**
   - Hacer clic 2 veces en "Crear Cuenta" rápidamente
   - Debe mostrar: "Por favor espera unos segundos antes de intentar nuevamente"

3. **Test 3: Rate Limit de Supabase**
   - Registrarse con éxito
   - Inmediatamente intentar con otro email
   - Si Supabase devuelve rate limit, verás: "Demasiados intentos. Por favor espera 1 hora"

---

## ✨ Recomendación

**Para MVP:** Las soluciones actuales son suficientes
- El debounce evita la mayoría de errores
- Los mensajes claros responden al usuario

**Para Producción:** Considerar la Opción 1 o 3
- Más control sobre verificación de email
- Mejor experiencia de usuario

