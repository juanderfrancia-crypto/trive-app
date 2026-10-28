# 🔔 Push Notifications Implementation - Trive App

## Overview
Sistema completo de notificaciones push configurado en Trive usando Expo Notifications y AsyncStorage para persistencia de preferencias.

## Architecture

### 1. **Services** (`src/services/pushNotifications.ts`)
Servicio central que maneja:
- Configuración del manejador de notificaciones (`configureNotificationHandler`)
- Obtención de tokens de push (`getPushNotificationToken`)
- Registro de tokens en Supabase (`registerPushToken`)
- Persistencia de preferencias en AsyncStorage
- Setup de listeners de notificaciones

**Key Functions:**
- `configureNotificationHandler()` - Configura cómo se manejan las notificaciones
- `getPushNotificationToken()` - Obtiene token del dispositivo (solo en dispositivos físicos)
- `registerPushToken(userId, token)` - Registra token en Supabase para enviar notificaciones
- `saveNotificationPreferences()` - Persiste preferencias del usuario
- `loadNotificationPreferences()` - Carga preferencias guardadas
- `setupNotificationListeners()` - Configura listeners para notificaciones entrantes

### 2. **Hooks** (`src/hooks/usePushNotifications.ts`)
Hook React que abstrae la lógica de notificaciones:
- Inicialización y verificación de dispositivo
- Carga de preferencias guardadas
- Toggle de preferencias (Push, Email, SMS)
- Manejo de tokens de push

**Return Values:**
```typescript
{
  pushToken: string | null,           // Token actual del dispositivo
  preferences: {                       // Preferencias del usuario
    push: boolean,
    email: boolean,
    sms: boolean
  },
  isDeviceSupported: boolean,          // ¿Es dispositivo físico?
  loading: boolean,                    // Estado de carga
  error: string | null,                // Mensajes de error
  togglePushNotifications: (enabled) => Promise<void>,
  toggleEmailNotifications: (enabled) => Promise<void>,
  toggleSmsNotifications: (enabled) => Promise<void>,
}
```

### 3. **UI Integration** (`src/screens/SettingsScreen.tsx`)
- Importa `usePushNotifications` con el userId del usuario
- Muestra switches para cada tipo de notificación
- Deshabilita push en simuladores
- Persiste automáticamente cambios en AsyncStorage

## Installation & Setup

### 1. Install Package
```bash
npm install expo-notifications
```

### 2. Expo Go vs Development Builds

**Expo Go (Current Setup - Limited):**
- Works on iOS with full push support
- Android support removed in SDK 53+
- Good for development and testing on iOS
- Email/SMS still work on both platforms

**Development Build (For Full Android Support):**
```bash
# Install EAS CLI
npm install -g eas-cli

# Create development build for Android
eas build --platform android --profile development

# Install the generated APK on your device
```

