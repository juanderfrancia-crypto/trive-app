# 🚦 HOY - DÍA 1 - CHECKLIST RÁPIDO

## ⏱️ TIEMPO ESTIMADO: 20 MINUTOS

---

## ✅ PRE-REQUISITO: Acceso a Supabase

- [ ] Abrir navegador
- [ ] Ir a [app.supabase.com](https://app.supabase.com)
- [ ] Login con tu cuenta
- [ ] Seleccionar proyecto "Trive"
- [ ] Click en **SQL Editor** (sidebar izquierdo)
- [ ] Click botón azul **New Query**

---

## 📋 EJECUTAR EN ORDEN (Copy-Paste)

### QUERY 1: Verificar si constraint existe (30 seg)

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'bookings';
```

**Resultado esperado:**
- Ves `unique_route_seat` u similar → Skip QUERY 2
- Resultado vacío → Ejecutar QUERY 2

---

### QUERY 2: Agregar constraint UNIQUE (30 seg)

⚠️ **SOLO SI QUERY 1 fue vacío**

```sql
ALTER TABLE bookings
ADD CONSTRAINT unique_route_seat_confirmed 
UNIQUE (route_id, seat_number) 
WHERE booking_status != 'cancelled';
```

**Resultado esperado:** "ALTER TABLE completed successfully"

---

### QUERY 3: Habilitar pg_cron (30 seg)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Resultado esperado:** "CREATE EXTENSION completed"

---

### QUERY 4: Crear función SQL (30 seg)

```sql
CREATE OR REPLACE FUNCTION update_completed_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET booking_status = 'completed'
  WHERE 
    booking_status = 'confirmed'
    AND route_id IN (
      SELECT id FROM routes 
      WHERE departure_time < NOW()
    );
END;
$$ LANGUAGE plpgsql;
```

**Resultado esperado:** "CREATE FUNCTION completed"

---

### QUERY 5: Crear cron job (30 seg)

```sql
SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/5 * * * *',
  'SELECT update_completed_bookings()'
);
```

**Resultado esperado:** 
```
jobid
1439    (o número similar)
```

---

### QUERY 6: VERIFICAR todo está OK (30 seg)

```sql
SELECT 
  jobid,
  schedule,
  command,
  active
FROM cron.job
WHERE command LIKE '%update_completed_bookings%';
```

**Resultado esperado:**
```
jobid | schedule | active
1439  | */5 * * * * | true
```

✅ **SI VES ESTO = TODO OK**

---

## 🧪 TESTING (OPCIONAL - Para verificar que funciona)

### TEST PASO 1: Obtener IDs

Ejecuta QUERY:
```sql
SELECT id FROM profiles WHERE role = 'driver' LIMIT 1;
```
Copia el ID (será algo como `'xxx-xxx-xxx'`)

Ejecuta QUERY:
```sql
SELECT id FROM profiles WHERE role = 'passenger' LIMIT 1;
```
Copia el ID

Referencia: [DIA_1_OBTENER_IDS.md](DIA_1_OBTENER_IDS.md)

---

### TEST PASO 2: Crear ruta pasada

Reemplaza `CONDUCTOR_ID` y `PASAJERO_ID` con los IDs del PASO 1:

```sql
INSERT INTO routes (
  driver_id,
  origin, 
  destination,
  departure_time,
  arrival_time,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  available_seats,
  price_per_seat,
  route_status
)
VALUES (
  'CONDUCTOR_ID',
  'Cali',
  'Bogotá',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day' + INTERVAL '5 hours',
  'Toyota',
  'Camry',
  2025,
  4,
  50000,
  'active'
)
RETURNING id;
```

Copia el ID que retorna (será el ROUTE_ID)

---

### TEST PASO 3: Crear booking en ruta pasada

Reemplaza `ROUTE_ID` y `PASAJERO_ID`:

```sql
INSERT INTO bookings (
  route_id,
  passenger_id,
  seat_number,
  price,
  payment_method,
  payment_status,
  booking_status
)
VALUES (
  'ROUTE_ID',
  'PASAJERO_ID',
  1,
  50000,
  'cash',
  'pending',
  'confirmed'
);
```

---

### TEST PASO 4: Forzar actualización

```sql
SELECT update_completed_bookings();
```

---

### TEST PASO 5: Verificar que cambió

Reemplaza `BOOKING_ID` con el ID del paso 3:

```sql
SELECT id, booking_status
FROM bookings
WHERE id = 'BOOKING_ID';
```

**Resultado esperado:**
```
booking_status
completed    ✅
```

---

## 📱 TESTING EN APP (DESPUÉS de todo lo anterior)

1. Abre la app en emulador o device
2. **CASO PRUEBA: Race condition**
   - Tú abre: Busca ruta → Click asiento 1
   - Amigo abre: MISMA ruta → Intenta click asiento 1
   - Amigo debe ver error: "Este asiento ya fue reservado"
   - **Si pasa = RACE CONDITION FIXED ✅**

3. **CASO PRUEBA: Auto-update bookings**
   - Espera 5 minutos (o la próxima corrida cron)
   - Ve a Mis Viajes
   - Debes ver rutas pasadas que se completaron automáticamente
   - **Si aparecen = AUTO-UPDATE WORKING ✅**

---

## ✅ CHECKLIST DE HOY

```
SQL (En Supabase):
[ ] QUERY 1: Verificar constraint
[ ] QUERY 2: Agregar constraint (si falta)
[ ] QUERY 3: Habilitar pg_cron
[ ] QUERY 4: Crear función SQL
[ ] QUERY 5: Crear cron job
[ ] QUERY 6: Verificar cron job activo ✅

TESTING (Optional pero recomendado):
[ ] TEST P1-5: Booking autom complete
[ ] Screenshot de: booking_status = 'completed'

APP (Testing manual):
[ ] Probar race condition (2 usuarios, mismo asiento)
[ ] Resultado: 2do usuario ve error ✅
[ ] Probar auto-update (esperar 5 min)
[ ] Resultado: Booking cambió a completed ✅

FINAL:
[ ] Tomar screenshot de cron.job table
[ ] Avisar en Slack: "DÍA 1 ✅ RACE CONDITION FIXED"
```

---

## 🎯 QUE VIENE DESPUÉS (NO HOY)

- DÍA 2: Implementar PAGOS (Cash o Mercado Pago)
- DÍA 3: GPS/Mapas
- DÍA 4: QA masivo

---

## 💬 SI ALGO FALLA

Referencia: [SQL_SETUP_RACE_CONDITION_FIX.sql](SQL_SETUP_RACE_CONDITION_FIX.sql) → Sección TROUBLESHOOTING

---

## 🚀 VAMOS!

**TIEMPO**: 20 minutos  
**IMPACTO**: Elimina bug crítico, app más segura  
**NEXT**: Avisar cuando termines ✅

---

*Estamos en el camino. 7 días hasta lanzar. Day 1 = Critical fixed. 💪*
