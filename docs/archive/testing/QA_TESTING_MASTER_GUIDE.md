# 🧪 QA TESTING SENIOR - GUÍA DE EJECUCIÓN

## 📋 ESTADO: TESTING COMPLETO EN PROGRESS

Como **QA Tester Senior**, voy a guiarte paso a paso para ejecutar un testing exhaustivo y profesional del sistema de booking de Trive. 

---

## 🚀 PASO 1: PREPARAR AMBIENTE

### 1.1 Verificar que Expo está corriendo
```
Terminal: npm start → Port 8082
```

### 1.2 Abrir Supabase Dashboard
```
https://app.supabase.com
→ Tu Proyecto
→ SQL Editor
```

### 1.3 Abrir 2 simuladores o navegadores
- **Opción A:** `Press 'a'` en Expo → Android Simulador
- **Opción B:** `Press 'w'` en Expo → Web Browser
- **Opción C:** 2 dispositivos físicos en la misma WiFi

---

## 🧪 FASE 1: SETUP DE DATOS DE PRUEBA

### Paso 1: Ejecutar script de setup

1. Abre Supabase SQL Editor
2. Copia TODO el contenido de: **[QA_01_SETUP_TEST_DATA.sql](QA_01_SETUP_TEST_DATA.sql)**
3. Click **"RUN"**
4. **VERIFICAR:** Se crean 3 usuarios y 2 rutas

**Resultado esperado:**
```
✅ 3 usuarios creados
✅ 2 rutas creadas (Bogotá-Cali, Bogotá-Medellín)
✅ Todos los datos en la BD
```

### Paso 2: Anotar IDs para referencia

```
CONDUCTOR_ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
PASAJERO_1_ID: a1234567-89ab-cdef-0123-456789abcdef
PASAJERO_2_ID: b2345678-90ab-cdef-0123-456789abcdef
```

---

## ✅ FASE 2: TEST - CREAR RUTAS (Conductor)

### Paso 1: Login Conductor en App

```
Email: conductor1@test.com
Contraseña: Test1234!
```

**VERIFICAR EN APP:**
- ✅ Login exitoso
- ✅ Role = "Conductor"
- ✅ Sin errores de consola

### Paso 2: Navegar a "Panel del Conductor"

**VERIFICAR EN APP:**
- ✅ Pantalla carga sin congelación
- ✅ Muestra botón "+ Crear Viaje"
- ✅ Lista de rutas visible (vacía al principio)

### Paso 3: Crear Primera Ruta

1. Click **"+ Crear Viaje"**
2. Completa formulario:
   ```
   Origen: Bogotá
   Destino: Cali
   Fecha: Hoy
   Hora: 14:00 (o próxima en el futuro)
   Total de asientos: 4
   Precio por asiento: $50,000
   Vehículo: Toyota Camry 2024 - Blanco
   Placa: ABC-1234
   ```
3. Click **"Crear Viaje"**

**VERIFICAR EN APP:**
- ✅ Ruta aparece en lista
- ✅ Status: "Scheduled"
- ✅ 4 asientos disponibles
- ✅ Sin congelación/errores

### Paso 4: Crear Segunda Ruta

1. Repite proceso
2. Datos:
   ```
   Origen: Bogotá
   Destino: Medellín
   Hora: 16:00
   Total de asientos: 3
   Precio: $45,000
   ```

**VERIFICAR EN APP:**
- ✅ 2 rutas en panel
- ✅ Ambas con status "Scheduled"
- ✅ Sin errores

### Paso 5: Verificar en BD

1. Abre Supabase SQL Editor
2. Copia script: **[QA_02_VERIFY_ROUTES_CREATED.sql](QA_02_VERIFY_ROUTES_CREATED.sql)**
3. Click **"RUN"**

**RESULTADO ESPERADO:**
```
Total rutas: 2 ✅
Scheduled: 2 ✅
Rutas con 4 asientos: 1 ✅
Rutas con 3 asientos: 1 ✅
Total bookings: 0 ✅
```

---

## 👥 FASE 3: TEST - PASAJERO VE Y RESERVA

