# 🧪 GUÍA PASO A PASO - EJECUTAR TESTING COMPLETO

## 📱 CÓMO EJECUTAR TESTING CON MÚLTIPLES USUARIOS

### Opción 1: DOS SIMULADORES (Android/iOS)
```bash
# Terminal 1: Expo
npm start

# Terminal 2: Android
eas build -p android --profile preview

# Terminal 3: iOS (si tienes Mac)
eas build -p ios --profile preview
```

### Opción 2: WEB + SIMULADOR (Más fácil)
```bash
# En Expo:
Press 'w' para abrir Web
Press 'a' para abrir Android Simulador
# Abre ambas ventanas lado a lado para ver cambios en tiempo real
```

### Opción 3: DOS DISPOSITIVOS FÍSICOS
- Conecta dos teléfonos a la WiFi misma red
- Abre Expo en ambos
- Escanea QR en cada uno

---

## ✅ TESTING WORKFLOW

### FASE 1: SETUP INICIAL (5 min)

**En Terminal con Expo corriendo:**
```
Press 'a'  → Abre Android Simulador
Press 'w'  → Abre Web Browser
```

**Abre Supabase Dashboard en otra ventana:**
```
https://app.supabase.com
→ Tu proyecto
→ SQL Editor
```

**Copia las queries de testing** desde [TESTING_SQL_QUERIES.sql](TESTING_SQL_QUERIES.sql)

---

### FASE 2: TEST 1 - CREAR RUTAS (Conductor)

**Paso 1: Login Conductor**
```
Email: conductor1@test.com
Contraseña: Test1234!
```

**Paso 2: Create Route #1**
- Origin: Bogotá
- Destination: Cali  
- Date: Today + 2 hours
- Seats: 4
- Price: $50,000

**VERIFICAR EN SUPABASE:**
```sql
SELECT * FROM routes 
WHERE driver_id = 'CONDUCTOR_ID'
AND status = 'scheduled';

-- Debe mostrar 1 fila con 4 asientos disponibles
```

**Paso 3: Create Route #2**
- Origin: Bogotá
- Destination: Medellín
- Date: Today + 4 hours
- Seats: 3
- Price: $45,000

**VERIFICAR EN SUPABASE:**
```sql
SELECT * FROM routes 
WHERE driver_id = 'CONDUCTOR_ID'
ORDER BY created_at DESC;

-- Debe mostrar 2 rutas
```

**CHECKPOINTS:**
- ✅ Ambas rutas creadas sin errores
- ✅ Status es 'scheduled'
- ✅ Asientos correctos (4 y 3)
- ✅ Sin congelaciones
- ✅ Consola limpia (sin errores)

---

### FASE 3: TEST 2 - PASAJERO VE RUTAS (Pasajero 1)

**Paso 1: Logout Conductor, Login Pasajero 1**
```
Email: pasajero1@test.com
Contraseña: Test1234!
```

**Paso 2: Navega a "Viajes Ahora" / "Available Rides"**

**VERIFICAR EN PANTALLA:**
- ✅ Ve ambas rutas
- ✅ Bogotá → Cali: 4 asientos disponibles
- ✅ Bogotá → Medellín: 3 asientos disponibles
- ✅ Precios correctos
- ✅ Horarios correctos

**VERIFICAR EN SUPABASE:**
```sql
SELECT * FROM available_rides
WHERE departure_time > NOW()
AND departure_time < NOW() + INTERVAL '24 hours';

-- Debe mostrar 2 rutas
```

**CHECKPOINTS:**
- ✅ Datos sincronizados entre app y BD
- ✅ View 'available_rides' funciona
- ✅ Sin retrasos

---

### FASE 4: TEST 3 - RESERVAR ASIENTOS (Pasajero 1)

**Paso 1: Click Ruta Bogotá → Cali**

**VERIFICAR EN PANTALLA:**
- ✅ Abre pantalla de selección de asientos
- ✅ 4 asientos verdes/disponibles
- ✅ Numerados 1, 2, 3, 4
- ✅ Sin congelaciones

**Paso 2: Selecciona Asiento 1**
- ✅ Cambia de color (ej: verde → azul)

**Paso 3: Selecciona Asiento 2**
- ✅ También cambia de color
- ✅ Contador: "2 asientos seleccionados"

**Paso 4: Click "Continuar" → "Confirmar"**

**⏱️ MEDIR TIEMPO:** Toma nota del tiempo antes y después

**VERIFICAR EN PANTALLA:**
- ✅ **NO SE CONGELA** (muy importante)
- ✅ Recibe confirmación
- ✅ Muestra total: $100,000 (2 × $50,000)
- ✅ Muestra booking ID

