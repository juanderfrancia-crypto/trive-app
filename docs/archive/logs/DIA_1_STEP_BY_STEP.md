# 🔧 PASO A PASO - ARREGLAR RACE CONDITION HOY

## ⚡ RESUMEN RÁPIDO

**Problema**: 2 usuarios pueden reservar el mismo asiento = dinero duplicado

**Solución**: 
1. Agrega constraint UNIQUE en base de datos (1 min)
2. Setup pg_cron para auto-actualizar bookings (2 min)
3. Test todo funciona (3 min)

**Tiempo total**: 10 minutos ✅

---

## 🎬 PASO 1: ABRIR SUPABASE

1. Ir a [app.supabase.com](https://app.supabase.com)
2. Click en tu proyecto **Trive**
3. En sidebar izquierdo → **SQL Editor**
4. Click botón azul **New Query**

---

## 📋 PASO 2: COPIAR SCRIPT SQL

1. Abre archivo: [SQL_SETUP_RACE_CONDITION_FIX.sql](SQL_SETUP_RACE_CONDITION_FIX.sql)
2. Verás todo comentado (líneas con `--`)

**VAMOS A EJECUTAR PRIMERO:**
- Verificar si constraint existe
- Agregar constraint si no existe
- Habilitar pg_cron
- Crear función + cron job

---

## ✅ EJECUCIÓN EN ORDEN

### EJECUTAR 1: Verificar constraint actual

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'bookings';
```

#### Cómo hacer:
1. Copia SQL arriba ⬆️
2. Pega en SQL Editor
3. Click botón **RUN** (esquina arriba-derecha)

#### Qué esperar:
```
✅ Output vacío: No existe constraint → Continuar paso EJECUTAR 2
✅ Output con filas: Ya existe → Skip a EJECUTAR 3
```

---

### EJECUTAR 2: Agregar constraint (si no existe)

**SOLO SI el EJECUTAR 1 fue vacío**, copia y ejecuta:

```sql
ALTER TABLE bookings
ADD CONSTRAINT unique_route_seat_confirmed 
UNIQUE (route_id, seat_number) 
WHERE booking_status != 'cancelled';
```

#### Qué esperar:
```
✅ "ALTER TABLE completed successfully"  → OK!
❌ "already exists" → Ya estaba, es OK
```

---

### EJECUTAR 3: Habilitar pg_cron

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

#### Qué esperar:
```
✅ "CREATE EXTENSION" → OK!
```

---

### EJECUTAR 4: Crear función SQL

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

#### Qué esperar:
```
✅ "CREATE FUNCTION successfully"  → OK!
```

---

### EJECUTAR 5: Crear CRON JOB (automático cada 5 min)

```sql
SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/5 * * * *',  -- Cada 5 minutos
  'SELECT update_completed_bookings()'
);
```

#### Qué esperar:
```
✅ Output: jobid | 1439 (o similar)
   Significa: Cron job está ACTIVO y corriendo
```

---

### EJECUTAR 6: VERIFICAR - Listar cron jobs

```sql
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE command LIKE '%update_completed_bookings%';
```

#### Qué esperar:
```
✅ Ves una fila con:
   schedule: */5 * * * *
   active: true
   
Eso significa: TODO ESTÁ OK ✅
```

---

## 🧪 PASO 3: TEST END-TO-END (Verificar que funciona)

### TEST: Crear booking de ruta pasada

Si quieres verificar que el sistema actualiza bookings automáticamente:

```sql
-- TEST PASO 1: Crear ruta con departure time en el PASADO
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
  'TU_ID_CONDUCTOR',  -- Aquí: UUID de un conductor real
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

Copia el ID que retorna (será algo como `xxxxxxxx-xxxx-xxxx`)

```sql
-- TEST PASO 2: Crear booking en esa ruta
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
  'PEGA_ROUTE_ID_AQUI',     -- Del paso anterior
  'TU_ID_PASAJERO',          -- UUID de pasajero real
  1,
  50000,
  'cash',
  'pending',
  'confirmed'
)
RETURNING id, booking_status;
```

Copia el booking ID

```sql
-- TEST PASO 3: Forzar cron job (no esperar 5 min)
SELECT update_completed_bookings();
```

```sql
-- TEST PASO 4: Verificar que cambió a 'completed'
SELECT id, booking_status, created_at
FROM bookings
WHERE id = 'PEGA_BOOKING_ID_AQUI';
```

#### Qué esperar:
```
✅ booking_status = 'completed'   → TODO OK!
❌ booking_status = 'confirmed'   → Algo falló, revisar logs
```

---

## 🚀 FINAL: TODO LISTO?

```
✅ Constraint UNIQUE agregado
✅ pg_cron habilitada
✅ Función SQL creada
✅ Cron job activo (cada 5 min)
✅ Test manual pasó

→ RACE CONDITION FIXED! 🎉
```

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "pg_cron extension not available"
**Solución**: 
1. Supabase Dashboard → Tu proyecto
2. Settings → Extensions
3. Buscar "pg_cron"
4. Click para habilitar
5. Reintentar SQL

### ❌ Error: "constraint already exists"
**Es OK**, significa ya estaba creado desde antes.

### ❌ Error: "function already exists"
**Es OK**, usa `CREATE OR REPLACE` (que ya está en el script).

### ❌ Cron job no se ejecuta después de 5 min
**Revisar**:
```sql
SELECT * FROM cron.job_run_details 
WHERE command LIKE '%update_completed_bookings%'
ORDER BY start_time DESC LIMIT 5;
```
Si ves errores, avisar.

---

## 📱 SIGUIENTE - TESTING EN APP

Una vez todo OK en BD, **NO REINICIES** app aún.

**Paso siguiente**:
1. En app, busca una ruta futura
2. Intenta reservar 2 asientos (tú + amigo)
3. Intenten reservar **EL MISMO ASIENTO**
4. El segundo debe recibir error: "Este asiento ya fue reservado"

Si pasa esto → RACE CONDITION = FIXED ✅

---

## ✍️ CHECKLIST

```
HOY - DÍA 1 - MAÑANA:

[ ] Abrir Supabase SQL Editor
[ ] EJECUTAR 1: Verificar constraint
[ ] EJECUTAR 2: Agregar constraint (si falta)
[ ] EJECUTAR 3: Habilitar pg_cron
[ ] EJECUTAR 4: Crear función SQL
[ ] EJECUTAR 5: Crear cron job
[ ] EJECUTAR 6: Verificar cron job activo
[ ] Hacer captura de pantalla de cron.job table
[ ] TEST: Crear booking pasado + verificar update
[ ] Compartir screenshot en Slack: "RACE CONDITION FIXED ✅"

TIEMPO: 15-20 minutos
```

---

**Siguiente**: Una vez BD esté listed, vamos a testing en la app.

¿Listo? Avisas cuando termines los EJECUTARs.
