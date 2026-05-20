# 🔔 PUSH NOTIFICATIONS ANDROID - DÍA 3 PLAN

**Objetivo**: Agregar soporte para notificaciones push en Android  
**Tiempo**: 4-6 horas  
**Risk**: MEDIUM (depende de Firebase + Google Play)  
**Equipo**: 2 personas

---

## 📊 ESTADO ACTUAL

```
✅ iOS: usePushNotifications funciona
❌ Android: NO soportado
📝 Expo Notifications instalado
```

---

## 🎯 ARQUITECTURA FINAL

```
APP (Android)
   ↓
Expo Notifications + FCM (Firebase Cloud Messaging)
   ↓
Google Firebase
   ↓
Backend sends notification via FCM API
   ↓
Device receives push notification
   ↓
User sees toast/banner notification
```

---

## 🔧 PASO 1: FIREBASE SETUP (90 MIN)

### 1A: Crear Firebase Project

1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project"
3. Nombre: "Trive" (o lo que uses)
4. Disable Google Analytics (no necesario)
5. Click "Create project"

### 1B: Agregar Android App a Firebase

1. En Firebase Console, click "+"  → "+ Add app"
2. Seleccionar "Android"
3. **Package name**: Ir a `app.json` en tu proyecto y copiar el `expo.android.package`
   ```json
   // app.json
   "android": {
     "package": "com.yourcompany.trive"  ← COPIAR ESTE
   }
   ```
4. Click "Register app"
5. NO descargar google-services.json aún (Expo lo maneja)
6. Click "Next" → "Next" → "Done"

### 1C: Obtener Cloud Messaging Keys

1. En Firebase Console → Settings (⚙️)
2. Click "Cloud Messaging" tab
3. Encontrar:
   - **Sender ID** (Project número)
   - **Server API Key**
   
Copiar estos valores → En Supabase setup más adelante

---

## ⚙️ PASO 2: EXPO CONFIGURATION (45 MIN)

### 2A: Actualizar `app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#007AFF"
        }
      ]
    ],
    "android": {
      "googleServiceFile": "./google-services.json",
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ]
    }
  }
}
```

### 2B: Descargar google-services.json

1. En Firebase Console → agregar app Android (si no hiciste)
2. Download `google-services.json`
3. **Guardar en raíz del proyecto** (mismo nivel que app.json)

```
trive-app/
  ├── app.json
  ├── google-services.json  ← AQUÍ
  ├── src/
```

### 2C: Actualizar `eas.json`

Si no existe, crear:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## 🪝 PASO 3: UPDATE HOOK - usePushNotifications.ts (90 MIN)

### REEMPLAZAR: `src/hooks/usePushNotifications.ts`

Este es el archivo actualizado para soportar Android:

```typescript
import { useEffect, useState, useCallback } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import {
  getPushNotificationToken,
  registerPushToken,
  loadNotificationPreferences,
  saveNotificationPreferences,
  setupNotificationListeners,
} from '../services/pushNotifications'

export interface NotificationPreferences {
  push: boolean
  email: boolean
  sms: boolean
}

// Push disponible en iOS + Android (real devices)
const isPushAvailableOnPlatform = Platform.OS === 'ios' || Platform.OS === 'android'

export const usePushNotifications = (userId?: string) => {
  const [isDeviceSupported, setIsDeviceSupported] = useState(false)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // INICIALIZAR NOTIFICACIONES PUSH
  // ============================================

  useEffect(() => {
    // Verificar soporte de plataforma
    if (!isPushAvailableOnPlatform) {
      setIsDeviceSupported(false)
      return
    }

    // Solo en dispositivos físicos (no emulador/simulator)
    if (!Device.isDevice) {
      console.warn('⚠️  Push notifications: Solo en dispositivos físicos')
      setIsDeviceSupported(false)
      return
    }

    setIsDeviceSupported(true)

    // Inicializar
    const initNotifications = async () => {
      try {
        setLoading(true)

        // Android: Crear notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          })
        }

        // Cargar preferencias guardadas
        const savedPreferences = await loadNotificationPreferences()
        setPreferences(savedPreferences)

        // Si push habilitado, registrar token
        if (savedPreferences.push && userId) {
          const token = await getPushNotificationToken()
          if (token) {
            setPushToken(token)
            await registerPushToken(userId, token)
            console.log('✅ Push token registered:', token.substring(0, 20) + '...')
          }
        }

        // Configurar listeners
      } catch (err: any) {
        setError(err.message || 'Error al configurar notificaciones')
        console.error('❌ Error initializing push notifications:', err)
      } finally {
        setLoading(false)
      }
    }

    initNotifications()

    // Configurar listeners para notificaciones recibidas
    const unsubscribeForeground = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación recibida en foreground:', notification)
    })

    // Configurar listeners para notificaciones tocadas
    const unsubscribeResponse = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notificación tocada:', response.notification)
      // Aquí navegar a la pantalla correspondiente si es necesario
    })

    return () => {
      unsubscribeForeground.remove()
      unsubscribeResponse.remove()
    }
  }, [userId])

  // ============================================
  // TOGGLE PUSH NOTIFICATIONS
  // ============================================

  const togglePushNotifications = useCallback(
    async (enabled: boolean) => {
      try {
        const newPreferences = { ...preferences, push: enabled }
        setPreferences(newPreferences)
        await saveNotificationPreferences(newPreferences)

        if (enabled && userId && !pushToken) {
          const token = await getPushNotificationToken()
          if (token) {
            setPushToken(token)
            await registerPushToken(userId, token)
          }
        }

        console.log(`Push notifications ${enabled ? 'enabled' : 'disabled'}`)
      } catch (err: any) {
        setError(err.message || 'Error al actualizar preferencias')
        console.error('Error toggling push notifications:', err)
      }
    },
    [preferences, pushToken, userId]
  )

  return {
    loading,
    error,
    pushToken,
    isDeviceSupported,
    preferences,
    togglePushNotifications,
  }
}
```

**✅ CHECKPOINT**: Hook actualizado para Android

---

## 📝 PASO 4: ACTUALIZAR SERVICES (30 MIN)

### REVISAR: `src/services/pushNotifications.ts`

Verificar que tiene estas funciones (debería estar OK):

```typescript
// Debe tener:
- getPushNotificationToken()
- registerPushToken(userId, token)
- loadNotificationPreferences()
- saveNotificationPreferences(prefs)
- setupNotificationListeners()
```

Si algo falta, agregarlo:

```typescript
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'

