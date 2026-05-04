# 🔧 Solución: App Vuelve al Onboarding al Verificar Email

## ❌ Problema Original

Cuando salías de la app durante la verificación de email (para copiar el código), al volver la app reiniciaba desde el **onboarding** en lugar de mantener el estado de verificación pendiente.

### ¿Por qué sucedía?

1. **Estado no persistido**: El Zustand store (`hasSeenOnboarding`) se borraba al cerrar la app
2. **Sin verificación pendiente**: No había forma de saber "estoy esperando código de verificación"
3. **Flujo incompleto**: AppNavigator no diferenciaba entre:
   - Usuario nuevo (sin onboarding visto)
   - Usuario verificando email (sin sesión activa pero con verificación pendiente)
   - Usuario autenticado (con sesión activa)

---

## ✅ Solución Implementada

### 1️⃣ **Persistencia en AsyncStorage**

📄 `src/store/useAppStore.ts` - Cambios:
- Agregado `AsyncStorage` import
- `setHasSeenOnboarding()` ahora guarda en storage
- Nuevo estado: `pendingVerificationEmail`, `pendingVerificationName`, `pendingVerificationPhone`
- New methods: `setPendingVerification()`, `clearPendingVerification()`

```typescript
// Ejemplo de uso:
const { setPendingVerification } = useAppStore.getState()
setPendingVerification(email, name, phone)
// Automáticamente persiste en AsyncStorage
```

### 2️⃣ **Guardar Verificación al Registrar**

📄 `src/screens/RegisterScreen.tsx` - Cambios:
```typescript
const handleRegister = async () => {
  // ... validación ...
  const data = await register(email, password, name, phone)
  
  if (data?.user) {
    // 👇 NUEVO: Guardar estado de verificación
    const { setPendingVerification } = useAppStore.getState()
    setPendingVerification(email, name, phone)
    
    navigation.navigate('VerifyEmail', { ... })
  }
}
```

### 3️⃣ **Limpiar Verificación al Confirmar Email**

📄 `src/screens/VerifyEmailScreen.tsx` - Cambios:
```typescript
const handleVerifyEmail = async () => {
  const data = await confirmEmail(email, verificationCode)
  
  if (data?.user) {
    // Actualizar perfil...
    setUser({...})
    
    // 👇 NUEVO: Limpiar verificación pendiente
    const { clearPendingVerification } = useAppStore.getState()
    clearPendingVerification()
  }
}
```

### 4️⃣ **AppNavigator Restaura Estado & Redirige**

📄 `src/navigation/AppNavigator.tsx` - Cambios:

```typescript
useEffect(() => {
  const restoreState = async () => {
    // 1️⃣ Restaurar hasSeenOnboarding del storage
    const stored = await AsyncStorage.getItem('hasSeenOnboarding')
    if (stored !== null) {
      setHasSeenOnboarding(JSON.parse(stored))
    }

    // 2️⃣ Restaurar info de verificación pendiente
    const pendingVerif = await AsyncStorage.getItem('pendingVerification')
    if (pendingVerif !== null) {
      const { email, name, phone } = JSON.parse(pendingVerif)
      setPendingVerification(email, name, phone)
    }
  }
  
  restoreState()
}, [])

// Lógica de navegación:
return (
  <Stack.Navigator>
    {!isUserAuthenticated && pendingVerificationEmail && (
      // 👇 Si hay verificación pendiente → mostrar VerifyEmail directo
      <Stack.Screen 
        name="VerifyEmail" 
        component={VerifyEmailScreen}
        initialParams={{
          email: pendingVerificationEmail,
          name: pendingVerificationName,
          phone: pendingVerificationPhone,
        }}
      />
    )}

    {!isUserAuthenticated && !pendingVerificationEmail && (
      // Si NO hay verificación → mostrar Login/Register normally
      <>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        {/* ... */}
      </>
    )}

    {isUserAuthenticated && (
      // Si SÍ está autenticado → mostrar app principal
      <Stack.Screen name="Main" component={TabNavigator} />
    )}
  </Stack.Navigator>
)
```

---

## 🔄 Flujo Completo Ahora

