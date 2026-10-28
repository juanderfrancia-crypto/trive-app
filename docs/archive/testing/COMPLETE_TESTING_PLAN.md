# 🧪 PLAN DE TESTING COMPLETO - SISTEMA DE BOOKING TRIVE

## ✅ OBJETIVOS DEL TESTING

- ✓ Crear ruta (Conductor)
- ✓ Publicar ruta correctamente
- ✓ Pasajero ve ruta disponible
- ✓ Pasajero reserva asientos (visualización de ocupados/vacíos)
- ✓ Pasajero completa la reserva sin congelaciones
- ✓ Conductor ve pasajeros confirmados
- ✓ Pasajero puede cancelar reserva
- ✓ Conductor puede iniciar viaje
- ✓ **CRÍTICO:** Sin congelaciones o bugs
- ✓ Testing con múltiples usuarios (mín. 3)

---

## 🎬 PARTE 1: PREPARACIÓN

### Paso 1.1: Crear 3 Cuentas de Prueba

**USUARIO 1: CONDUCTOR PRINCIPAL**
- Email: `conductor1@test.com`
- Contraseña: `Test1234!`
- Rol: Conductor
- Acción: Crear 2 rutas

**USUARIO 2: PASAJERO 1**
- Email: `pasajero1@test.com`
- Contraseña: `Test1234!`
- Rol: Pasajero
- Acción: Reservar asientos

**USUARIO 3: PASAJERO 2**
- Email: `pasajero2@test.com`
- Contraseña: `Test1234!`
- Rol: Pasajero
- Acción: Reservar asientos

---

## 🚗 PARTE 2: FLUJO CONDUCTOR - CREAR RUTA

### Paso 2.1: Login Conductor
1. Abre app con **USUARIO 1 (Conductor)**
2. Login con `conductor1@test.com` / `Test1234!`
3. **VERIFICAR:** Acceso correcto, sin errores

### Paso 2.2: Crear Primera Ruta
1. Navega a **"Panel del Conductor"**
2. Click **"+ Crear Viaje"**
3. Completa formulario:
   ```
   Origen: Bogotá
   Destino: Cali
   Fecha: Hoy + 2 horas (ej: 15:00)
   Hora: 15:00
   Total de asientos: 4
   Precio por asiento: $50,000
   Vehículo: Toyota Camry 2024 - Blanco
   Placa: ABC-1234
   ```
4. Click **"Crear Viaje"**
5. **VERIFICAR:**
   - ✅ Ruta aparece en lista
   - ✅ Status: "Scheduled"
   - ✅ 4 asientos disponibles mostrados
   - ✅ Sin errores en consola

### Paso 2.3: Crear Segunda Ruta
1. Click **"+ Crear Viaje"** nuevamente
2. Completa formulario:
   ```
   Origen: Bogotá
   Destino: Medellín
   Fecha: Hoy + 4 horas (ej: 17:00)
   Hora: 17:00
   Total de asientos: 3
   Precio por asiento: $45,000
   Vehículo: Toyota Camry 2024 - Blanco
   Placa: ABC-1234
   ```
3. Click **"Crear Viaje"**
4. **VERIFICAR:**
   - ✅ 2 rutas visibles en panel
   - ✅ Ambas con status correcto
   - ✅ Asientos correctos (4 y 3)

---

## 👤 PARTE 3: FLUJO PASAJERO 1 - RESERVAR ASIENTOS

### Paso 3.1: Login Pasajero 1
1. Logout del Conductor (Perfil → Logout)
2. Login con **USUARIO 2 (Pasajero 1)**
3. `pasajero1@test.com` / `Test1234!`
4. **VERIFICAR:** Rol es Pasajero, acceso correcto

### Paso 3.2: Ver Rutas Disponibles
1. Navega a **"Viajes Ahora"** o **"Rutas Disponibles"**
2. **VERIFICAR:**
   - ✅ Se ven ambas rutas creadas por conductor
   - ✅ Bogotá → Cali con 4 asientos disponibles
   - ✅ Bogotá → Medellín con 3 asientos disponibles
   - ✅ Precios correctos mostrados

