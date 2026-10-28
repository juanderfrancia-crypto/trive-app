# 🚀 GUÍA PASO A PASO: Prueba DriverRegisterScreen

## ✅ App está corriendo en: http://localhost:8082

---

## 📋 FLUJO NORMAL DE PRUEBA

### Paso 1: Login o Registro
```
1. Abre la app en http://localhost:8082
2. Si no tienes cuenta:
   - Clic "Crear Cuenta"
   - Email: test-conductor@example.com
   - Contraseña: Test1234!
   - Nombre: Test Conductor
   - Teléfono: 3201234567
   - Clic "Registrarse"

3. Si ya tienes cuenta:
   - Email: test-conductor@example.com
   - Clic "Inicia Sesión"
```

### Paso 2: Ir a Perfil
```
1. Espera a que loads la pantalla principal (HomeScreen)
2. Clic en el ícono de "Persona" (abajo derecha) → ProfileScreen
```

### Paso 3: Cambiar a Conductor
```
1. En ProfileScreen, ve la sección "Pasajero | Conductor" arriba
2. Clic en el botón "Conductor" (lado derecho)
3. Deberías ver que se activa el botón (fondo azul)
```

### Paso 4: Abrir Formulario de Creación de Rutas
```
1. Vers el botón rojo "Registrar como Conductor" (o "Publicar Ruta")
2. Clic en ese botón
3. Se abre DriverRegisterScreen
```

### Paso 5: Llenar el Formulario

**Detalles de la ruta:**
```
Origen:    Bogotá Centro
Destino:   Medellín
Salida:    08:30
Llegada:   12:45
```

**Asientos y tarifa:**
```
Total asientos:     4
Precio por asiento: 45000
```

**Verifica:** Deberías ver el resumen:
- Asientos disponibles: 4
- Ingreso total: $180,000

**Datos del vehículo:**
```
Marca:  Toyota
Año:    2020
Placa:  ABX234
Color:  Negro
```

### Paso 6: Publicar la Ruta
```
1. Clic en botón azul "Publicar Ruta"
2. Espera a que se envíe (verás spinner de carga)
3. ¡ÉXITO! Debe aparecer alert: 
   "¡Ruta creada correctamente! Los pasajeros ya pueden verla y reservar."
```

### Paso 7: Confirmar en Base de Datos