### Caso 1: Primer uso (sin onboarding visto)
```
1. App abre → No hay hasSeenOnboarding → Mostrar Onboarding
2. Usuario completa onboarding → setHasSeenOnboarding(true) → guardado en storage
3. Siguiente inicio → Lee storage → Salta onboarding ✅
```

### Caso 2: Usuario registrándose y verificando
```
1. Abre RegisterScreen → Ingresa datos → Presiona "Crear cuenta"
2. Se crea usuario en Supabase Auth (sin confirmar email aún)
3. registerScreen guarda: setPendingVerification(email, name, phone) → storage
4. Navega a VerifyEmailScreen
5. Usuario sale de app para copiar código del email ❌
6. App cierra - estado se persiste en storage
7. Usuario reabre app
   └── AppNavigator.useEffect() restaura del storage
   └── Lee pendingVerificationEmail ✅
   └── Navega automáticamente a VerifyEmailScreen con los datos
8. Usuario ingresa código → Email verificado
9. clearPendingVerification() borra del storage
10. Usuario está autenticado → Navega a Main (app principal) ✅
```

### Caso 3: Usuario cierra app antes de verificar
```
1. Usuario estaba en VerifyEmailScreen
2. Cierra app sin confirmar
3. Reabre app
   └── AppNavigator detecta pendingVerificationEmail
   └── Restaura VerifyEmailScreen automáticamente ✅
   └── Usuario puede completar verificación
```

---

## 📋 Estados del Storage

### 1. `hasSeenOnboarding` (boolean)
```json
true  // Usuario ya vio el onboarding
```

### 2. `pendingVerification` (object)
```json
{
  "email": "usuario@test.com",
  "name": "Juan Pérez",
  "phone": "+57 300 123 4567"
}
```

Cuando se completa la verificación → Se borra automáticamente

---

## 🧪 Cómo Probar

### Test 1: Verificación Normal
```
1. Abrí app → veo onboarding
2. Completo onboarding → comienzo login
3. Entro a Registrarse → Lleno formulario → "Crear cuenta"
4. Me aparece VerifyEmailScreen
5. ✅ (No debería volver a onboarding)
```

### Test 2: Salir Durante Verificación
```
1. En VerifyEmailScreen
2. Presiono home/app switcher → app se minimiza
3. Abro otra app 30 segundos
4. Regreso a Trive → debería aparecer VerifyEmailScreen automáticamente ✅
5. Puedo copiar código y continuar normalmente
```

### Test 3: Cerrar Completamente App
```
1. En VerifyEmailScreen
2. Force-close la app (configuración → forzar cierre)
3. Reabre app
4. Debería mostrar VerifyEmailScreen con mismo email ✅
5. El contador no debería resetear (o debería resetear según UX deseado)
```

### Test 4: Completar Verificación
```
1. En VerifyEmailScreen
2. Ingreso código válido
3. ✅ Email verificado
4. Navego automáticamente a Main (app principal)
5. Cierre app
6. Reabre app → debería estar en Main (autenticado) ✅
```

---

## 🛠️ Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/store/useAppStore.ts` | + AsyncStorage, + pendingVerification state, + setPendingVerification(), + clearPendingVerification() |
| `src/screens/RegisterScreen.tsx` | handleRegister() ahora llama setPendingVerification() |
| `src/screens/VerifyEmailScreen.tsx` | handleVerifyEmail() ahora llama clearPendingVerification() |
| `src/navigation/AppNavigator.tsx` | + useEffect para restaurar storage, lógica mejorada de Stack.Navigator |

---

## ⚠️ Notas Importantes

1. **AsyncStorage viene con Expo**: No necesita instalación adicional
2. **Límite de storage**: AsyncStorage tiene ~10MB por app (suficiente)
3. **Sincronización**: Si el usuario abre en multiple dispositivos, NO se sincroniza (cada device tiene su storage local)
4. **Logout**: Al hacer logout, `clearPendingVerification()` se ejecuta automáticamente

---

## 🚀 Próximos Pasos

- [ ] Probar en Android real
- [ ] Probar en iOS (si disponible)
- [ ] Considerar agregar timeout: Si pasan >24h sin verificar, limpiar automáticamente
- [ ] Considerar agregar botón "Cancel" en VerifyEmailScreen para limpiar estado

