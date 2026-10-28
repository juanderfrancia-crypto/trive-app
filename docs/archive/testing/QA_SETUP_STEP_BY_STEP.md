# 🚀 QA SETUP - PASO A PASO

## ⏱️ TIEMPO: 10 minutos

---

## PASO 1️⃣: Crear Usuarios en Supabase Auth

### 1.1 Abre Dashboard Supabase
```
https://app.supabase.com
→ Selecciona tu proyecto
→ Authentication → Users
```

### 1.2 Click "Add user" (crear usuario #1)
```
Email: conductor1@test.com
Password: Test123!@#
Auto-generate password: NO
Auto-send sign up link: NO
```
**Click: "Add user"**

### 1.3 Click "Add user" (crear usuario #2)
```
Email: pasajero1@test.com
Password: Test123!@#
```
**Click: "Add user"**

### 1.4 Click "Add user" (crear usuario #3)
```
Email: pasajero2@test.com
Password: Test123!@#
```
**Click: "Add user"**

✅ **Ahora tienes 3 usuarios en Auth**

---

## PASO 2️⃣: Obtener los UUIDs

### 2.1 En la tabla de usuarios de Auth, busca los IDs

**Deberías ver algo así:**

| Email | User ID (UUID) |
|-------|---|
| conductor1@test.com | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| pasajero1@test.com | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| pasajero2@test.com | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### 2.2 Copia los 3 UUIDs en un documento (Notepad)
```
Conductor UUID: [PEGA AQUI]
Pasajero 1 UUID: [PEGA AQUI]
Pasajero 2 UUID: [PEGA AQUI]
```

---

## PASO 3️⃣: Actualizar el Script SQL

### 3.1 Abre: QA_01_SETUP_TEST_DATA.sql

### 3.2 Reemplaza los 3 placeholders:

**Encuentra esta línea:**
```sql
INSERT INTO public.profiles 
  (id, name, email, phone, role, total_trips, rating, is_driver_verified, created_at)
VALUES
  (
    'CONDUCTOR_UUID_AQUI',  ← REEMPLAZA ESTO
    'Juan Conductor Testing',
```

**Reemplaza `'CONDUCTOR_UUID_AQUI'` con el UUID real:**
```sql
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
```

### 3.3 Repite para los otros 2 UUIDs

**Encuentra:**
```sql
  (
    'PASAJERO1_UUID_AQUI',  ← REEMPLAZA ESTO
```

**Reemplaza:**
```sql
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
```

**Encuentra:**
```sql
  (
    'PASAJERO2_UUID_AQUI',  ← REEMPLAZA ESTO
```

**Reemplaza:**
```sql
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
```

### 3.4 También reemplaza en la sección de ROUTES

**Encuentra (2 líneas en la sección de rutas):**
```sql
driver_id, 
origin, 
destination, 
departure_time, 
arrival_time,
total_seats, 
available_seats, 
price_per_seat, 
vehicle_make, 
vehicle_model,
vehicle_year,
vehicle_color,
vehicle_plate,
status,
created_at
  )
VALUES
  (
    'CONDUCTOR_UUID_AQUI',  ← REEMPLAZA ESTO TAMBIÉN (2 veces)
```

Reemplaza ambas con el UUID del conductor.

---

## PASO 4️⃣: Ejecutar el Script en Supabase

### 4.1 Abre Supabase SQL Editor
```
Dashboard → SQL Editor → New Query
```

### 4.2 Copia TODO el contenido de QA_01_SETUP_TEST_DATA.sql

### 4.3 Pégalo en el SQL Editor

### 4.4 Click "RUN"

### ✅ Si todo está bien, verás:
```
USUARIOS CREADOS
- conductor1@test.com (driver)
- pasajero1@test.com (passenger)
- pasajero2@test.com (passenger)

RUTAS CREADAS
- Bogotá → Cali (4 asientos)
- Bogotá → Medellín (3 asientos)
```

---

## PASO 5️⃣: Guardar los IDs de Rutas

**En el resultado del script, verás:**
```
route1_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
route2_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Guarda estos en tu notepad también:**
```
Route 1 ID (Bogotá → Cali): [PEGA AQUI]
Route 2 ID (Bogotá → Medellín): [PEGA AQUI]
```

---

## ✅ SETUP COMPLETADO

**Los datos de testing ya están creados en la BD.**

### Próximo paso:

Lee [QA_TESTING_MASTER_GUIDE.md](QA_TESTING_MASTER_GUIDE.md) y comienza el testing.

---

## 🚨 SI ALGO FALLA

### Error: "insert or update on table 'profiles' violates foreign key"
→ Significa que olvidaste reemplazar los UUIDs placeholders. Verifica que reemplazaste todos los `'CONDUCTOR_UUID_AQUI'`, etc.

### Error: "duplicate key value violates unique constraint"
→ Ya existen esos datos. Ejecuta esto en SQL Editor:
```sql
DELETE FROM profiles WHERE email IN ('conductor1@test.com', 'pasajero1@test.com', 'pasajero2@test.com');
```
Luego vuelve a ejecutar el script.

### Error: "No users appearing"
→ Verifica que creaste los usuarios en Authentication primero.

---

## 📋 CHECKLIST

- [ ] Creé 3 usuarios en Supabase Auth
- [ ] Copié los 3 UUIDs
- [ ] Reemplacé todos los placeholders en QA_01_SETUP_TEST_DATA.sql
- [ ] Ejecuté el script en SQL Editor
- [ ] Vi los usuarios y rutas creadas
- [ ] Guardé los IDs de rutas

✅ **Listo para empezar el testing!**

