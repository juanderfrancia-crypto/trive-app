# 🔔 Sistema de Notificaciones - Guía Completa

## 📋 Resumen

Se ha implementado un **sistema de notificaciones en tiempo real** que permite:
- ✅ Enviar notificaciones a usuarios
- ✅ Marcar como leídas
- ✅ Eliminar notificaciones
- ✅ Contar no leídas en tiempo real
- ✅ Sincronización automática con Supabase

---

## 🎯 Componentes Implementados

### 1. **Hook: `useNotifications`** (`src/hooks/useNotifications.ts`)
Maneja toda la lógica de notificaciones.

**Funciones:**
```typescript
const {
  notifications,          // Array de notificaciones
  loading,               // State de carga
  error,                 // Errores
  unreadCount,           // Cantidad de no leídas
  fetchNotifications,    // Obtener todas
  markAsRead,           // Marcar 1 como leída
  markAllAsRead,        // Marcar todas como leídas
  deleteNotification,   // Eliminar
  createNotification,   // Crear nueva
} = useNotifications(userId);
```

### 2. **Pantalla: `NotificationsScreen`** (`src/screens/NotificationsScreen.tsx`)
Interfaz bonita para ver notificaciones.

**Características:**
- 🎨 UI responsive y bonita
- 📱 Iconos diferentes por tipo de notificación
- ⏱️ Timestamps relativos (hace 5m, hace 2h, etc)
- 🎯 Pull to refresh
- ✅ Marcar todas como leídas
- 🗑️ Eliminar individual
- 📊 Contador de no leídas
- 😴 Empty state elegante

### 3. **Tabla en Supabase: `notifications`**
Almacena todas las notificaciones con RLS habilitado.

---

## 🔧 PASOS DE CONFIGURACIÓN

### Paso 1: Ejecutar SQL en Supabase

1. Abre https://app.supabase.com
2. Ve a tu proyecto: **iksenkkaxlmdiyeezoym**
3. SQL Editor → New Query
4. Copia el contenido de `NOTIFICATIONS_TABLE.sql`
5. Ejecuta el query
6. ✅ Tabla creada con índices y RLS

### Paso 2: Verificar Tabla

Ejecuta en Supabase:
```sql
SELECT * FROM notifications LIMIT 5;
```

Deberías obtener una tabla vacía (es normal).

---

## 🚀 CÓMO USAR EN LA APP

### Uso 1: Ver Notificaciones

**En ProfileScreen:**
- Botón "Notificaciones" en el menú → abre NotificationsScreen ✅

**En HomeScreen:**
- Ícono 🔔 arriba a la derecha → abre NotificationsScreen ✅

### Uso 2: Crear Notificaciones (Ejemplo)

En cualquier pantalla de tu app:

```typescript
import { useNotifications } from '../hooks/useNotifications';
import { useAppStore } from '../store/useAppStore';

export default function MiPantalla() {
  const { user } = useAppStore();
  const { createNotification } = useNotifications(user?.id);

  const handleCrearNotificacion = async () => {
    try {
      await createNotification(user.id, {
        user_id: user.id,
        type: 'booking',
        title: '✅ Reserva confirmada',
        message: 'Tu reserva para Bogotá → Medellín está lista',
        data: {
          route_id: 'uuid-de-ruta',
          booking_id: 'uuid-de-booking',
        },
        is_read: false,
      });
    } catch (error) {
      console.error('Error creando notificación:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleCrearNotificacion}>
      <Text>Crear Notificación</Text>
    </TouchableOpacity>
  );
}
```

---

## 📨 TIPOS DE NOTIFICACIONES

### 1. **booking** (Reserva confirmada)
```typescript
{
  type: 'booking',
  title: '✅ Reserva confirmada',
  message: 'Tu reserva para Bogotá → Medellín está confirmada',
  data: {
    route_id: 'uuid-ruta',
    booking_id: 'uuid-booking',
    departure_time: '2026-04-05T08:30:00'
  }
}
```

### 2. **trip_update** (Actualización de viaje)
```typescript
{
  type: 'trip_update',
  title: '🚗 En camino',
  message: 'El conductor está en camino. Llegará en 5 minutos',
  data: {
    route_id: 'uuid-ruta',
    eta_minutes: 5
  }
}
```

### 3. **driver_arrived** (Conductor llegó)
```typescript
{
  type: 'driver_arrived',
  title: '📍 El conductor llegó',
  message: 'Tu conductor está aquí. Placa: ABX-234',
  data: {
    route_id: 'uuid-ruta',
    driver_id: 'uuid-driver'
  }
}
```

### 4. **trip_completed** (Viaje completado)
```typescript
{
  type: 'trip_completed',
  title: '🎉 Viaje completado',
  message: 'Se ha debitado $54.000 de tu cuenta',
  data: {
    route_id: 'uuid-ruta',
    total_paid: 54000
  }
}
```

### 5. **review_pending** (Pendiente de revisar)
```typescript
{
  type: 'review_pending',
  title: '⭐ Califica tu experiencia',
  message: 'Ayuda a otros compartiendo tu experiencia',
  data: {
    booking_id: 'uuid-booking',
    driver_id: 'uuid-driver'
  }
}
```

### 6. **message** (Mensaje nuevo)
```typescript
{
  type: 'message',
  title: '💬 Nuevo mensaje',
  message: 'El conductor Juan dice: ¿Cuál es tu ubicación?',
  data: {
    other_user_id: 'uuid-usuario',
    conversation_id: 'uuid-conv'
  }
}
```

---

