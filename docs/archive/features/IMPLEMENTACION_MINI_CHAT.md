# ⚙️ Cambios a Implementar en ActiveTripsScreen

**Archivo**: `src/screens/ActiveTripsScreen.tsx`

**Objetivo**: Agregar mini-chat modal cuando el usuario toca "Contactar"

---

## CAMBIO 1: Importar el nuevo componente

**Ubicación**: Top del archivo, con los otros imports

```typescript
// Agregar esta línea con los otros imports de componentes:
import { TripMessagesModal } from '../components/TripMessagesModal'
```

---

## CAMBIO 2: Agregar estado para el modal

**Ubicación**: En `export default function ActiveTripsScreen()`, con los otros `useState`

**Agregar después de line ~48** (después de `const [toastConfig, setToastConfig]...`):

```typescript
  const [selectedTripForChat, setSelectedTripForChat] = useState<ActiveTrip | null>(null)
```

---

## CAMBIO 3: Reemplazar `handleContactDriver`

**Ubicación**: Reemplazar la función `handleContactDriver` existente

**ANTES** (línea ~250):
```typescript
  const handleContactDriver = (trip: ActiveTrip) => {
    // Navegar a chat con el conductor
    navigation.navigate('Chat', { driverId: trip.driverId, driverName: trip.driverName })
  }
```

**DESPUÉS**:
```typescript
  const handleContactDriver = (trip: ActiveTrip) => {
    // Abrir modal de chat contextual para el viaje
    setSelectedTripForChat(trip)
  }
```

---

## CAMBIO 4: Agregar componente Modal al return

**Ubicación**: Justo antes del cierre de `SafeAreaView` al final del archivo

**Agregar esto ANTES del cierre de `</SafeAreaView>`**:

```typescript
      {/* Modal de mensajes */}
      {selectedTripForChat && (
        <TripMessagesModal
          visible={!!selectedTripForChat}
          tripId={selectedTripForChat.id}
          userId={user?.id || ''}
          otherUserId={selectedTripForChat.driverId}
          otherUserName={selectedTripForChat.driverName}
          onClose={() => setSelectedTripForChat(null)}
        />
      )}

      {/* Toast de notificaciones */}
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setToastConfig({ ...toastConfig, visible: false })}
      />
```

---

## Resumen de Cambios

| Cambio | Tipo | Línea Aprox | Acción |
|--------|------|-----------|--------|
| 1 | Import | ~20 | Agregar `TripMessagesModal` |
| 2 | State | ~48 | Agregar `selectedTripForChat` |
| 3 | Function | ~250 | Reemplazar `handleContactDriver` |
| 4 | JSX | ~600+ (final) | Agregar componente modal |

---

## ✅ Testing Checklist

Después de hacer los cambios:

- [ ] Pantalla carga sin errores
- [ ] Puedo ver la lista de viajes activos
- [ ] Toco "Contactar" en un viaje
- [ ] Se abre el modal con el chat del viaje
- [ ] Puedo escribir y enviar mensajes
- [ ] El mensaje aparece en la lista
- [ ] Toco el X para cerrar modal
- [ ] Modal se cierra sin errores

---

## 🐛 Si algo falla

1. **Erro de import**: Asegurate que `TripMessagesModal` esté en `src/components/TripMessagesModal.tsx`
2. **Modal no se abre**: Verifica que `selectedTripForChat` se actualiza con `setSelectedTripForChat`
3. **Mensajes no envían**: Verifica que `tripId` y los userIds sean correctos
4. **No hay realtime**: Verifica que la tabla `trip_messages` existe en BD

---

## 📋 Pasos Finales

1. **Ejecutar migración SQL**:
   ```bash
   # Conectarse a Supabase y ejecutar:
   database/migrations/MIGRATION_TRIP_MESSAGES.sql
   ```

2. **Hacer cambios en ActiveTripsScreen** (4 cambios arriba)

3. **Reiniciar la app** y testear

4. **Commit con mensaje**:
   ```
   feat: Add contextual messaging for active trips
   
   - Add TripMessagesModal component for trip-specific chat
   - Create trip_messages table and service layer
   - Integrate mini-chat into ActiveTripsScreen
   - Replace "Chat" navigation with modal popup
   ```

---