**VERIFICAR EN SUPABASE:**
```sql
SELECT * FROM bookings 
WHERE booking_status = 'confirmed'
ORDER BY created_at DESC
LIMIT 5;

-- Debe mostrar la reserva de Pasajero 1
-- Asientos 1 y 2 en ruta Bogotá-Cali

SELECT available_seats FROM routes 
WHERE id = 'ROUTE_ID_BOGOTA_CALI';

-- Debe mostrar 2 (4 - 2 ocupados)
```

**CHECKPOINTS:**
- ✅ **SIN CONGELACIONES** ⚠️ CRÍTICO
- ✅ Booking creado en BD
- ✅ available_seats actualizado (4 → 2)
- ✅ Sin errores RLS

---

### FASE 5: TEST 4 - ACTUALIZACIÓN EN TIEMPO REAL (Pasajero 2)

**Paso 1: Login Pasajero 2 (en otra ventana/dispositivo)**
```
Email: pasajero2@test.com
Contraseña: Test1234!
```

**Paso 2: Navega a "Viajes Ahora"**

**Paso 3: Click Ruta Bogotá → Cali**

**⏱️ MEDIR TIEMPO:** Tiempo desde que Pasajero 1 confirmó

**VERIFICAR EN PANTALLA - ACTUALIZACIÓN EN TIEMPO REAL:**
- ✅ Asiento 1: **ROJO** (Ocupado por Pasajero 1)
- ✅ Asiento 2: **ROJO** (Ocupado por Pasajero 1)
- ✅ Asiento 3: **VERDE** (Disponible)
- ✅ Asiento 4: **VERDE** (Disponible)
- ✅ Contador: "2 de 4 asientos ocupados"

**⏱️ TIEMPO ESPERADO:** < 5 segundos

**Si NO se actualiza:**
- Cierra y reabre pantalla
- Intenta pull-to-refresh
- Espera 3 segundos más (polling)

**Paso 4: Selecciona Asiento 3 → Confirma**

**CHECKPOINTS:**
- ✅ Realtime updates funcionan
- ✅ Tiempo < 5 segundos
- ✅ Sin congelaciones

---

### FASE 6: TEST 5 - VER ASIENTOS ACTUALIZADOS (Pasajero 1)

**Paso 1: Pasajero 1 navega a "Viajes Ahora" nuevamente**

**Paso 2: Click Ruta Bogotá → Cali**

**⏱️ MEDIR TIEMPO:** Debe actualizarse rápido

**VERIFICAR EN PANTALLA:**
- ✅ Asiento 1: ROJO (su asiento)
- ✅ Asiento 2: ROJO (su asiento)
- ✅ Asiento 3: **ROJO** (Ahora ocupado por Pasajero 2)
- ✅ Asiento 4: VERDE (Disponible)
- ✅ Contador: "3 de 4 asientos ocupados"

**CHECKPOINTS:**
- ✅ Cambios reflejados en tiempo real
- ✅ Consistencia entre usuarios

---

### FASE 7: TEST 6 - CONDUCTOR VE PASAJEROS

**Paso 1: Login Conductor**

**Paso 2: Panel del Conductor → Ruta Bogotá → Cali**

**VERIFICAR EN PANTALLA:**
- ✅ Lista de pasajeros:
  - Pasajero 1: Asientos 1, 2
  - Pasajero 2: Asiento 3
- ✅ Teléfonos y emails visibles
- ✅ Total: 2 pasajeros, 3 asientos ocupados, 1 disponible

**VERIFICAR EN SUPABASE:**
```sql
SELECT p.name, b.seat_number, b.booking_status
FROM bookings b
LEFT JOIN profiles p ON b.passenger_id = p.id
WHERE b.route_id = 'ROUTE_ID_BOGOTA_CALI'
ORDER BY b.seat_number;

-- Debe mostrar 2 pasajeros en 3 asientos
```

**CHECKPOINTS:**
- ✅ Conductor ve datos correctos
- ✅ Lista actualizada

---

### FASE 8: TEST 7 - CANCELACIÓN DE RESERVA

**Paso 1: Login Pasajero 1**

**Paso 2: Viajes Activos → Ruta Bogotá → Cali**

**Paso 3: Click "Cancelar Viaje" → Confirma**

**VERIFICAR EN PANTALLA:**
- ✅ Desaparece de Viajes Activos
- ✅ Mensaje de confirmación

**VERIFICAR EN SUPABASE:**
```sql
SELECT * FROM bookings 
WHERE passenger_id = 'PASAJERO_1_ID'
ORDER BY created_at DESC;

-- Debe mostrar booking_status = 'cancelled'
```

---

### FASE 9: TEST 8 - ASIENTOS LIBERADOS

**Paso 1: Login Pasajero 2**

**Paso 2: Viajes Ahora → Bogotá → Cali**

**⏱️ MEDIR TIEMPO:** Tiempo de actualización

**VERIFICAR EN PANTALLA:**
- ✅ Asiento 1: **VERDE** (Se liberó - Pasajero 1 canceló)
- ✅ Asiento 2: **VERDE** (Se liberó - Pasajero 1 canceló)
- ✅ Asiento 3: ROJO (Todavía ocupado - Pasajero 2)
- ✅ Asiento 4: VERDE
- ✅ Contador: "1 de 4 asientos ocupados"