[Learn more about development builds](https://docs.expo.dev/develop/development-builds/introduction/)
Ejecutar las migraciones en `PUSH_NOTIFICATIONS_SETUP.sql`:
```sql
ALTER TABLE profiles ADD COLUMN push_token TEXT;
CREATE INDEX idx_push_token ON profiles(push_token);
ALTER TABLE profiles ADD COLUMN notification_preferences JSONB 
  DEFAULT '{"push": true, "email": true, "sms": false}';
```

### 3. App Configuration
- El `AppNavigator.tsx` automáticamente llama `configureNotificationHandler()` al iniciar
- El hook `usePushNotifications` maneja todo el ciclo de vida

## How It Works

### Push Notifications Flow
```
1. User enables push in Settings
   ↓
2. usePushNotifications hook requests permission (if needed)
   ↓
3. getPushNotificationToken() obtiene token del dispositivo
   ↓
4. registerPushToken() guarda token en Supabase (users table)
   ↓
5. Backend puede usar el token para enviar notificaciones
   ↓
6. setupNotificationListeners() recibe y maneja notificaciones
```

### Preferences Storage
```
AsyncStorage: notification_preferences
{
  "push": true,   // Notificaciones push activadas
  "email": true,  // Notificaciones por email
  "sms": false    // SMS desactivado
}
```

## Usage Examples

### Enable/Disable Push Notifications
```typescript
const { togglePushNotifications, preferences } = usePushNotifications(userId);

// Toggle
await togglePushNotifications(!preferences.push);
```

### Get Push Token for Backend
```typescript
const { pushToken } = usePushNotifications(userId);

// Usar pushToken para enviar notificaciones:
// POST /api/send-notification
// { "token": pushToken, "title": "...", "body": "..." }
```

### Custom Notification Handler
```typescript
import { setupNotificationListeners } from '../services/pushNotifications';

// En AppNavigator o componente
useEffect(() => {
  const cleanup = setupNotificationListeners((notification) => {
    console.log('Notificación recibida:', notification);
    // Manejar notificación entrante
  });
  
  return cleanup;
}, []);
```

## Device Compatibility

### ✅ Supported
- Dispositivos físicos iOS
- Development builds (todas plataformas)
- Expo Go en iOS

### ❌ Not Supported / Limitations
- **Expo Go Android** (SDK 53+) - Push notifications fueron removidas de Expo Go
  - Solución: Usar development build con `eas build --platform android --profile development`
  - Email/SMS notifications aún disponibles en Expo Go
- Simuladores/Emuladores (no son dispositivos físicos)
- Web (sin Expo)

## Security Considerations

✅ **Implemented:**
- Tokens almacenados en Supabase (no en cliente)
- Permisos del usuario solicitados explícitamente
- AsyncStorage encriptado (plataforma dependent)
- Solo registra token si usuario da permiso

⚠️ **To Implement:**
- Rate limiting en backend para envío de notificaciones
- Validación de tokens expirados
- Logging de notificaciones enviadas
- Purga periódica de tokens inválidos

## Backend Integration

### Sending Notifications
```typescript
// Backend: Node.js/Supabase Edge Function example
import * as admin from "expo-server-sdk";

const expo = new admin.Expo();

const messages = [
  {
    to: pushToken,
    sound: "default",
    title: "¡Tu viaje está confirmado!",
    body: "Tu conductor está llegando en 5 minutos",
    data: {
      type: "trip_update",
      tripId: "trip-123",
    },
  },
];

const tickets = await expo.sendPushNotificationsAsync(messages);
```

### Query Tokens
```sql
-- Obtener tokens activos para un grupo de usuarios
SELECT id, email, push_token 
FROM profiles 
WHERE push_token IS NOT NULL 
  AND notification_preferences->>'push' = 'true'
  AND id IN ('user1', 'user2', ...);
```

## Testing

### Manual Testing
1. En SettingsScreen, toggle "Notificaciones Push"
2. Verificar que el switch actualiza state y AsyncStorage
3. En dispositivo físico, verificar que el token se registra

### Test Notification
```typescript
import { sendTestNotification } from '../services/pushNotifications';

// En un botón de debug
await sendTestNotification();
```

## Error Handling

```typescript
const { preferences, isDeviceSupported, error } = usePushNotifications(userId);

if (!isDeviceSupported) {
  // Mostrar mensaje: "Push notifications not available on simulator"
}

if (error) {
  // Mostrar error: error.message
}
```

## Future Enhancements

- [ ] Push notifications categorized (trips, messages, promotions)
- [ ] Notification scheduling
- [ ] Deep linking from notifications to relevant screens
- [ ] Analytics: track notification delivery rates
- [ ] Quiet hours: mute notifications during specific times
- [ ] In-app notification badge counter
- [ ] Notification history screen

## Database Schema

### profiles table changes
```sql
push_token TEXT                    -- Expo push token
notification_preferences JSONB     -- {"push": true, "email": true, "sms": false}
```

## Troubleshooting

### "expo-notifications was removed from Expo Go" Error
**Cause:** Android push notifications removed in SDK 53+ Expo Go
**Solution:** 
- Option 1: Use iOS device for testing push
- Option 2: Create development build for Android
- Option 3: Test with Email/SMS notifications instead

### "Token not registered"
- Verify user is on physical device
- Check permissions are granted
- Confirm userId is passed to hook

### "Notifications not arriving"
- Backend might not have correct token format
- Token might have expired (refresh on app launch)
- Check notification content size (< 4KB)

### "AsyncStorage persisting old values"
- Clear app cache: Settings → Apps → Trive → Clear Cache
- Or force sync: Toggle notification + toggle back

### Switch disabled in Settings
- **iOS Expo Go:** Should be enabled
- **Android Expo Go:** Disabled (expected behavior)
  - Shows message: "Requiere build de desarrollo"
  - Use development build to enable
- **Simulator:** Disabled (not a physical device)

## References

- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Push Notification Best Practices](https://docs.expo.dev/push-notifications/sending-notifications/)
