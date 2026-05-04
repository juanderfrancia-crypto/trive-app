# 🔍 TEST DIAGNÓSTICO: Flujo de Creación de Rutas

## Problema Reportado
- Conductor crea ruta ✅
- Ruta aparece en BASE DE DATOS ✅
- **PERO** no aparece en Pasajeros ❌

## Análisis del Flujo

### 1️⃣ CREACIÓN DE RUTA (Conductor)
**Archivo**: `src/screens/DriverRegisterScreen.tsx`

Pasos:
1. Conductor ingresa datos (origen, destino, hora, etc)
2. Se convierten horas 12h → 24h
3. Se construye timestamp: `YYYY-MM-DDTHH:MM:00`
4. Se llama `createRoute()` en `useRoutes.ts`
5. Se inserta en tabla `routes`

**Estado**: ✅ FUNCIONA

---

### 2️⃣ CONSULTA DE RUTAS DISPONIBLES (Pasajero)
**Archivo**: `src/hooks/useAvailableRides.ts`

Código:
```typescript
const { data, error: fetchError } = await supabase
  .from('available_rides')  // ← CONSULTA UNA VIEW
  .select('*')
  .gt('departure_time', now)  // ← Filtra rutas futuras
  .order('departure_time', { ascending: true })
```

**PROBLEMA**: Consulta SELECT * FROM `available_rides` VIEW

---

### 3️⃣ VIEW: available_rides
**Archivo**: `AVAILABLE_RIDES_VIEW.sql`

La VIEW filtra:
```sql
WHERE 
  r.departure_time > NOW()        -- ← Solo rutas futuras
  AND r.status = 'scheduled'      -- ← Solo status "scheduled"
  AND asientos_disponibles > 0    -- ← Solo si hay asientos
```

---

## 🔴 POSIBLES PROBLEMAS

### ❌ Problema 1: Timestamp fuera de rango
Si conductor crea ruta para HOY y ya pasó la hora:
- Timestamp: `2026-04-14T07:25:00`
- NOW(): `2026-04-14T14:26:00`  
- Resultado: `07:25 < 14:26` = **NO APARECE** ✗

**SOLUCIÓN**: ✅ YA IMPLEMENTADA (Selector de fecha)

---

### ❌ Problema 2: Status no es "scheduled"
Si el status guardado es diferente:
- Status guardado: `'scheduled'` ✓
- Status que busca VIEW: `'scheduled'` ✓
- OK

**SOLUCIÓN**: ✅ CÓDIGO ESTÁ BIEN

---

### ❌ Problema 3: Asientos disponibles = 0
Si se guarda `available_seats = 0`:
- La VIEW no muestra la ruta
- Verifica que `parseInt(totalSeats)` sea > 0

**SOLUCIÓN**: ✅ VALIDACIÓN EN CÓDIGO

---

### ❌ Problema 4: RLS Policies Bloqueando
Supabase tiene Row Level Security (RLS) que puede bloquear:
- INSERT en tabla routes ✗
- SELECT en tabla routes ✗
- SELECT en VIEW available_rides ✗

**SOLUCIÓN**: Necesita verificación en Supabase Console

---

## 📋 PASOS DE TEST

### Test 1: Crear Ruta Válida
```
1. Abrir DriverRegisterScreen
2. Llenar datos:
   - Origen: "Bogotá Centro"
   - Destino: "Medellín Centro"
   - Fecha: MAÑANA (14 de abril 2026)
   - Hora Salida: 02:30 PM (14:30)
   - Hora Llegada: 06:30 PM (18:30)
   - Asientos: 4
   - Precio: 50000
3. Crear ruta
4. Verificar que aparezca Alert de éxito
```

### Test 2: Verificar en Base de Datos
```sql
-- Conectar a Supabase
SELECT 
  id, 
  driver_id,
  origin,
  departure_time,
  status,
  total_seats,
  available_seats,
  NOW() as tiempo_actual,
  departure_time > NOW() as "Es futura?"
FROM routes
WHERE status = 'scheduled'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3: Verificar en VIEW
```sql
-- Verificar que aparezca en la VIEW
SELECT 
  id,
  origin,
  destination,
  departure_time,
  driver_name,
  seats_available_count
FROM available_rides
ORDER BY departure_time ASC
LIMIT 10;
```

### Test 4: Ver Desde Pasajero
```
1. Cambiar a dispositivo PASAJERO
2. Ir a "Viajes Disponibles"
3. Buscar la ruta creada por conductor
4. ¿APARECE? ✓ Éxito
5. ¿NO APARECE? Problema
```

---

## 🛠️ DEBUGGING CHECKLIST

- [ ] ¿El timestamp está en formato ISO correcto? (YYYY-MM-DDTHH:MM:SS)
- [ ] ¿El timestamp es >= NOW()?
- [ ] ¿Status = 'scheduled'?
- [ ] ¿available_seats > 0?
- [ ] ¿La VIEW `available_rides` existe?
- [ ] ¿Hay políticas RLS bloqueando SELECT?
- [ ] ¿El conductor está verificado (can_create_routes = true)?
- [ ] ¿Hay algún error en console del teléfono?

---

## 📊 FLUJO ESPERADO

```
Conductor crea:
  origin="Bogotá"
  destination="Medellín"  
  departure_time="2026-04-15T14:30:00"  ← FUTURO
  status="scheduled"
  available_seats=4
  ↓
INSERT into routes
  ↓
Supabase atualiza VIEW available_rides
  ↓
Pasajero abre "Viajes Disponibles"
  ↓
SELECT * FROM available_rides WHERE departure_time > NOW()
  ↓
¡APARECE LA RUTA! ✅
```

---

## 🚨 PROBLEMA CONOCIDO RESUELTO

**Antes**: Conductor creaba rutas para HOY
- Si era 2026-04-14 14:26
- Y ponía hora 07:25
- La ruta NO APARECÍA (ya pasó la hora)

**Solución implementada**:  
✅ Agregamos selector de FECHA  
✅ Ahora puede elegir MAÑANA o próximos días  
✅ Horas 12h (AM/PM) más intuitivas

---

## Próximos Pasos

1. **TEST MANUAL**: Crear ruta mañana a las 2:30 PM
2. **VERIFICAR EN BD**: Usar SQL para confirmar que existe
3. **VERIFICAR EN VIEW**: Confirmar que aparece en available_rides
4. **VERIFICAR EN PASAJERO**: Confirmar que lo ve el pasajero
5. **SI FALLA**: Revisar logs console del teléfono