Abre Supabase (https://app.supabase.com) y verifica:

```sql
SELECT * FROM routes 
WHERE driver_id = 'TU_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

Deberías ver:
- ✅ origin: "Bogotá Centro"
- ✅ destination: "Medellín"
- ✅ departure_time: "2026-04-04T08:30:00"
- ✅ arrival_time: "2026-04-04T12:45:00"
- ✅ total_seats: 4
- ✅ available_seats: 4
- ✅ price_per_seat: 45000
- ✅ vehicle_make: "Toyota"
- ✅ vehicle_year: 2020
- ✅ vehicle_plate: "ABX234"
- ✅ vehicle_color: "Negro"
- ✅ status: "scheduled"

---

## 🧪 PRUEBAS DE VALIDACIÓN

### Test 1: Campo Origen Vacío
```
1. Llena todos los campos EXCEPTO "Origen"
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa el origen"
```

### Test 2: Horario Inválido
```
1. Salida: "830" (sin dos puntos)
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa la hora de salida (ej: 08:30)"
```

### Test 3: Asientos Fuera de Rango
```
1. Total asientos: "10" (está limitado a 8)
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa asientos válidos (1-8)"
```

### Test 4: Precio Negativo
```
1. Precio por asiento: "-50000"
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa un precio válido"
```

### Test 5: Año Inválido
```
1. Año: "20" (menos de 4 dígitos)
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa un año válido (ej: 2020)"
```

### Test 6: Placa Vacía
```
1. Dejar Placa en blanco
2. Clic "Publicar Ruta"
3. ❌ Esperado: Alert "Por favor ingresa la placa del vehículo"
```

---

## 🔄 PRUEBA COMPLETA: Crear Ruta → Ver en SearchScreen

### Fase 1: Crear Ruta (ya completada arriba)
```
✅ CreateDriver form lleno y enviado
✅ Ruta guardada en BD
```

### Fase 2: Cambiar a Pasajero y Buscar
```
1. ProfileScreen → Botón "Pasajero" (cambiar rol)
2. Espera a que se actualice
3. Clic ícono "Casa" (HomeScreen)
```

### Fase 3: Buscar tu Ruta
```
1. En SearchScreen verás campo de búsqueda
2. Tipo: "Bogotá" (tu origen)
3. ✅ Deberías ver tu ruta en la lista:
   - Bogotá Centro → Medellín
   - 08:30 - 12:45
   - 4 asientos disponibles
   - $45,000 por asiento
```

### Fase 4: Seleccionar Ruta
```
1. Clic en la ruta
2. Se guarda como "selectedRoute" en Zustand
3. Navega a SeatSelectionScreen
```

### Fase 5: Seleccionar Asiento
```
1. Verás 4 asientos (dinámicos del total_seats)
2. Todos están disponibles (azules) inicialmente
3. Clic en asiento "2"
4. Asiento se marca como seleccionado (dorado)
5. Botón "Continuar - Asiento 2" se habilita
6. Clic "Continuar"
```

### Fase 6: Confirmar Booking
```
1. BookingScreen muestra:
   - Tu nombre (pre-llenado)
   - Bogotá Centro → Medellín
   - Precio: $45,000
   - Tarifa servicio (20%): $9,000
   - Total: $54,000
2. Clic "Confirmar Réserva de Pasaje"
```

### Fase 7: Ver Trip Status
```
1. TripStatusScreen muestra:
   - Ruta: Bogotá Centro → Medellín
   - Salida: 08:30, Llegada: 12:45
   - Ocupación: 25% (1 de 4 asientos)
   - Tu asiento: 2 (marcado)
   - Asientos ocupados: grises
   - Asientos disponibles: azules
```

### Fase 8: Verificar en BD

**Profile actualizado:**
```sql
SELECT total_trips, total_spent FROM profiles 
WHERE id = 'TU_USER_ID';
```
- ✅ total_trips: aumentó en 1
- ✅ total_spent: aumentó en $54,000

**Ruta actualizada:**
```sql
SELECT available_seats FROM routes 
WHERE id = 'ID_RUTA_CREADA';
```
- ✅ available_seats: 3 (era 4, menos 1 por tu asiento)

**Booking creado:**
```sql
SELECT * FROM bookings 
WHERE passenger_id = 'TU_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```
- ✅ route_id: ID de tu ruta
- ✅ seat_number: 2
- ✅ price: 54000
- ✅ booking_status: "confirmed"

---

## 📊 PRUEBA 2: Multipasajeros en la misma ruta

### Paso 1: Cambiar a otro usuario
```
1. ProfileScreen → Botón rojo "Cerrar Sesión"
2. Crea nueva cuenta:
   - Email: passenger2@example.com
   - Contraseña: Test1234!
   - Nombre: Passenger Two
   - Teléfono: 3207654321
```

### Paso 2: Buscar la ruta
```
1. HomeScreen → SearchScreen
2. Tipo: "Bogotá"
3. ✅ Ves la misma ruta pero ahora con 3 asientos disponibles (1 menos)
```

### Paso 3: Reservar asiento diferente
```
1. Clic ruta
2. SeatSelectionScreen ahora muestra:
   - Asiento 2: GRIS (ocupado por primer pasajero)
   - Asientos 1,3,4: AZULES (disponibles)
3. Clic asiento "3"
4. Booking completo
```

### Paso 4: Verificar Ocupación
```
1. Back to ProfileScreen → cambiar a Conductor
2. Ir a TripStatusScreen manualmente (via Previous routes si existe)
   O: Navegar a la ruta desde SearchScreen
3. Verás:
   - Ocupación: 50% (2 de 4 asientos)
   - Asientos ocupados: 1,3 (grises)
   - Asientos disponibles: 2,4 (azules)
```

---

## 🎯 Checklist de Prueba Exitosa

- [ ] DriverRegisterScreen abre desde ProfileScreen
- [ ] Formulario tiene todas las secciones correctas
- [ ] Resumen dinámico muestra ingreso total
- [ ] Validación rechaza campos vacíos
- [ ] Error message específico para cada campo
- [ ] Botón "Publicar Ruta" deshabilitado durante carga
- [ ] Ruta aparece en BD después de publicar
- [ ] Ruta es visible en SearchScreen con datos correctos
- [ ] Pueden reservar asientos en la ruta
- [ ] available_seats disminuye correctamente
- [ ] Múltiples pasajeros ven asientos ocupados
- [ ] Datos del vehículo se guardan correctamente
- [ ] Times se formatean correctamente (YYYY-MM-DDTHH:MM:SS)
- [ ] Cancelar vuelve a ProfileScreen sin guardar

---

## 🚨 Problemas Comunes

**Problema: "Usuario no autenticado"**
- Solución: Asegúrate de estar loggeado

**Problema: Ruta no aparece en SearchScreen**
- Solución: Abre el console (F12) → Network → verifica error de Supabase
- Verifica que el BD tiene la ruta:
  ```sql
  SELECT * FROM routes LIMIT 5;
  ```

**Problema: Asientos todos grises (todos ocupados)**
- Solución: Verifica que available_seats > 0 en la BD
- Recrea ruta con más asientos

**Problema: Precio no guarda**
- Solución: Usa números sin símbolos ($)
- El app lo formatea automáticamente

---

## 📞 Debugging Commands (Supabase Console)

```sql
-- Ver todas las rutas
SELECT * FROM routes ORDER BY created_at DESC;

-- Ver rutas de un conductor
SELECT * FROM routes WHERE driver_id = 'YOUR_USER_ID';

-- Ver booking de una ruta
SELECT * FROM bookings WHERE route_id = 'ROUTE_ID';

-- Ver ocupación de una ruta
SELECT route_id, COUNT(*) as ocupados 
FROM bookings 
WHERE route_id = 'ROUTE_ID' AND booking_status = 'confirmed'
GROUP BY route_id;

-- Reset: Eliminar rutas de prueba
DELETE FROM routes WHERE driver_id = 'YOUR_USER_ID';
```

---

## 🎉 ¡Listo para Probar!

App corriendo en: **http://localhost:8082**

Sigue los pasos paso a paso y avísame si algo no funciona 🚀