### Paso 3.3: Seleccionar Primera Ruta (Bogotá → Cali)
1. Click en ruta **Bogotá → Cali**
2. **VERIFICAR:**
   - ✅ Pantalla de selección de asientos abre
   - ✅ Se ven 4 asientos numerados (1, 2, 3, 4)
   - ✅ Todos están verdes/disponibles
   - ✅ Sin congelaciones

### Paso 3.4: Reservar 2 Asientos
1. Click en **Asiento 1**
   - **VERIFICAR:** Asiento cambia de color (ej: verde → azul/seleccionado)
2. Click en **Asiento 2**
   - **VERIFICAR:** Asiento 2 también cambia de color
3. **TOTAL PANEL:** Debe mostrar "2 asientos seleccionados"
4. Click **"Continuar"** / **"Confirmar Reserva"**

### Paso 3.5: Completar Pago/Reserva
1. Llena datos si es necesario:
   - Punto de bajada (opcional)
2. Click **"Confirmar"**
3. **CRÍTICO - VERIFICAR:**
   - ✅ NO SE CONGELA en esta pantalla
   - ✅ Recibe confirmación de reserva
   - ✅ Muestra booking ID
   - ✅ Muestra total pagado: $100,000 (2 × $50,000)
   - ✅ Sin errores de RLS o base datos

### Paso 3.6: Verificar en Viajes Activos
1. Navega a **"Viajes Activos"**
2. **VERIFICAR:**
   - ✅ Aparece el viaje Bogotá → Cali
   - ✅ Muestra asientos reservados (1, 2)
   - ✅ Muestra conductor
   - ✅ Muestra precio total pagado

---

## 👤 PARTE 4: FLUJO PASAJERO 2 - VER CAMBIOS EN TIEMPO REAL

### Paso 4.1: Login Pasajero 2 (OTRA PESTAÑA/DISPOSITIVO)
1. Abre app en **USUARIO 3 (Pasajero 2)**
2. Login con `pasajero2@test.com` / `Test1234!`

### Paso 4.2: Ver Asientos Actualizados
1. Navega a **"Viajes Ahora"**
2. Click en ruta **Bogotá → Cali**
3. **CRÍTICO - ACTUALIZACIÓN EN TIEMPO REAL:**
   - ✅ Asiento 1: Rojo/Ocupado (reservado por Pasajero 1)
   - ✅ Asiento 2: Rojo/Ocupado (reservado por Pasajero 1)
   - ✅ Asiento 3: Verde/Disponible
   - ✅ Asiento 4: Verde/Disponible
   - ✅ Contador: "2 de 4 asientos ocupados"
   - **TIEMPO DE ACTUALIZACIÓN:** <5 segundos

### Paso 4.3: Reservar Asientos Diferentes
1. Click en **Asiento 3**
   - **VERIFICAR:** Se selecciona (cambio de color)
2. Click **"Continuar"** → **"Confirmar"**
3. **VERIFICAR:**
   - ✅ Reserva se confirma
   - ✅ Sin errores

### Paso 4.4: Volver a Ver Disponibilidad
1. Pasajero 1 navega a **"Viajes Ahora"** nuevamente
2. Click en ruta **Bogotá → Cali**
3. **VERIFICAR EN TIEMPO REAL:**
   - ✅ Asiento 3 ahora está ROJO/Ocupado
   - ✅ Solo Asiento 4 está disponible
   - ✅ Contador: "3 de 4 asientos ocupados"

---

## 🚗 PARTE 5: FLUJO CONDUCTOR - VER PASAJEROS

### Paso 5.1: Volver a Login Conductor
1. Logout de Pasajero
2. Login con **USUARIO 1 (Conductor)**

### Paso 5.2: Ver Pasajeros en Ruta
1. Navega a **"Panel del Conductor"**
2. Click en ruta **Bogotá → Cali**
3. **VERIFICAR:**
   - ✅ Muestra lista de pasajeros confirmados
   - ✅ Pasajero 1: Asientos 1, 2
   - ✅ Pasajero 2: Asiento 3
   - ✅ Total: 3 pasajeros, 3 asientos ocupados, 1 disponible
   - ✅ Nombres, teléfonos mostrados

