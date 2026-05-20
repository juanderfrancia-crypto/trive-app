# ⚡ COPY-PASTE READY - SQL QUERIES

**USO**: Abre Supabase → SQL Editor → Copia query de aquí → Pega → RUN → Next

---

## QUERY 1️⃣ - Verificar constraint

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'bookings';
```

**Result vacío?** → Sigue QUERY 2  
**Result con filas?** → Salta a QUERY 3

---

## QUERY 2️⃣ - Agregar constraint (SI QUERY 1 fue vacío)

```sql
ALTER TABLE bookings
ADD CONSTRAINT unique_route_seat_confirmed 
UNIQUE (route_id, seat_number) 
WHERE booking_status != 'cancelled';
```

---

## QUERY 3️⃣ - Habilitar pg_cron

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

## QUERY 4️⃣ - Crear función

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

---

## QUERY 5️⃣ - Crear cron job

```sql
SELECT cron.schedule(
  'update_completed_bookings_job',
  '*/5 * * * *',
  'SELECT update_completed_bookings()'
);
```

---

## QUERY 6️⃣ - Verificar

```sql
SELECT 
  jobid,
  schedule,
  command,
  active
FROM cron.job
WHERE command LIKE '%update_completed_bookings%';
```

**¿Ves fila con active=true?** → ✅ DONE

---

## BONUS - Testing (Opcional)

Obtener IDs:
```sql
SELECT id FROM profiles WHERE role = 'driver' LIMIT 1;
SELECT id FROM profiles WHERE role = 'passenger' LIMIT 1;
```

Crear test ruta (reemplaza IDs):
```sql
INSERT INTO routes (driver_id, origin, destination, departure_time, arrival_time, vehicle_make, vehicle_model, vehicle_year, available_seats, price_per_seat, route_status)
VALUES ('DRIVER_ID', 'Cali', 'Bogotá', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 hours', 'Toyota', 'Camry', 2025, 4, 50000, 'active')
RETURNING id;
```

Create test booking (reemplaza IDs):
```sql
INSERT INTO bookings (route_id, passenger_id, seat_number, price, payment_method, payment_status, booking_status)
VALUES ('ROUTE_ID', 'PASSENGER_ID', 1, 50000, 'cash', 'pending', 'confirmed');
```

Fuerza actualización:
```sql
SELECT update_completed_bookings();
```

Verifica (reemplaza BOOKING_ID):
```sql
SELECT booking_status FROM bookings WHERE id = 'BOOKING_ID';
```

Should show: `completed` ✅

---

**TODO**: 20 minutos ✅
