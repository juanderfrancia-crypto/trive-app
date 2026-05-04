# 🔑 CÓMO OBTENER IDs REALES PARA TESTING

## Necesitas estos IDs para los test SQL

```
TU_ID_CONDUCTOR = UUID de un conductor (string entre comillas)
TU_ID_PASAJERO = UUID de un pasajero (string entre comillas)
```

---

## 📍 OPCIÓN 1: Obtener desde Supabase (RÁPIDO)

### 1️⃣ Para TU_ID_CONDUCTOR:

En Supabase SQL Editor ejecuta:

```sql
SELECT id, email, name 
FROM profiles 
WHERE role = 'driver'
LIMIT 1;
```

**Output esperado**:
```
id                                   | email           | name
12345678-1234-1234-1234-123456789abc | drivers@test.co | Juan
```

Copia el `id` (con comillas): `'12345678-1234-1234-1234-123456789abc'`

---

### 2️⃣ Para TU_ID_PASAJERO:

En Supabase SQL Editor ejecuta:

```sql
SELECT id, email, name 
FROM profiles 
WHERE role = 'passenger'
LIMIT 1;
```

Copia el `id` (con comillas): `'87654321-4321-4321-4321-abcdefgh1234'`

---

## 📍 OPCIÓN 2: Si no hay datos en BD

Si las queries arriba retornan 0 rows, necesitas crear usuarios de prueba:

### Crear Conductor Test:

```sql
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  phone,
  city
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- UUID ficticio
  'conductor_test@trive.com',
  'Conductor Test',
  'driver',
  '+573001234567',
  'Cali'
);
```

Copia: `'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`

---

### Crear Pasajero Test:

```sql
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  phone,
  city
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'pasajero_test@trive.com',
  'Pasajero Test',
  'passenger',
  '+573009876543',
  'Cali'
);
```

Copia: `'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'`

---

## ✅ UNA VEZ TENGAS LOS IDs

Cuando hagas el TEST SQL, reemplaza:

```sql
INSERT INTO routes (
  driver_id,        -- ← REEMPLAZA CON ID CONDUCTOR (con comillas)
  ...
)
VALUES (
  'TU_ID_CONDUCTOR',  ← AQUÍ: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ...
)
RETURNING id;
```

Y después:

```sql
INSERT INTO bookings (
  ...
  passenger_id,     -- ← REEMPLAZA CON ID PASAJERO (con comillas)
  ...
)
VALUES (
  ...,
  'TU_ID_PASAJERO',  ← AQUÍ: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ...
);
```

---

## 💡 NOTA IMPORTANTE

- IDs deben estar entre comillas: `'xxxxx'`
- Cada UUID es 36 caracteres (8-4-4-4-12)
- La app usa Supabase auth, así que perfiles se crean automáticamente

---

**Próximo paso**: Con tus IDs listos, ejecuta el TEST END-TO-END.