### Paso 1: Login Pasajero 1 (en otro navegador/dispositivo)

```
Email: pasajero1@test.com
Contraseña: Test1234!
```

**VERIFICAR EN APP:**
- ✅ Login exitoso
- ✅ Role = "Pasajero"

### Paso 2: Ver Rutas Disponibles

1. Navega a **"Viajes Ahora"** o **"Viajes Disponibles"**

**VERIFICAR EN APP:**
- ✅ Se ven AMBAS rutas:
  - Bogotá → Cali (4 asientos disponibles)
  - Bogotá → Medellín (3 asientos disponibles)
- ✅ Precios correctos
- ✅ Horarios correctos
- ✅ Sin retrasos

### Paso 3: Seleccionar Ruta Bogotá → Cali

1. Click en la ruta

**VERIFICAR EN APP:**
- ✅ Abre pantalla de selección de asientos
- ✅ Se ven 4 asientos (1, 2, 3, 4)
- ✅ Todos en color VERDE (disponibles)
- ✅ Sin congelaciones

### Paso 4: Seleccionar Asientos 1 y 2

1. Click Asiento 1 → Color cambia a AZUL/SELECCIONADO
2. Click Asiento 2 → Color cambia a AZUL/SELECCIONADO
3. Verifica contador: "2 asientos seleccionados"
4. Click **"Continuar"**

**VERIFICAR EN APP:**
- ✅ Asientos se seleccionan visualmente
- ✅ Contador funciona
- ✅ Botón funciona

### Paso 5: Confirmar Reserva

1. Click **"Confirmar"** / **"Completar Reserva"**
2. **⏱️ MEDIR TIEMPO:** Anota tiempo antes y después

**CRÍTICO - VERIFICAR EN APP:**
- ✅ **NO SE CONGELA** (máximo 3 segundos)
- ✅ Muestra confirmación
- ✅ Muestra total: $100,000 (2 × $50,000)
- ✅ Muestra booking ID
- ✅ Sin errores RLS o red

**TIEMPO MEDIDO:** _____ segundos

### Paso 6: Verificar en BD

1. Abre Supabase SQL Editor
2. Copia script: **[QA_03_VERIFY_BOOKINGS.sql](QA_03_VERIFY_BOOKINGS.sql)**
3. Click **"RUN"**

**RESULTADO ESPERADO:**
```
Total bookings: 2 ✅
Confirmed: 2 ✅
Pasajero 1: 2 bookings ✅
Seat 1: Carlos, confirmed, $50,000 ✅
Seat 2: Carlos, confirmed, $50,000 ✅
Available seats: 2 (4-2) ✅
Total pagado: $100,000 ✅
```

---

## 🔄 FASE 4: TEST - ACTUALIZACIÓN EN TIEMPO REAL

### Paso 1: Pasajero 2 Ve Ruta Actualizada

1. En OTRO navegador/dispositivo, login Pasajero 2:
   ```
   Email: pasajero2@test.com
   Contraseña: Test1234!
   ```

2. Navega a **"Viajes Ahora"**
3. Click en **Bogotá → Cali**

**⏱️ MEDIR TIEMPO:** Tiempo desde que Pasajero 1 confirmó

**CRÍTICO - VERIFICAR EN APP:**
- ✅ Asiento 1: **ROJO** (ocupado)
- ✅ Asiento 2: **ROJO** (ocupado)
- ✅ Asiento 3: **VERDE** (disponible)
- ✅ Asiento 4: **VERDE** (disponible)
- ✅ Contador: "2 de 4 asientos ocupados"

**TIEMPO DE ACTUALIZACIÓN:** _____ segundos (esperado: < 5)

**SI NO ACTUALIZA:**
- Espera 3 segundos (polling)
- Cierra y reabre pantalla
- Si aún no actualiza: ❌ ERROR - revisar realtime

### Paso 2: Pasajero 2 Reserva Asiento 3

1. Click Asiento 3 → AZUL/SELECCIONADO
2. Click **"Continuar"** → **"Confirmar"**

**VERIFICAR EN APP:**
- ✅ Se confirma sin congelaciones
- ✅ Muestra total: $45,000 (1 × $45,000)
- ✅ Sin errores