**⏱️ TIEMPO ESPERADO:** < 5 segundos

**CHECKPOINTS:**
- ✅ Asientos se liberan correctamente
- ✅ Realtime updates fast
- ✅ Sin inconsistencias

---

### FASE 10: TEST 9 - INICIAR VIAJE

**Paso 1: Login Conductor**

**Paso 2: Panel del Conductor → Ruta Bogotá → Cali**

**Paso 3: Click "Iniciar Viaje" / "Comenzar"**

**VERIFICAR EN PANTALLA:**
- ✅ Status cambia a "En Curso" / "In Progress"
- ✅ Botón cambia a "Completar Viaje"
- ✅ Sin congelaciones

**VERIFICAR EN SUPABASE:**
```sql
SELECT status FROM routes WHERE id = 'ROUTE_ID_BOGOTA_CALI';

-- Debe mostrar: 'in_progress'
```

---

### FASE 11: TEST 10 - PASAJERO VE VIAJE INICIADO

**Paso 1: Login Pasajero 2**

**Paso 2: Viajes Activos**

**VERIFICAR EN PANTALLA:**
- ✅ Viaje Bogotá → Cali muestra "En curso"
- ✅ Sin errores

**CHECKPOINTS:**
- ✅ Cambio de status propagado
- ✅ Sin retrasos

---

### FASE 12: TEST 11 - LLENADO COMPLETO

**Objetivo:** Llenar todos los asientos de la ruta Bogotá → Medellín (3 asientos)

**Paso 1: Create Pasajero 3**
```
Email: pasajero3@test.com
Contraseña: Test1234!
```

**Paso 2: Pasajero 1 - Reserva Asiento 1 en Bogotá → Medellín**

**Paso 3: Pasajero 2 - Reserva Asiento 2 en Bogotá → Medellín**

**Paso 4: Pasajero 3 - Reserva Asiento 3 en Bogotá → Medellín**

**VERIFICAR EN PANTALLA:**
- ✅ Todos 3 asientos: ROJO/Ocupados
- ✅ Contador: "3 de 3 - LLENO"
- ✅ Botón "Reservar" deshabilitado

**VERIFICAR EN SUPABASE:**
```sql
SELECT available_seats FROM routes 
WHERE id = 'ROUTE_ID_BOGOTA_MEDELLIN';

-- Debe mostrar: 0
```

**CHECKPOINTS:**
- ✅ Ruta llena correctamente
- ✅ No permite más reservas
- ✅ UI indica "LLENO" claramente

---

## 📊 VERIFICACIÓN FINAL EN CONSOLA

Abre Expo DevTools y verifica:

```
✅ "Booking created successfully"
✅ "Realtime subscription triggered"
✅ "Available rides updated"
✅ "Notification sent"
✅ No RLS errors
✅ No 500 errors
✅ No network errors
✅ No freezes
```

---

## 📋 RESUMEN DE CHECKLIST

```
CREACIÓN DE RUTAS
[ ] Conductor crea 2 rutas
[ ] Aparecen inmediatamente
[ ] Status correcto
[ ] Asientos correctos

VISUALIZACIÓN
[ ] Pasajero ve ambas rutas
[ ] Información correcta
[ ] Sin retrasos

RESERVA DE ASIENTOS
[ ] Selección visual clara (ocupados vs disponibles)
[ ] Múltiples asientos funcionan
[ ] SIN CONGELACIONES
[ ] Confirmación rápida

ACTUALIZACIÓN EN TIEMPO REAL
[ ] Cambios visibles entre usuarios (<5 seg)
[ ] Consistencia de datos
[ ] Polling funciona

CANCELACIÓN
[ ] Pasajero puede cancelar
[ ] Asientos se liberan
[ ] Otros ven cambios

INICIAR VIAJE
[ ] Status cambia
[ ] Pasajeros notificados
[ ] Sin errores

LLENADO
[ ] Ruta se llena completamente
[ ] UI indica "LLENO"
[ ] No permite más reservas

RENDIMIENTO
[ ] CERO congelaciones
[ ] Navegación fluida
[ ] Transiciones rápidas

ERRORES
[ ] Consola limpia
[ ] Sin errores RLS
[ ] Sin 500 errors
[ ] Sin network errors
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN

**TODO DEBE ESTAR EN ✅ PARA PUBLICAR A PRODUCCIÓN**

Si algo está en ❌:
1. Anota qué falló
2. Abre issue en GitHub
3. No publiques hasta que esté arreglado

---

## 🚀 CUANDO TODO ESTÉ OK

```bash
# Build para producción
eas build -p android --platform production
eas build -p ios --platform production

# Upload a:
# - Google Play Console
# - App Store Connect
```