export const getPushNotificationToken = async (): Promise<string | null> => {
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data
    return token
  } catch (err) {
    console.error('Error getting push token:', err)
    return null
  }
}

export const registerPushToken = async (userId: string, token: string): Promise<void> => {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      platform: require('react-native').Platform.OS,
      updated_at: new Date(),
    })

  if (error) throw error
}

// ... resto de funciones
```

---

## 🧪 PASO 5: TESTING (120 MIN)

### TEST 1: Verificar Token en App

```
Device (Android):
1. Instala app
2. Abre SettingsScreen
3. Habilita "Push Notifications"
4. ¿Ve toggle ON? ✅
5. Ve mensaje: "✅ Push token registered" en console ✅
6. Token guardado en BD:
   
   SELECT * FROM push_tokens WHERE user_id = 'YOUR_ID';
   → ¿Ves registro con token? ✅
```

### TEST 2: Enviar notificación de prueba

**Desde Backend/Supabase**:

```sql
-- Obtener token del usuario
SELECT token FROM push_tokens WHERE user_id = 'USER_ID' LIMIT 1;

-- Copiar el token
```

Luego, via cURL o Postman enviar a FCM API:

```bash
curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "COPIED_PUSH_TOKEN",
    "notification": {
      "title": "Hola Trive",
      "body": "Este es un mensaje de prueba",
      "sound": "default"
    }
  }'
```

**En device**:
- ¿Recibió notificación? ✅
- ¿Se reproduce sonido? ✅
- ¿Se puede tocar? ✅

### TEST 3: Notificación automática en Booking

When booking confirmado (ya existe trigger en DB):

```
Usuario A: Crea booking
↓
BD trigger: Insert notification
↓
Usuario B: 
- ¿Recibe notificación en app? ✅
- ¿Dice "Nuevo viaje confirmado"? ✅
```

---

## 📱 PASO 6: BUILD APK (60 MIN)

### 6A: Build local para testing

```bash
eas build --platform android --profile preview
```

Esperar ~15-20 min. Descarga APK.

### 6B: Instalar en device

```bash
# Copiar APK a device y instalar
adb install tue-apk-name.apk
```

O via link de EAS:
- EAS te da URL
- Abrir en device
- Click "Download"
- APK se instala

### 6C: Testing en device

1. Abrir app
2. Login
3. SettingsScreen
4. Habilitar Push
5. Token debe aparecer en SettingScreen
6. Enviar test notification (via curl)
7. Device debe recibir

---

## ⚠️ TROUBLESHOOTING

### ❌ "Push notifications not available"
**Causa**: Emulador en lugar de device real  
**Fix**: Usar Android real device

### ❌ "google-services.json not found"
**Causa**: Archivo en lugar equivocado  
**Fix**: Guardar en raíz (mismo nivel que app.json)

### ❌ "FCM error: invalid token"
**Causa**: Token expirado o inválido  
**Fix**: Regenerar token - borrar app/reinstalar

### ❌ "No notification received"
**Causa 1**: Network restringida en device  
**Fix**: Verificar WiFi/datos celulares

**Causa 2**: Notificación channels no creado (Android)  
**Fix**: `createNotificationChannelAsync` debe ejecutarse

---

## 📋 CHECKLIST - DÍA 3

```
PASO 1: Firebase Setup (90 min)
[ ] Firebase project creado
[ ] Android app agregada en Firebase
[ ] Obtenido Server API Key

PASO 2: Expo Config (45 min)
[ ] app.json actualizado
[ ] google-services.json descargado y guardado
[ ] eas.json existe

PASO 3: Hook (90 min)
[ ] usePushNotifications.ts actualizado para Android
[ ] Compilación sin errores
[ ] Android channel creado

PASO 4: Service (30 min)
[ ] pushNotifications.ts tiene todas funciones
[ ] registerPushToken funciona

PASO 5: Testing (120 min)
[ ] Token registra en device
[ ] Token savedeen BD
[ ] Test notification llega
[ ] Usuario ve notificación
[ ] Sonido reproduce

PASO 6: Build (60 min)
[ ] APK buildea sin errores
[ ] APK instala en device real
[ ] App funciona

TOTAL: 4-6 horas
```

---

## 🎬 PRÓXIMO

Una vez completado:
1. Commit: `git commit -m "feat: add android push notifications"`
2. Testing en device real
3. ENTONCES: Admin Dashboard (DÍA 4)

---

**Status**: 🟢 READY AFTER CHAT

Primero termina Chat (DÍA 2), luego esto (DÍA 3).