### Paso 3: Verificar Cambios en Tiempo Real (Pasajero 1)

1. En navegador de Pasajero 1
2. Navega a **"Viajes Ahora"** → Click Bogotá → Cali

**⏱️ MEDIR TIEMPO:** Tiempo desde que Pasajero 2 confirmó

**VERIFICAR EN APP:**
- ✅ Asiento 3 ahora **ROJO** (ocupado)
- ✅ Solo Asiento 4 verde (disponible)
- ✅ Contador: "3 de 4 asientos ocupados"

**TIEMPO:** _____ segundos

### Paso 4: Verificar en BD

Copia: **[QA_04_VERIFY_REALTIME.sql](QA_04_VERIFY_REALTIME.sql)**

**RESULTADO ESPERADO:**
```
Carlos Pasajero 1: 2 asientos ✅
María Pasajero 2: 1 asiento ✅

Seat 1: 🔴 OCUPADO (Carlos)
Seat 2: 🔴 OCUPADO (Carlos)
Seat 3: 🔴 OCUPADO (María)
Seat 4: 🟢 DISPONIBLE

Available seats: 1 ✅
Seconds since last booking: < 5 ✅
```

---

## 🚗 FASE 5: TEST - CONDUCTOR VE PASAJEROS

### Paso 1: Login Conductor

1. Navega a **"Panel del Conductor"**
2. Click en ruta **Bogotá → Cali**

**VERIFICAR EN APP:**
- ✅ Muestra lista de pasajeros:
  - Carlos (Asientos 1, 2)
  - María (Asiento 3)
- ✅ Teléfonos visibles
- ✅ 2 pasajeros, 3 asientos ocupados, 1 disponible

### Paso 2: Verificar en BD

Ejecuta dashboard: **[QA_05_COMPLETE_DASHBOARD.sql](QA_05_COMPLETE_DASHBOARD.sql)**

**RESULTADO ESPERADO:**
```
SECCIÓN 3: BOOKINGS
- Total bookings: 3 ✅
- Confirmed: 3 ✅

SECCIÓN 4: DETALLE
- Carlos: 2 asientos ✅
- María: 1 asiento ✅

SECCIÓN 5: DISPONIBLES
- Available seats: 1 ✅
- Occupancy: 75% ✅

SECCIÓN 6: CONSISTENCIA
- ✅ CONSISTENTE ✅
```

---

## ❌ FASE 6: TEST - CANCELACIÓN

### Paso 1: Pasajero 1 Cancela

1. Login Pasajero 1
2. Navega a **"Viajes Activos"**
3. Click en Bogotá → Cali
4. Click **"Cancelar Viaje"** → Confirma

**VERIFICAR EN APP:**
- ✅ Desaparece de Viajes Activos
- ✅ Confirmación clara
- ✅ Sin errores

### Paso 2: Verificar Asientos Liberados (Pasajero 2)

1. En Pasajero 2: **"Viajes Ahora"** → Bogotá → Cali

**⏱️ MEDIR TIEMPO:** Tiempo desde cancelación

**VERIFICAR EN APP:**
- ✅ Asiento 1: VERDE (se liberó)
- ✅ Asiento 2: VERDE (se liberó)
- ✅ Asiento 3: ROJO (todavía ocupado - Pasajero 2)
- ✅ Asiento 4: VERDE
- ✅ Contador: "1 de 4"

**TIEMPO:** _____ segundos

---

## 🎯 FASE 7: TEST - INICIAR VIAJE

### Paso 1: Conductor Inicia Viaje

1. Conductor: **Panel del Conductor** → Bogotá → Cali
2. Click **"Iniciar Viaje"** / **"Comenzar"**

**VERIFICAR EN APP:**
- ✅ Status cambia a "En Curso" / "In Progress"
- ✅ Botón cambia a "Completar"
- ✅ Sin congelaciones

### Paso 2: Pasajero Ve Cambio

1. Pasajero 2: **"Viajes Activos"**

**VERIFICAR EN APP:**
- ✅ Viaje muestra "En curso"
- ✅ Sin errores

