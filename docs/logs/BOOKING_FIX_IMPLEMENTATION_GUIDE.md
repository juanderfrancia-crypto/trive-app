# 🔧 PLAN DE FIX: Bug de available_seats (Returns 2 instead of 0)

**Status:** 🔴 CRÍTICO - Asientos no se restan correctamente  
**Raíz del problema:** Colisión entre TRIGGER y RPC en Supabase  
**Impacto:** Segunda reserva no calcula los asientos restantes correctamente

---

## 📊 Problema Detallado

```
Logs actuales:
─────────────
Pasajero 1 → Reserva [1, 2] → remaining_seats: 2 ✅ CORRECTO
Pasajero 2 → Reserva [3, 4] → remaining_seats: 2 ❌ DEBERÍA SER 0

Ruta tiene 4 asientos totales.
Ambas reservas se confirman, pero available_seats no se actualiza correctamente en la 2ª.
```

**Causa:** El RPC `finalize_bookings_atomic()` hace UPDATE a `available_seats` simultáneamente  
con el TRIGGER `trigger_update_available_seats_on_booking_update`, causando colisión.

---

## ✅ SOLUCIÓN: 3 PASOS

### PASO 1: Reemplazar el RPC en Supabase (5 minutos)

1. Abre Supabase Dashboard → SQL Editor
2. Ejecuta el script: `FIX_BOOKING_REMAINING_SEATS_BUG.sql`  
   (Ya está creado en el repo)
3. Verifica con la query de validación al final del script

**Qué hace:**
- El RPC SOLO confirma bookings
- Deja que el TRIGGER recalcule available_seats automáticamente
- Elimina la colisión de actualizaciones

---

### PASO 2: Verificar que el TRIGGER existe (2 minutos)

En Supabase SQL Editor, ejecuta:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'bookings'
AND trigger_name LIKE '%available_seats%'
ORDER BY trigger_name;
```

**Esperado:**
```
trigger_name                                  | event_manipulation | event_object_table
──────────────────────────────────────────────┼────────────────────┼──────────────────
trigger_update_available_seats_on_booking_delete | DELETE           | bookings
trigger_update_available_seats_on_booking_insert | INSERT           | bookings  
trigger_update_available_seats_on_booking_update | UPDATE           | bookings
```

Si alguno está faltando, ejecuta: `CREATE_AVAILABLE_SEATS_TRIGGER.sql`

---

### PASO 3: Verificar Datos Históricos (1 minuto)

La BD podría tener datos inconsistentes de antes del fix. Ejecuta:

```sql
-- Recalcular available_seats para TODAS las rutas
UPDATE routes r
SET available_seats = GREATEST(0, r.total_seats - (
  SELECT COALESCE(COUNT(*), 0)
  FROM bookings
  WHERE route_id = r.id
  AND booking_status = 'confirmed'
)),
updated_at = NOW();

-- Verificar que quedó bien
SELECT 
  r.id,
  r.origin,
  r.destination,  
  r.total_seats,
  r.available_seats,
  (SELECT COUNT(*) FROM bookings b 
   WHERE b.route_id = r.id AND b.booking_status = 'confirmed') as confirmed_bookings,
  (r.total_seats - (SELECT COUNT(*) FROM bookings b 
   WHERE b.route_id = r.id AND b.booking_status = 'confirmed')) as should_be
FROM routes r
ORDER BY r.created_at DESC
LIMIT 10;
```

**Verificación:** Las columnas `available_seats` y `should_be` deben ser iguales para todas las filas.

---

## 🧪 TEST DESPUÉS DEL FIX

```
1. Cliente A: Reserva asientos [1, 2] de ruta con 4 asientos
   → Log: "remaining_seats: 2" ✅
   
2. Cliente B: Reserva asientos [3, 4] de la MISMA ruta
   → Log: "remaining_seats: 0" ✅ (AHORA DEBE SER 0, NO 2)
   
3. Intentar que Cliente C reserve [1] (ya ocupado)
   → Error: "No hay suficientes asientos disponibles" ✅
```

---

## 📝 Archivos Involucrados

| Archivo | Acción |
|---------|--------|
| `FIX_BOOKING_REMAINING_SEATS_BUG.sql` | ✅ Ejecutar en Supabase |
| `CREATE_AVAILABLE_SEATS_TRIGGER.sql` | Verificar que exista |
| `src/hooks/useBookings.ts` | ✅ SIN CAMBIOS NECESARIOS |

---

## 🔄 Por qué funciona el fix

**ANTES (Colisión):**
```
1. RPC actualiza bookings → 'pending' → 'confirmed'
2. TRIGGER se dispara → UPDATE available_seats = calculated_value_1
3. RPC TAMBIÉN hace → UPDATE available_seats = calculated_value_2
4. Resultado: Ambos actualizan casi simultáneamente, valores inconsistentes
```

**DESPUÉS (Sin colisión):**
```
1. RPC SOLO actualiza → bookings status a 'confirmed'
2. TRIGGER se dispara → UPDATE available_seats (calcula correctamente)
3. RPC espera al trigger y luego consulta el valor final
4. Resultado: Un solo UPDATE limpio, valor correcto retornado
```

---

## ⚠️ Rollback (Si algo falla)

```sql
-- Restaurar versión anterior del RPC (si es necesario)
-- Ejecuta el contenido de: FIX_RACE_CONDITION_ATOMIC_BOOKING.sql
-- Pero esto volveríamos al bug, así que no recomendado.

-- Mejor: Solo ejecuta el recalculation manual cada vez que necesites:
UPDATE routes r
SET available_seats = GREATEST(0, r.total_seats - (
  SELECT COALESCE(COUNT(*), 0)
  FROM bookings
  WHERE route_id = r.id
  AND booking_status = 'confirmed'
));
```

---

## 📊 Timeline

- **Paso 1:** 5 minutos  
- **Paso 2:** 2 minutos  
- **Paso 3:** 1 minuto
- **Testing:** 5-10 minutos
- **TOTAL:** 15-20 minutos

✅ **RESULTADO:** available_seats se calcula correctamente, sin race conditions.
