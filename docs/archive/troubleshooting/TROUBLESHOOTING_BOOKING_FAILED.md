## 🔍 TROUBLESHOOTING: BOOKING_FAILED Error

### 📊 Síntomas
```
LOG  Attempting to reserve seats [3, 4] occupied: [1, 2]
ERROR  [DATABASE_ERROR] ... "BOOKING_FAILED"
```

### 🎯 Causas Posibles

#### 1️⃣ **Las columnas de `dropoff_point` no existen**
- **Síntoma**: Error al insertar bookings con `dropoff_point`
- **Solución**: Ejecutar [ENSURE_DROPOFF_MIGRATION.sql](ENSURE_DROPOFF_MIGRATION.sql) en Supabase SQL Editor

#### 2️⃣ **Los booking IDs no están en estado 'pending'**
- **Síntoma**: RPC retorna `success: false` con mensaje sobre estado pending
- **Debug**: Ejecutar en Supabase SQL Editor:
  ```sql
  SELECT id, booking_status, seat_number 
  FROM bookings 
  WHERE booking_status = 'pending'
  LIMIT 5;
  ```

#### 3️⃣ **No hay suficientes asientos disponibles**
- **Síntoma**: RPC retorna "No hay suficientes asientos disponibles"
- **Debug**: Ejecutar en Supabase SQL Editor:
  ```sql
  SELECT id, route_id, total_seats, available_seats, occupied_seats 
  FROM routes 
  WHERE id = '07dcd750-50ef-4d5c-a734-0fbefd9d9072';
  ```

#### 4️⃣ **Error en la RPC - problema de validación interna**
- **Síntoma**: RPC retorna "Error: ..." mensaje de SQL
- **Debug**: Ver console logs - debería mostrar el mensaje exacto del error

### 🛠️ Pasos de Diagnóstico

**1. Ejecutar migrations:**
```bash
# En Supabase SQL Editor, ejecutar:
cat ENSURE_DROPOFF_MIGRATION.sql
```

**2. Revisar estado de bookings:**
```sql
SELECT 
  id,
  route_id,
  passenger_id,
  seat_number,
  booking_status,
  payment_status,
  dropoff_point,
  dropoff_point_custom
FROM bookings
ORDER BY created_at DESC
LIMIT 10;
```

**3. Revisar estado de rutas:**
```sql
SELECT 
  id,
  origin,
  destination,
  total_seats,
  available_seats,
  occupied_seats
FROM routes
ORDER BY created_at DESC
LIMIT 5;
```

**4. Prueba manual de la RPC:**
```sql
-- Reemplazar con IDs reales de la BD
SELECT * FROM finalize_bookings_atomic(
  ARRAY['actual-booking-uuid-1'::uuid, 'actual-booking-uuid-2'::uuid],
  'cash'
);
```

### 📋 Checklist de Verificación

- [ ] Columnas `dropoff_point` y `dropoff_point_custom` existen en tabla `bookings`
- [ ] Al menos 2 bookings están en estado `'pending'` en la BD
- [ ] La ruta tiene suficientes `available_seats`
- [ ] RPC `finalize_bookings_atomic()` existe
- [ ] Console logs en el app muestran exactamente qué retorna la RPC

### 💡 Next Steps

1. **Ejecutar ENSURE_DROPOFF_MIGRATION.sql** en Supabase SQL Editor
2. **Revisar console logs** cuando ocurra el error (debería mostrar `✅ RPC Response:`)
3. **Compartir logs completos** si el problema persiste

### 🔗 Archivos Relevantes
- `src/hooks/useBookings.ts` - finalizePendingBookings()
- `src/screens/BookingScreen.tsx` - handleCashBooking()
- `FIX_RACE_CONDITION_ATOMIC_BOOKING.sql` - RPC definition
- `ENSURE_DROPOFF_MIGRATION.sql` - Migrations
