# 📱 GUÍA DE TESTING: Flujo Completo de Creación de Rutas

## 🎯 Objetivo
Verificar que el conductor PUEDA crear una ruta y que los pasajeros LA VEAN

---

## 📋 REQUISITOS PREVIOS

- [ ] 2 dispositivos con APK instalada (o 2 instancias de Expo Go)
- [ ] 1 cuenta CONDUCTOR verificada
- [ ] 1 cuenta PASAJERO
- [ ] Conexión a Supabase dashboard
- [ ] Console de logs abierta (para ver errores)

---

## 🚀 PASO 1: PREPARAR DISPOSITIVOS

### Dispositivo 1 (CONDUCTOR)
```
1. Abre la app
2. Login como CONDUCTOR verificado
3. Verifica que está en "Panel de Conductor"
4. Abre DevTools (Herramientas de Desarrollador)
   - En Android: Abre console de adb o Expo Go logs
   - En iOS: Usa Safari DevTools
```

### Dispositivo 2 (PASAJERO)
```
1. Abre la app
2. Login como PASAJERO
3. Ve a "Viajes Disponibles" (AvailableRidesScreen)
4. Anota qué rutas ves ANTES de que el conductor cree
```

---

## 🛣️ PASO 2: CREAR RUTA (CONDUCTOR)

### En Dispositivo 1:

```
1. Toca: "Panel de Conductor" → "Crear Nueva Ruta"
2. Llena formulario:
   ┌─────────────────────────────────┐
   │ ORIGEN: "Bogotá Centro"         │
   │ ZONA ORIGEN: "Cra 7"            │
   │ DESTINO: "Medellín Centro"      │
   │ ZONA DESTINO: "Cra 49"          │
   │                                 │
   │ FECHA: [Mañana o próximo día]   │
   │ SALIDA: 02:30 AM → PM           │  ← IMPORTANTE: Usa PM
   │ LLEGADA: 06:30 PM               │
   │ VEHÍCULO: Auto                  │
   │ ASIENTOS: 4                     │
   │ PRECIO: $50,000                 │
   └─────────────────────────────────┘

3. Observa CONSOLE LOGS (muy importante):
   - Verás: "🕐 CONVERSIÓN DE HORAS:"
   - Verás: "📅 TIMESTAMPS CONSTRUIDOS:"
   - Verás: "⏰ VALIDACIÓN DE TIEMPOS:"
   - Verás: "🚗 DATOS DE RUTA A CREAR:"
   
4. Toca: "CREAR RUTA"

5. Si funciona, verás:
   - Alert: "¡Ruta creada correctamente!"
   - Console: "✅ RUTA CREADA EXITOSAMENTE:"
   - Verás todo el JSON de la ruta creada

6. Si falla, verás:
   - Alert con mensaje de error
   - Console: "❌ Error al crear ruta"
```

---

## 📊 PASO 3: VERIFICAR EN SUPABASE

### En tu navegador (Supabase Dashboard):

```
1. Abre: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a: "SQL Editor"
4. Copia el contenido de DIAGNOSTIC_ROUTE_CREATION.sql
5. Ejecuta PASO 1: Ver todas las rutas
   - ¿APARECE la ruta que acabas de crear?
   - ✅ SÍ → Continúa al PASO 5
   - ❌ NO → ERROR EN CREACIÓN (ver PASO 4)

6. Si aparece, ejecuta PASO 2-3: Verificar VIEW
   - ¿APARECE en available_rides?
   - ✅ SÍ → Continúa al PASO 5
   - ❌ NO → PROBLEMA EN VIEW (ver PASO 4)
```

---

## 🐛 PASO 4: DIAGNOSTICAR PROBLEMAS

### Si la ruta NO aparece en tabla routes:

```
Posible causa: Error en creación
Solución:
  1. Verifica console logs en dispositivo
  2. ¿Qué error muestra?
  3. ¿El conductor está verificado?
  4. ¿Tiene vehículo definido ("Mi Vehículo")?
  5. ¿Los timestamps se construyeron correctamente?
```

### Si la ruta aparece en routes PERO NO en available_rides:

```
Posible causa: VIEW filtra la ruta
Ejecuta en Supabase SQL:
  SELECT * FROM available_rides LIMIT 5;
  
Luego ejecuta PASO 8 del diagnostic:
  SELECT ... FROM routes WHERE id = 'TU_ROUTE_ID'
  
Esto te dirá exactamente por qué:
  ❌ departure_time ya pasó
  ❌ status no es "scheduled"
  ❌ No hay asientos disponibles
  ❌ departure_time es NULL
```