### Paso 3: Verificar en BD

```sql
SELECT status FROM routes 
WHERE origin = 'Bogotá' AND destination = 'Cali';
-- Esperado: 'in_progress'
```

---

## 🆘 FASE 8: TEST - LLENADO COMPLETO

### Objetivo: Llenar todos los asientos (Ruta Medellín - 3 asientos)

### Paso 1: Pasajero 1 Reserva Asiento 1
1. **Viajes Ahora** → Bogotá → Medellín
2. Asiento 1 → Confirma

### Paso 2: Pasajero 2 Reserva Asiento 2
1. **Viajes Ahora** → Bogotá → Medellín
2. Asiento 2 → Confirma

### Paso 3: Crear Pasajero 3 y Reservar Asiento 3
1. Crea nueva cuenta: `pasajero3@test.com`
2. Reserva Asiento 3

**VERIFICAR EN APP:**
- ✅ Todos 3 asientos: ROJO
- ✅ Contador: "3 de 3 - LLENO"
- ✅ Botón "Reservar" deshabilitado

---

## 📊 FASE FINAL: DASHBOARD COMPLETO

Ejecuta: **[QA_05_COMPLETE_DASHBOARD.sql](QA_05_COMPLETE_DASHBOARD.sql)**

Esto mostrará:
- ✅ Todos los usuarios
- ✅ Todas las rutas
- ✅ Todos los bookings
- ✅ Estado de ocupación
- ✅ Consistencia de datos
- ✅ Notificaciones
- ✅ Revenue total

---

## ✅ CHECKLIST FINAL

```
CREACIÓN DE RUTAS
[ ] Conductor crea 2 rutas ✅/❌
[ ] Aparecen en BD inmediatamente ✅/❌

VISUALIZACIÓN
[ ] Pasajero ve ambas rutas ✅/❌
[ ] Información correcta mostrada ✅/❌
[ ] Sin retrasos ✅/❌

RESERVA
[ ] Selección visual funciona ✅/❌
[ ] Múltiples asientos OK ✅/❌
[ ] SIN CONGELACIONES ⚠️ ✅/❌
[ ] Confirmación rápida (<3s) ✅/❌
[ ] BD actualiza correctamente ✅/❌

ACTUALIZACIÓN EN TIEMPO REAL
[ ] Cambios visibles entre usuarios (<5s) ✅/❌
[ ] Realtime subscription funciona ✅/❌
[ ] Polling funciona ✅/❌

PASAJEROS CANCELAN
[ ] Cancelación funciona ✅/❌
[ ] Asientos se liberan ✅/❌
[ ] Otros ven cambios (<5s) ✅/❌

CONDUCTOR INICIA VIAJE
[ ] Status cambia a "In Progress" ✅/❌
[ ] Pasajeros notificados ✅/❌
[ ] Sin errores ✅/❌

LLENADO COMPLETO
[ ] 3 pasajeros pueden reservar en ruta 3-seat ✅/❌
[ ] UI indica "LLENO" ✅/❌

CONSISTENCIA
[ ] BD siempre consistente ✅/❌
[ ] Sin datos corruptos ✅/❌

ERRORES
[ ] Consola limpia (sin errors) ✅/❌
[ ] Sin RLS errors ✅/❌
[ ] Sin 500 errors ✅/❌
```

---

## 🚀 SIGUIENTE PASO

Si TODO está ✅:

```bash
# Build para producción
eas build -p android --profile production
eas build -p ios --profile production

# Upload a:
# - Google Play Console
# - App Store Connect
```

Si hay ❌:
1. Documenta qué falló
2. Revisa logs en Expo
3. Ejecuta queries de diagnóstico
4. Contacta soporte

---

## 📞 SOPORTE DURANTE TESTING

Si encuentras problemas:

1. **Consola Expo:** `Press 'j'` → DevTools
2. **Supabase Logs:** Dashboard → Logs
3. **Queries de diagnóstico:** [TESTING_SQL_QUERIES.sql](TESTING_SQL_QUERIES.sql)

**¿Listo para empezar? ¡Ejecutemos el testing! 🎯**