### Paso 5.3: Verificar Ruta Secundaria
1. Click en ruta **Bogotá → Medellín**
2. **VERIFICAR:**
   - ✅ 0 pasajeros (nadie ha reservado)
   - ✅ 3 asientos disponibles
   - ✅ Status: Scheduled

---

## ❌ PARTE 6: PRUEBA DE CANCELACIÓN

### Paso 6.1: Pasajero Cancela Reserva
1. Login con **USUARIO 2 (Pasajero 1)**
2. Navega a **"Viajes Activos"**
3. Click en viaje **Bogotá → Cali**
4. Click botón **"Cancelar Viaje"**
5. Confirma cancelación
6. **VERIFICAR:**
   - ✅ Reserva desaparece de Viajes Activos
   - ✅ Mensaje de confirmación
   - ✅ Sin errores

### Paso 6.2: Verificar Asientos Liberados
1. Navega a **"Viajes Ahora"**
2. Click en ruta **Bogotá → Cali**
3. **VERIFICAR EN TIEMPO REAL:**
   - ✅ Asientos 1, 2 vuelven a VERDE/Disponibles
   - ✅ Contador: "1 de 4 asientos ocupados" (solo Pasajero 2)
   - ✅ Actualización rápida (<5 segundos)

### Paso 6.3: Conductor Ve Cambio
1. Login **USUARIO 1 (Conductor)**
2. Panel del Conductor → Ruta **Bogotá → Cali**
3. **VERIFICAR:**
   - ✅ Pasajero 1 desaparece de lista
   - ✅ Solo queda Pasajero 2 (Asiento 3)
   - ✅ 2 asientos disponibles nuevamente

---

## 🚀 PARTE 7: INICIAR VIAJE

### Paso 7.1: Conductor Inicia Viaje
1. Conductor en **"Panel del Conductor"**
2. Ruta **Bogotá → Cali**
3. Click botón **"Iniciar Viaje"** / **"Comenzar"**
4. **VERIFICAR:**
   - ✅ Status cambia a "In Progress"
   - ✅ Notificación enviada (check en logs)
   - ✅ Sin congelaciones

### Paso 7.2: Pasajero Ve Viaje Iniciado
1. Login **USUARIO 3 (Pasajero 2)**
2. **"Viajes Activos"**
3. **VERIFICAR:**
   - ✅ Viaje muestra status "En curso" / "In Progress"
   - ✅ Botón para ver ubicación en tiempo real
   - ✅ Sin errores

### Paso 7.3: Completar Viaje
1. Conductor: Click **"Completar Viaje"**
2. **VERIFICAR:**
   - ✅ Status: "Completed"
   - ✅ Desaparece de Viajes Activos
   - ✅ Aparece en historial

---

## 📊 PARTE 8: VERIFICACIÓN EN CONSOLA

Mientras realizas las pruebas, abre la **Consola de Expo** y verifica:

```
✅ Booking created successfully
✅ Available rides updated
✅ Realtime subscription triggered
✅ Notification sent
✅ Route status updated
```

**NO DEBE HABER:**
- ❌ RLS policy errors
- ❌ 500 errors
- ❌ Network errors
- ❌ Undefined references
- ❌ Congelaciones/freezes

---

## 🗑️ PARTE 9: TEST DE LLENADO COMPLETO

### Objetivo: Llenar todos los asientos

### Paso 9.1: Ruta Bogotá → Medellín (3 asientos)
1. **Usuario Pasajero 1:** Reserva Asiento 1
2. **Usuario Pasajero 2:** Reserva Asiento 2
3. Necesitamos **Usuario Pasajero 3** (crear cuenta):
   - Email: `pasajero3@test.com`
   - Contraseña: `Test1234!`
4. **Usuario Pasajero 3:** Reserva Asiento 3