---

## 👀 PASO 5: VERIFICAR EN PASAJERO

### En Dispositivo 2:

```
1. Abre "Viajes Disponibles"
2. Verás console logs:
   - "🔍 BUSCANDO RUTAS DISPONIBLES:"
   - "✅ Se encontraron X rutas disponibles:"
   - Lista de rutas con origen → destino

3. ¿VES la ruta del conductor?
   - ✅ SÍ → ¡ÉXITO! Flujo funciona correctamente
   - ❌ NO → Continúa al PASO 6
```

---

## 🔄 PASO 6: VERIFICAR ACTUALIZACIÓN EN TIEMPO REAL

### En Dispositivo 1 (Conductor):

```
1. Crea OTRA ruta diferente
2. Verifica console logs que dice ✅ ÉXITO
```

### En Dispositivo 2 (Pasajero):

```
1. Sin tocar nada, espera 3 segundos
   (la app tiene subscription en tiempo real)
2. ¿APARECE automáticamente la NEW ruta?
   - ✅ SÍ → Realtime subscription funciona
   - ❌ NO → Desliza para refrescar manualmente
             (toca el botón "Refrescar")
```

---

## 📝 CHECKLIST DE VALIDACIÓN

```
CREACIÓN:
  [ ] Se ve Alert de éxito
  [ ] Console muestra "✅ RUTA CREADA EXITOSAMENTE"
  [ ] No hay errores en console

BASE DE DATOS:
  [ ] Ruta aparece en tabla routes
  [ ] estado_temporal = "✅ FUTURA"
  [ ] status = 'scheduled'
  [ ] available_seats = 4

VIEW DISPONIBLES:
  [ ] Ruta aparece en available_rides
  [ ] seats_available_count > 0
  [ ] driver_name se mantiene

VISIBILIDAD PASAJERO:
  [ ] Se ve en "Viajes Disponibles"
  [ ] Datos mostrados son correctos
  [ ] Actualización en tiempo real funciona

ERROR EN PASO X?
  [ ] Revisar console logs (incluir screenshoot)
  [ ] Revisar SQL diagnostic (PASO 8)
  [ ] Verificar que conductor está verificado
  [ ] Verificar que tiene vehículo definido
```

---

## 🐛 DEBUGGING: COMANDOS ÚTILES

### Para ver console logs en Android:
```
adb logcat | grep "RN" 
```

### Para ver console logs en Expo:
```
En Expo Go app, presiona CTRL+M
Selecciona "Debug remote JS"
```

### Para ver errores de Supabase:
```
En Supabase Dashboard:
1. Ve a: Realtime
2. Va a ver logs de INSERT, UPDATE, etc
```

---

## 📸 INFORMACIÓN A CAPTURAR SI FALLA

1. **Screenshot de error alert** (qué dice exactamente)
2. **Console logs completos** (especialmente los que empiezan con 🔍, 🕐, 📅, 🚗, 🚌)
3. **ID de la ruta creada** (UUID)
4. **Resultado de SQL diagnostic PASO 1** (¿aparece la ruta?)
5. **Resultado de SQL diagnostic PASO 3** (¿aparece en VIEW?)
6. **Resultado de SQL diagnostic PASO 8** (¿por qué no aparece?)

---

## ✅ FLUJO ESPERADO (Todo funciona)

```
CONDUCTOR crea ruta:
  console: "🕐 CONVERSIÓN DE HORAS: 2:30 PM → 14:30"
  console: "📅 TIMESTAMPS CONSTRUIDOS: 2026-04-15T14:30:00"
  console: "✅ RUTA CREADA EXITOSAMENTE"
  ↓
SUPABASE tabla routes: ✅ Aparece
  ↓
SUPABASE VIEW available_rides: ✅ Aparece
  ↓
PASAJERO abre "Viajes Disponibles":
  console: "✅ Se encontraron 3 rutas disponibles:"
  console: "  - Bogotá → Medellín (2026-04-15T14:30:00)"
  ↓
PASAJERO VE la ruta: ✅ ÉXITO
```

---

## 🆘 ¿Algo no funciona?

Proporciona:
1. El error exacto del alert
2. Los console logs (copiar/pegar)
3. El resultado del SQL diagnostic
4. Capturas de pantalla del problema