## 🔗 INTEGRACIÓN CON OTRAS PANTALLAS

### Opción 1: Al confirmar booking (BookingScreen)

```typescript
// En BookingScreen.tsx
const handleConfirmBooking = async () => {
  try {
    const booking = await createBooking(...);
    
    // ✨ Crear notificación
    await createNotification(user.id, {
      user_id: user.id,
      type: 'booking',
      title: '✅ Reserva confirmada',
      message: `Tu reserva para ${route.origin} → ${route.destination} está confirmada`,
      data: {
        route_id: route.id,
        booking_id: booking.id,
      },
      is_read: false,
    });
    
    navigation.navigate('TripStatus');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Opción 2: Al crear ruta (DriverRegisterScreen)

```typescript
// En DriverRegisterScreen.tsx
const handleCreateRoute = async () => {
  try {
    const route = await createRoute(routeData);
    
    // ✨ Notificar a pasajeros que nueva ruta disponible
    // (Esto implicaría una función más compleja)
    
    Alert.alert('Éxito', 'Ruta publicada');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

---

## 📊 CONSULTAS ÚTILES (Supabase)

**Ver todas las notificaciones de un usuario:**
```sql
SELECT * FROM notifications 
WHERE user_id = 'USUARIO_UUID'
ORDER BY created_at DESC;
```

**Contar no leídas:**
```sql
SELECT COUNT(*) as unread_count FROM notifications 
WHERE user_id = 'USUARIO_UUID' AND is_read = false;
```

**Marcar todas como leídas:**
```sql
UPDATE notifications 
SET is_read = true, updated_at = NOW()
WHERE user_id = 'USUARIO_UUID' AND is_read = false;
```

**Eliminar antiguas (>30 días):**
```sql
DELETE FROM notifications 
WHERE user_id = 'USUARIO_UUID' 
AND created_at < NOW() - INTERVAL '30 days';
```

---

## 🧪 PRUEBAS MANUALES

### Test 1: Ver notificaciones vacías
1. Abre la app
2. Clic en 🔔 (HomeScreen) o Notificaciones (ProfileScreen)
3. Deberías ver "Sin notificaciones"

### Test 2: Crear notificación manual

Ejecuta en Supabase SQL Editor:
```sql
INSERT INTO notifications (user_id, type, title, message, is_read)
VALUES (
  'YOUR_USER_UUID_HERE',
  'booking',
  '✅ Test Notification',
  'Esta es una notificación de prueba',
  false
);
```

Luego:
1. Abre NotificationsScreen
2. Pull to refresh (o espera)
3. Deberías ver la notificación nueva
4. Counter mostrará "1"

### Test 3: Marcar como leída
1. Clic en notificación
2. El punto azul debe desaparecer
3. Contador debe decrementar

### Test 4: Tiempo real
1. Abre 2 ventanas del navegador con la app
2. En una, crea una notificación
3. En la otra, ve que aparece sin necesidad de refresh

---

## 🎨 UI Preview

### NotificationsScreen
```
┌─────────────────────────────────┐
│  ← Notificaciones         [2]   │  ← Contador de no leídas
├─────────────────────────────────┤
│ 🟢 ✅ Reserva confirmada    5m │
│    Tu reserva está confirmada   │ ← Sin leer (fondo azul claro)
│                                  │
│ ⚪ 🚗 En camino             2h  │
│    Conductor llegará en 5 min   │ ← Ya leída (fondo gris)
│                                  │
│ 🟢 ⭐ Califica tu experiencia 1d │
│    Ayuda a otros compartiendo... │ ← Sin leer
└─────────────────────────────────┘
```

---

## 🚀 Próximos Pasos (v2)

- [ ] Push notifications (Expo Push Notifications)
- [ ] Sonido al recibir notificación
- [ ] Vibración al recibir notificación
- [ ] Categorizar notificaciones por tipo (pestañas)
- [ ] Buscar/filtrar notificaciones
- [ ] Historial de notificaciones archivadas
- [ ] Preferencias de notificación por tipo

---

## ⚙️ Troubleshooting

**P: Las notificaciones no aparecen**
- R: Verifica que la tabla esté crear en Supabase
- R: Revisa los logs del console (F12 → Console)

**P: No aparece el contador de no leídas**
- R: Asegúrate de pasar `user?.id` al hook

**P: Error "RLS policy rejected"**
- R: Verifica que estés loggeado
- R: El user_id debe coincidir con auth.uid()

**P: Las notificaciones no se actualizan en tiempo real**
- R: El hook tiene realtime suscrito automáticamente
- R: Verifica que Realtime esté habilitado en tu BD

---

## 📝 Archivos Creados/Modificados

### Nuevos:
- ✅ `src/hooks/useNotifications.ts` - Hook de lógica
- ✅ `src/screens/NotificationsScreen.tsx` - Pantalla UI
- ✅ `NOTIFICATIONS_TABLE.sql` - Schema de BD

### Modificados:
- ✅ `src/navigation/AppNavigator.tsx` - Agregada ruta
- ✅ `src/screens/ProfileScreen.tsx` - Conectado botón
- ✅ `src/screens/HomeScreen.tsx` - Conectado ícono

---

## 🎯 Conclusión

El sistema de notificaciones está **100% funcional y listo para usar**:
- ✅ Backend en Supabase con RLS
- ✅ Frontend con UI bonita
- ✅ Tiempo real habilitado
- ✅ Botones conectados
- ✅ Ejemplos de uso incluidos

Ahora solo necesitas **crear notificaciones** desde otras partes de tu app 🚀
