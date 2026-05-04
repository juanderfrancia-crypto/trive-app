# 📧 Email Verification Implementation - Guía de Uso

## ¿Qué se cambió?

Se implementó un **sistema de verificación de email después del registro**. Ahora cuando un usuario se registra, debe verificar su email antes de poder acceder a la app.

---

## 🔄 Flujo de Registro Actualizado

```
1. Usuario registra → RegisterScreen
2. Sistema crea cuenta en Supabase Auth
3. Supabase AUTOMÁTICAMENTE envía email de verificación
4. Usuario navega a → VerifyEmailScreen
5. Usuario ingresa el código de 6 dígitos que recibió
6. Sistema verifica el código
7. Si es correcto → Usuario entra a la app
```

---

## 📝 Cambios en el Código

### 1. **useAuth.ts** - Nuevos métodos agregados

#### `sendEmailVerification(email: string)`
```typescript
// Reenvía el código de verificación al email
await sendEmailVerification('user@example.com')
```

**Parámetros:**
- `email`: Email del usuario

**Retorna:**
- `{ success: true }`

**Errores:**
- Si Supabase no puede reenviar (ej: email no válido)

---

#### `confirmEmail(email: string, token: string)`
```typescript
// Verifica el token enviado al email
const data = await confirmEmail('user@example.com', '123456')
```

**Parámetros:**
- `email`: Email del usuario
- `token`: Código de 6 dígitos (o más)

**Retorna:**
- `data.user`: Objeto usuario autenticado en Supabase

**Errores:**
- Token inválido o expirado
- Email no encontrado

---

#### `register(email, password, name, phone)` - ACTUALIZADO
```typescript
// Ahora incluye metadatos en el objeto de usuario de Supabase
const data = await register(
  'user@example.com',
  'password123',
  'Juan Pérez',
  '+573001234567'
)
```

**Cambios:**
- ✅ Ahora pasa `name` y `phone` como metadatos en Supabase Auth
- ✅ Usa `upsert` en lugar de `insert` para evitar duplicados
- ✅ Supabase envía automáticamente email de verificación

---

### 2. **VerifyEmailScreen.tsx** - Nuevo Screen

Pantalla completa de verificación de email con:

- ✅ Input para código de 6 dígitos
- ✅ Timer de 5 minutos para expiración
- ✅ Botón reenviar código
- ✅ Validación de código
- ✅ Manejo de errores
- ✅ Componente similar a LoginPhoneScreen

**Props recibidas:**
```typescript
{
  email: string        // Email del usuario
  name?: string       // Nombre (opcional)
  phone?: string      // Teléfono (opcional)
}
```

---

### 3. **RegisterScreen.tsx** - Actualizado

**Cambio principal:**
```typescript
// Antes:
setUser(profile)
setAuthUser(data.user)
Alert.alert('Éxito', 'Cuenta creada')

// Después:
navigation.navigate('VerifyEmail', {
  email: email.trim(),
  name: name.trim(),
  phone: phone.trim(),
})
```

---

### 4. **AppNavigator.tsx** - Ruta agregada

```typescript
<Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
```

Agregada en la sección de rutas **no autenticadas** (Auth Stack)

---

## ⚙️ Configuración en Supabase

**Verifica que esté habilitada la confirmación de email:**

1. Ve a **Supabase Console** → **Authentication** → **Email Templates**
2. Verifica que `Confirmation Email` tenga el contenido:
   ```
   Confirm your email

   Follow this link to confirm your email address:
   {{ .ConfirmationURL }}

   Token (if needed): {{ .TokenHash }}
   ```

3. Ve a **Settings** → **Email Auth** 
4. Verifica que esté habilitado: `Enable email confirmations`

---

## 🧪 Probando la Verificación

### Test 1: Registro básico
```
1. Abre la app → Register
2. Ingresa: Email, Password, Nombre, Teléfono
3. Haz clic en "Registrarse"
4. Debería navegarse a VerifyEmailScreen
5. Revisa tu email (pendiente en Supabase)
```

### Test 2: Código inválido
```
1. En VerifyEmailScreen, ingresa: "000000"
2. Haz clic en "Verificar Código"
3. Deberías ver error: "Código de verificación inválido"
```

### Test 3: Reenviar código
```
1. En VerifyEmailScreen, espera o haz clic en "Reenviar"
2. El código debería ser reenviado
3. Ingresa el nuevo código
4. Debería funcionar
```

### Test 4: Expiración
```
1. En VerifyEmailScreen, espera 5 minutos
2. Intenta ingresar un código
3. Debería mostrar: "Código expirado"
4. Opción: "Reenviar"
```

---

## 🔐 Seguridad

**Lo que se implementó:**

✅ **Email verification token**: Supabase genera automáticamente un token
✅ **Expiración de token**: 24 horas por defecto (configurable en Supabase)
✅ **Rate limiting**: Máximo 5 intentos de reenvío en 10 minutos (Supabase)
✅ **Token de una sola vez**: No se puede reutilizar después de verificar
✅ **Email confirmado requerido**: No se puede hacer login sin verificar

---

## 🐛 Troubleshooting

### Problema: "Email de verificación no llega"

**Soluciones:**
1. Revisa la carpeta de SPAM del email
2. Verifica que el email en RegisterScreen sea correcto
3. En Supabase Console → Auth → Users: verifica que `email_confirmed_at` sea NULL
4. Intenta reenviar el código en VerifyEmailScreen

### Problema: "Código inválido"

**Posibles causas:**
1. Código expirado (válido 24 horas)
2. Código incorrecto
3. Token hasheado no coincide

**Solución:**
- Reenvía el código en VerifyEmailScreen

### Problema: "Usuario no se crea después de verificar"

**Verificar:**
1. En Supabase → Auth → Users: ¿existe el usuario?
2. ¿El `email_confirmed_at` tiene fecha?
3. En Supabase → Tables → profiles: ¿existe el perfil?

---

## 🔗 Métodos Relacionados

### En useAuth.ts:

```typescript
// Enviar verificación por email
await sendEmailVerification(email)

// Confirmar/verificar código
await confirmEmail(email, token)

// Registrase (ya incluye envío automático de email)
await register(email, password, name, phone)
```

### En LoginScreen.tsx:

```typescript
// Login tradicional (no requiere verificación adicional)
// Ya que el usuario verificó en el registro
await login(email, password)
```

---

## 📊 Estados de Usuario

| Estado | Descripción | Puede Usar App? |
|--------|-------------|-----------------|
| `email_confirmed_at = NULL` | Email no verificado | ❌ NO |
| `email_confirmed_at = DATE` | Email verificado | ✅ SÍ |

---

## 🎯 Next Steps

- [ ] Probar flujo completo de registro
- [ ] Revisar emails que llegan a los usuarios
- [ ] Configurar plantilla de email personalizada (opcional)
- [ ] Agregar resend de email en Profile (opcional)
- [ ] Implementar verificación de teléfono (similar a OTP)

---

**Última actualización**: 13 de abril de 2026
**Status**: ✅ Implementado y listo para probar