### Paso 9.2: Verificar Estado Lleno
1. Navega a **"Viajes Ahora"**
2. Click en **Bogotá → Medellín**
3. **VERIFICAR:**
   - ✅ Todos 3 asientos: ROJO/Ocupados
   - ✅ Contador: "3 de 3 - LLENO"
   - ✅ Botón "Reservar" deshabilitado / No permite más reservas

### Paso 9.3: Conductor Ve Ruta Llena
1. Conductor: Panel → **Bogotá → Medellín**
2. **VERIFICAR:**
   - ✅ 3 pasajeros confirmados
   - ✅ 0 asientos disponibles
   - ✅ Puede iniciar viaje

---

## 📋 CHECKLIST FINAL

### Creación de Ruta ✅
- [ ] Conductor puede crear ruta
- [ ] Ruta aparece inmediatamente
- [ ] Asientos correctos (4, 3)
- [ ] Status: "Scheduled"
- [ ] Sin errores

### Visualización de Rutas ✅
- [ ] Pasajero ve ambas rutas
- [ ] Información correcta mostrada
- [ ] Precios correctos
- [ ] Sin retrasos

### Reserva de Asientos ✅
- [ ] Visualización clara: ocupados (rojo) vs disponibles (verde)
- [ ] Puede seleccionar múltiples asientos
- [ ] Contador de asientos funciona
- [ ] Botón Confirmar funciona
- [ ] **SIN CONGELACIONES**

### Actualización en Tiempo Real ✅
- [ ] Cuando Pasajero 1 reserva, Pasajero 2 ve cambios (<5 seg)
- [ ] Cuando Pasajero cancela, asientos se liberan
- [ ] Conductor ve cambios en tiempo real
- [ ] Consistencia entre usuarios

### Conductor ve Pasajeros ✅
- [ ] Lista de pasajeros correcta
- [ ] Asientos por pasajero correctos
- [ ] Información de contacto visible
- [ ] Se actualiza al cambiar reservas

### Cancelación ✅
- [ ] Pasajero puede cancelar
- [ ] Confirmación clara
- [ ] Asientos se liberan
- [ ] Otros ven cambios

### Iniciar Viaje ✅
- [ ] Status cambia a "In Progress"
- [ ] Pasajeros reciben notificación
- [ ] Sin errores
- [ ] Pasajeros ven cambio de status

### Rendimiento ✅
- [ ] **CERO congelaciones**
- [ ] Navegación fluida
- [ ] Transiciones rápidas
- [ ] Ningún timeout

### Errores ✅
- [ ] No hay errores RLS
- [ ] No hay 500 errors
- [ ] Consola limpia
- [ ] Logs informativos

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema: "Ruta no aparece en Viajes Ahora"
**Solución:**
- Verifica que `departure_time` sea en el futuro
- Verifica que `status = 'scheduled'`
- Intenta refresh manual (pull to refresh)

### Problema: "Asientos no se actualizan"
**Solución:**
- Cierra y reabre pantalla
- Espera 5 segundos (polling cada 3s)
- Verifica logs en consola para "Realtime" messages

### Problema: "Congelación al confirmar reserva"
**Solución:**
- Abre consola (DevTools)
- Busca errores de RLS o network
- Verifica que `booking_status = 'confirmed'` se crea en BD

### Problema: "Conductor no ve pasajeros"
**Solución:**
- Verifica que `booking_status = 'confirmed'` en BD
- Intenta refresh (pull to refresh)
- Verifica que route_id está correcto

---

## 📞 PRÓXIMOS PASOS SI TODO ESTÁ OK

Si todas las pruebas pasan ✅:

1. **Clean up**: Elimina datos de prueba de BD
2. **Verifica BD Production está configurada** (Supabase)
3. **Build APK/IPA**: 
   ```bash
   eas build -p android  # Google Play
   eas build -p ios      # App Store
   ```
4. **Upload a stores:**
   - Google Play Console
   - App Store Connect
5. **Beta testing** (TestFlight / Google Play Beta)
6. **Production release** 🚀
