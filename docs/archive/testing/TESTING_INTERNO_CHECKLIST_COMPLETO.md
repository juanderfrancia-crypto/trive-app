# 🧪 GUÍA TESTING INTERNO - CHECKLIST COMPLETO

**Tiempo estimado:** 2-3 horas  
**Objetivo:** Verificar que TODO funciona antes del lanzamiento

---

## 📋 PRE-TESTING SETUP

### Dispositivos necesarios
```
✅ 1x iPhone (iOS) - Preferiblemente iPhone 12+
✅ 1x Android (Pixel, Samsung, etc.) - Android 11+
✅ 2x dispositivos simulados (si no tienes físicos)
✅ Network:
   - Wifi (para testing general)
   - 4G (para testing en movimiento)
```

### Cuentas de prueba
```
Pasajero A (iPhone): 
  Email: passenger.a@test.local
  Pass: Test123456!
  Name: Test Passenger A

Pasajero B (iPhone o Android):
  Email: passenger.b@test.local
  Pass: Test123456!
  Name: Test Passenger B

Conductor A (Android):
  Email: driver.a@test.local
  Pass: Test123456!
  Name: Test Driver A

Conductor B (Android):
  Email: driver.b@test.local
  Pass: Test123456!
  Name: Test Driver B

Admin (para backend):
  Email: admin@test.local
  Pass: Test123456!
```

---

## 🔐 SECCIÓN 1: AUTENTICACIÓN (30 min)

### 1.1 Signup - Pasajero
```
Test: SignupScreen → Pasajero
Steps:
  1. Click "Crear Cuenta"
  2. Email: passenger.a@test.local
  3. Password: Test123456!
  4. Name: Test Passenger A
  5. Age: 25
  6. Country: [Tu país]
  7. Phone: +1-555-0001
  8. Terms: Aceptar
  9. Click "Crear Cuenta"

Expected:
  ✅ No errores
  ✅ Email verificación enviado (check email)
  ✅ Redirige a verificar email screen
  ✅ No se crea cuenta si email duplicado
  ✅ No se crea si password < 8 caracteres

Verificar en BD:
  SELECT * FROM profiles WHERE email = 'passenger.a@test.local'
  ✅ user_type = 'passenger'
  ✅ email_verified = false (hasta que verifiquen)
```

### 1.2 Email Verification
```
Test: Verificar email
Steps:
  1. Revisar email (passenger.a@test.local)
  2. Encontrar email de TRIVE
  3. Click link de verificación
  4. Debe abrir app y confirmar

Expected:
  ✅ Email se abre en app
  ✅ Muestra "Email verificado ✅"
  ✅ BD: email_verified = true
  ✅ Permite usar cuenta
```

### 1.3 Signup - Conductor
```
Test: SignupScreen → Conductor
Igual que 1.1 pero:
  - Nombre: Test Driver A
  - Email: driver.a@test.local
  - user_type será "driver"
  - Adicional: Agregar vehículo

Steps después:
  1. Verificar email (mismo proceso)
  2. Agregar vehículo:
     - Marca: Toyota
     - Modelo: Prius
     - Año: 2022
     - Patente: ABC123
     - Capacidad: 4 asientos
  3. Agregar licencia:
     - Subir foto DNI
     - Subir licencia de conducir
     - Verificación (automática o manual)
```

### 1.4 Login
```
Test: LoginScreen
Account: passenger.a@test.local / Test123456!

Cases:
  ✅ Login exitoso
  ✅ Password incorrecto → Error message
  ✅ Email no existe → Error message
  ✅ Email no verificado → Puede no login
  ✅ 5 intentos fallidos → Account lock (30 min)
  ✅ Remember me funciona
  ✅ Logout limpia token

BD check:
  SELECT * FROM sessions
  ✅ Token creado después de login
  ✅ Token deletado después de logout
```

### 1.5 Recuperación de Contraseña
```
Test: Forgot Password screen
Steps:
  1. Click "Forgot Password"
  2. Email: passenger.a@test.local
  3. Click "Enviar"
  4. Revisar email
  5. Click link de reset
  6. Nueva password: NewPass123456!

Expected:
  ✅ Email recibido en 5 segundos
  ✅ Link funciona (no expirado)
  ✅ Password actualizada en BD
  ✅ Puede login con nueva password
  ✅ Sesión anterior cierra
```

---

## 👤 SECCIÓN 2: PERFIL Y CONFIGURACIÓN (30 min)

### 2.1 Editar Perfil
```
Test: ProfileScreen (passenger)
Current: Test Passenger A
Update:
  - Nombre: Updated Passenger A
  - Foto: Subir imagen
  - Teléfono: +1-555-0002
  - Documento: Subir DNI
  - Dirección: Calle Falsa 123

Expected:
  ✅ Campos son editables
  ✅ Foto se carga en < 5 segundos
  ✅ Validación de documento (formato válido)
  ✅ Cambios guardados en BD
  ✅ Cambios visibles inmediatamente

Verificar:
  SELECT * FROM profiles WHERE email = 'passenger.a@test.local'
  ✅ Datos actualizados
```

### 2.2 Cambiar Email
```
Test: ProfileScreen → Change Email
Current: passenger.a@test.local
New: passenger.a.new@test.local

Steps:
  1. Click "Change Email"
  2. Entrar new email
  3. Confirmar contraseña
  4. Click "Change"
  5. Verificar nuevo email (recibirá link)
  6. Click link

Expected:
  ✅ Verificación email enviada
  ✅ Viejo email sigue accediendo (hasta verificar)
  ✅ Después de verificar: nuevo email activo
  ✅ Viejo email no accede
```

### 2.3 Privacidad y Permisos
```
Test: SettingsScreen → Privacy
Cases:
  ✅ Location sharing ON/OFF
  ✅ Data sharing ON/OFF
  ✅ Marketing emails ON/OFF
  ✅ Push notifications ON/OFF
  ✅ Cambios guardan inmediatamente
  ✅ Si OFF location, app no puede ver ubicación
```

### 2.4 Tema y Idioma
```
Test: SettingsScreen → Appearance
Cases:
  ✅ Light/Dark mode toggle
  ✅ Cambia tema app inmediatamente
  ✅ Se guarda (persiste después de restart)
  ✅ Idioma: Español, English, Português
  ✅ Todos los texts traducidos
```

---

## 🗺️ SECCIÓN 3: BÚSQUEDA Y VISTA DE RUTAS (45 min)

### 3.1 Crear Ruta (Conductor)
```
Test: CreateRouteScreen (driver.a)
Data:
  - Origen: Calle Principal 100
  - Destino: Calle Secundaria 200
  - Fecha: Mañana
  - Hora: 08:00 AM
  - Asientos: 4
  - Precio: $20 por asiento
  - Vehicle: [Tu vehículo creado]

Steps:
  1. Click "New Route"
  2. Llenar datos
  3. Click "Publish"

Expected:
  ✅ Mapa muestra origen y destino
  ✅ Ruta calculada correctamente
  ✅ Sin errores de validación
  ✅ Aparece en BD: routes table
  ✅ Status: 'active'

BD check:
  SELECT * FROM routes WHERE driver_id = 'driver.a'
  ✅ route_status = 'active'
  ✅ available_seats = 4
  ✅ departure_time = [fecha/hora correcta]
```

### 3.2 Buscar Ruta (Pasajero)
```
Test: SearchScreen (passenger.a)
Steps:
  1. Click "Buscar Viaje"
  2. Origen: Calle Principal [cualquier punto cerca]
  3. Destino: Calle Secundaria [cualquier punto cerca]
  4. Fecha: Mañana
  5. Click "Buscar"

Expected:
  ✅ Resultados cargan en < 3 segundos
  ✅ Muestra 1+ rutas
  ✅ Ruta de driver.a aparece
  ✅ Información visible:
     - Conductor, foto, calificación
     - Hora, precio, asientos disponibles
     - Opiniones

Cases a probar:
  ✅ Sin resultados (fecha/lugar sin rutas)
  ✅ Múltiples resultados (ordenadas por precio)
  ✅ Filtros por precio/hora funcionan
  ✅ Click en ruta abre detalles
```

### 3.3 Detalles de Ruta
```
Test: RouteDetailScreen (ver ruta)
Información visible:
  ✅ Mapa con ruta
  ✅ Paradas exactas (origen, destino, paradas intermedias)
  ✅ Perfil del conductor (foto, nombre, calificación)
  ✅ Vehículo (foto, modelo, año, patente)
  ✅ Horario de salida
  ✅ Precio por asiento
  ✅ Asientos disponibles
  ✅ Opiniones pasajeros
  ✅ Botón "Reservar"

Cases:
  ✅ Si 0 asientos: Botón gris "Completo"
  ✅ Si >0 asientos: Botón azul "Reservar"
  ✅ No se puede reservar propia ruta
  ✅ No se puede reservar 2 viajes mismo horario
```

---

## 💳 SECCIÓN 4: RESERVA Y PAGOS (1 hora)

### 4.1 Realizar Reserva (Sin Pago)
```
Test: BookingScreen (passenger.a reserva driver.a ruta)
Steps:
  1. Ver detalles ruta
  2. Click "Reservar"
  3. Seleccionar asientos (ej: 2)
  4. Seleccionar pickup point (si hay)
  5. Seleccionar dropoff point (si hay)
  6. Notas (opcional): "Llevar equipaje"
  7. Click "Continuar"

Expected:
  ✅ Muestra resumen:
     - 2 asientos x $20 = $40
     - Comisión plataforma: $6
     - Total: $46
  ✅ Opciones de pago visibles
  ✅ Sin errores

BD check:
  SELECT * FROM bookings WHERE passenger_id = 'passenger.a'
  ✅ booking_status = 'pending'
  ✅ seats_reserved = 2
  ✅ total_price = 46
```

### 4.2 Pagar con Tarjeta (Stripe Test)
```
Test: Payment screen con Stripe
Steps:
  1. En resumen, click "Pagar con tarjeta"
  2. Formulario:
     - Card: 4242 4242 4242 4242
     - Exp: 12/25
     - CVV: 123
     - Name: Test Passenger
  3. Click "Pagar $46"

Expected:
  ✅ Carga durante 2-3 segundos
  ✅ Pago exitoso
  ✅ Muestra "✅ Reserva confirmada"
  ✅ Email confirmación recibido

BD checks:
  SELECT * FROM bookings
  ✅ booking_status = 'confirmed'
  ✅ payment_method = 'card'
  ✅ payment_status = 'completed'

  SELECT * FROM routes
  ✅ available_seats = 2 (era 4, ahora 2)
```

### 4.3 Pruebas de Tarjeta (Stripe)
```
Caso: Tarjeta rechazada
Card: 4000 0000 0000 0002
Expected:
  ✅ Error visible
  ✅ No se cobra dinero
  ✅ Booking sigue pendiente
  ✅ Puede reintentar

Caso: Tarjeta expirada
Card: 4000 0000 0000 0069
Expected:
  ✅ Error "Tarjeta expirada"

Caso: CVV incorrecto
Card: 4242 4242 4242 4242
CVV: 999 (en vez de 123)
Expected:
  ✅ Error "CVV incorrecto"
```

### 4.4 Pagar con Billetera (Si implementado)
```
Test: Wallet payment
Precondición: Pasajero tiene $50 en billetera

Steps:
  1. En pago, seleccionar "Billetera"
  2. Click "Pagar $46"

Expected:
  ✅ Pago exitoso
  ✅ Billetera ahora: $50 - $46 = $4
  ✅ Email confirmación recibido
  ✅ Booking confirmado
```

---

## ✈️ SECCIÓN 5: FLUJO DE VIAJE (1 hora)

### 5.1 Pasajero Ve Reserva en Dashboard
```
Test: ScheduledTripsScreen (passenger.a)
Expected:
  ✅ Muestra viaje confirmado
  ✅ Status: "Confirmado"
  ✅ Hora de salida
  ✅ Conductor
  ✅ Botón "Ver en mapa"
  ✅ Botón "Cancelar viaje"
  ✅ Botón "Chat con conductor"
```

### 5.2 Conductor Acepta Pasajero (Si hay confirmación)
```
Test: AvailableRidesScreen (driver.a)
Expected:
  ✅ Muestra pasajeros pendientes
  ✅ Nombre, foto, calificación
  ✅ Botón "Aceptar"
  ✅ Botón "Rechazar"
  ✅ Click "Aceptar" → Status: "Aceptado"
  ✅ Pasajero notificado (push + email)

BD:
  ✅ booking_status = 'accepted'
```

### 5.3 Chat en Vivo
```
Test: ChatScreen (passenger <-> driver)
Steps:
  1. Pasajero: Click "Chat con conductor"
  2. Escribir: "Hola, llego en 5 min"
  3. Click enviar

Expected:
  ✅ Mensaje aparece instantáneamente (pasajero)
  ✅ Conductor recibe notificación push
  ✅ Conductor ve mensaje (en tiempo real)
  ✅ Conductor responde: "Perfecto!"
  ✅ Pasajero recibe notificación
  ✅ Historial de mensajes guardado
  ✅ Mensajes persisten después de cerrar chat

BD:
  SELECT * FROM messages WHERE conversation_id = 'xxx'
  ✅ Ambos mensajes ahí
  ✅ Timestamps correctos
```

### 5.4 Tracking de Ubicación
```
Test: Map tracking durante viaje
Steps:
  1. Pasajero abre viaje en mapa
  2. Conductor inicia viaje (marca como "En ruta")
  3. Ubicación del conductor se actualiza

Expected (cada 5-10 seg):
  ✅ Pin del conductor se mueve
  ✅ Distancia y ETA se actualizan
  ✅ Sin saltos/errores en ubicación
  ✅ Funcionan en 4G y Wifi

⚠️ Si location permissions OFF:
  ✅ Muestra error
  ✅ Pide activar permisos
```

### 5.5 Llegada al Destino
```
Test: Finalizar viaje (conductor)
Steps:
  1. Conductor llega al destino
  2. Click "Finalizar viaje"
  3. Sistema marca como completado

Expected:
  ✅ Booking status: "completed"
  ✅ Pasajero recibe notificación
  ✅ Chat se cierra/archiva
  ✅ Ambos ven pantalla de calificación

BD:
  ✅ booking.completed_at = [ahora]
```

---

## ⭐ SECCIÓN 6: CALIFICACIONES Y RESEÑAS (30 min)

### 6.1 Pasajero Califica Conductor
```
Test: RatingScreen (después de viaje)
Steps:
  1. Viaje completado
  2. Aparecer pantalla de calificación
  3. Click 5 estrellas (conductor excelente)
  4. Escribir reseña: "Excelente servicio, muy seguro"
  5. Click "Enviar"

Expected:
  ✅ Rating guardada en BD
  ✅ Reseña visible en perfil del conductor
  ✅ Conductor recibe notificación
  ✅ No se puede calificar 2x mismo viaje
  ✅ Calificación afecta promedio (4.5 → 4.6)

BD check:
  SELECT AVG(rating) FROM reviews WHERE driver_id = 'driver.a'
  ✅ Promedio actualizado
```

### 6.2 Conductor Califica Pasajero
```
Test: RatingScreen (conductor califica pasajero)
Similar a 6.1 pero:
  - Conductor ve pantalla después de viaje
  - Califica al pasajero

Expected:
  ✅ Misma lógica
  ✅ Pasajero ve calificación en perfil
  ✅ Afecta calificación del pasajero
```

### 6.3 Reseñas Visibles
```
Test: ProfileScreen (ver reseñas)
Steps:
  1. Ver perfil de conductor (passenger.a)
  2. Scroll a "Reseñas"

Expected:
  ✅ Muestra última reseña
  ✅ Nombre del reseñador
  ✅ Stars y texto
  ✅ Fecha relativa ("hace 2 horas")
  ✅ Conducta: "Excelente servicio, muy seguro"
```

---

## ❌ SECCIÓN 7: CANCELACIONES (30 min)

### 7.1 Pasajero Cancela (>2 horas)
```
Test: Cancelación con reembolso completo
Ruta: Mañana 10:00 AM (ahora son las 7:00 AM)
Steps:
  1. En ScheduledTripsScreen
  2. Click viaje
  3. Click "Cancelar viaje"
  4. Confirmar

Expected:
  ✅ Estado: "Cancelado"
  ✅ Reembolso: 100%
  ✅ BD: booking_status = 'cancelled'
  ✅ BD: refund_amount = 46
  ✅ BD: refund_status = 'pending'
  ✅ Email confirmación enviado
  ✅ Asiento liberado (available_seats +1)

Stripe check (3-5 días):
  ✅ Reembolso debería aparecer en historial
```

### 7.2 Pasajero Cancela (<1 hora)
```
Test: Cancelación sin reembolso
Ruta: Hoy 11:00 AM (ahora son las 10:15 AM)
Steps:
  1. Click "Cancelar viaje"
  2. Confirmar

Expected:
  ✅ Estado: "Cancelado"
  ✅ Reembolso: $0
  ✅ Dinero pierde
  ✅ Email: "Cancelación sin reembolso"
  ✅ Asiento liberado
```

### 7.3 Conductor Cancela
```
Test: Cancelación por conductor
Steps:
  1. Como driver.a, click viaje
  2. Click "Cancelar ruta"
  3. Motivo: "Problema mecánico"
  4. Confirmar

Expected:
  ✅ Ruta status: 'cancelled'
  ✅ Todos los pasajeros notificados (push + email)
  ✅ Todos reciben 100% reembolso
  ✅ Todos reciben $5 crédito bonus
  ✅ Conductor recibe 0% ingresos
  ✅ -0.5 estrellas a conductor (si no excepción)
```

### 7.4 No-show Pasajero
```
Test: Pasajero no se presenta
Ruta: Hoy 08:00 AM
Steps:
  1. Hora de salida: 08:00
  2. Pasajero no entra a auto
  3. Conductor marca: "No se presentó"
  4. Click "Confirmar"

Expected:
  ✅ Booking: 'no_show'
  ✅ Pasajero: $0 reembolso
  ✅ Pasajero: Ban por 3 días (no puede reservar)
  ✅ Email: "No se presentó - ban 3 días"
  ✅ Conductor: recibe pago por ese asiento
```

---

## 🛡️ SECCIÓN 8: SEGURIDAD Y PRIVACIDAD (30 min)

### 8.1 RLS Policies (Row-Level Security)
```
Test: Un usuario NO puede ver datos de otro

Scenario:
  - Pasajero A intenta acceder datos de Pasajero B
  - Via API: SELECT * FROM bookings WHERE user_id = 'passenger.b'

Expected:
  ✅ Error 403: Permission denied
  ✅ No ve datos
  ✅ Intento registrado en logs

Test:
  - Director verifica en Supabase
  - RLS policies activas: ✅
  - 15 policies en 5 tablas
```

### 8.2 Sensibilidad Ubicación
```
Test: Location sharing OFF
Steps:
  1. Settings → Privacy → Location ON
  2. Viaje funciona, conductor se ve
  3. Settings → Location OFF
  4. Viaje nuevo: conductor NO se ve
  5. Chat aún funciona

Expected:
  ✅ Ubicación no compartida
  ✅ Otros datos intactos
  ✅ Cambios instantáneos
```

### 8.3 Contraseña Encriptada
```
BD Check:
  SELECT password_hash FROM auth.users
  ✅ NO es contraseña en texto plano
  ✅ Es hash bcrypt (comienza con $2a$)
```

### 8.4 Sesiones Seguras
```
Test: Token válido solo para usuario
Steps:
  1. Login passenger.a
  2. Obtener token
  3. Modificar token (última letra)
  4. Usar token modificado

Expected:
  ✅ Error 401: Invalid token
  ✅ Requiere relogin
```

---

## 📊 SECCIÓN 9: PERFORMANCE Y ESTABILIDAD (20 min)

### 9.1 Carga de Pantallas
```
Medir con: React DevTools Profiler

Pantalla: Inicial load
Target: < 2 segundos

Cases:
  ✅ LoginScreen: < 500ms
  ✅ SearchScreen: < 1s
  ✅ ScheduledTripsScreen: < 1s
  ✅ ProfileScreen: < 800ms
```

### 9.2 Chat En Vivo
```
Medir: Latencia de mensaje

Steps:
  1. Enviar mensaje desde phone A
  2. Medir cuánto tarda en phone B
  3. Repetir 10 veces

Target: < 2 segundos (promedio)

Expected:
  ✅ Mayoría < 500ms
  ✅ Máximo 2 segundos
```

### 9.3 Búsqueda de Rutas
```
Test: Búsqueda con 100+ rutas disponibles
Target: < 3 segundos

Expected:
  ✅ Resultados cargan rápido
  ✅ Sin freezes/stutters
  ✅ Scroll suave
```

### 9.4 Memory Leaks
```
Test: App abierta 10 minutos, varias acciones
Monitor: Profiler → Memory

Expected:
  ✅ Memoria estable (no sube constantemente)
  ✅ Después de acciones: vuelve a normal
  ✅ Sin crashes por memory
```

### 9.5 Connectivity (Offline Mode)
```
Test: Desactivar internet
Steps:
  1. Abrir app
  2. Desactivar Wifi + 4G
  3. Click para acción (buscar)

Expected:
  ✅ Muestra error: "Sin conexión"
  ✅ Opción: "Reintentar"
  ✅ No se crashea
  ✅ Reactiva internet: automáticamente intenta

Cases:
  ✅ Cambio de conexión cada 5 segundos: Sin errores
  ✅ WiFi → 4G: Sin desconexiones visibles
```

---

## 🔔 SECCIÓN 10: NOTIFICACIONES (20 min)

### 10.1 Push Notifications
```
Test: Cuando hay nueva reserva (conductor)
Trigger: Pasajero B reserva ruta de Conductor A
Steps:
  1. Como driver.a, cerrar app completamente
  2. Como passenger.b, realizar reserva
  3. Esperar 5 segundos

Expected:
  ✅ Notification en lock screen
  ✅ Sonido/vibración (si ON)
  ✅ Click abre app
  ✅ Muestra pantalla de nuevas reservas

BD check:
  ✅ push_notifications_sent = 1 (en tabla de eventos)
```

### 10.2 Email Notifications
```
Test: Email de confirmación de reserva
Trigger: Realizar reserva
Expected (5-30 segundos):
  ✅ Email recibido en inbox (no spam)
  ✅ Contenido correcto:
     - ID reserva
     - Conductor
     - Hora
     - Precio
  ✅ Link a app funciona
  ✅ Firma con contacto
```

### 10.3 Notificación In-App
```
Test: Cuando conductor acepta
Trigger: Driver acepta booking de passenger
Steps:
  1. Como passenger, esperar aceptación
  2. Conductor acepta

Expected:
  ✅ Toast/alert aparece
  ✅ Mensaje: "Conductor aceptó tu viaje"
  ✅ Desaparece después de 5 segundos
  ✅ O click para ir a detalles
```

---

## 🐛 SECCIÓN 11: MANEJO DE ERRORES (20 min)

### 11.1 Error Display
```
Test: Errores muestran en UI
Scenarios:
  1. Servidor down: "No se puede conectar"
  2. Email inválido: "Email no válido"
  3. Password débil: "Password debe tener 8+ caracteres"
  4. Viaje duplicado: "Ya tienes reserva ese horario"

Expected:
  ✅ Error claro en español
  ✅ NO muestra código/stack trace
  ✅ Sugiere acción ("Reintentar", "Editar")
```

### 11.2 Sentry Reporting
```
Test: Crashes reportados a Sentry
Steps:
  1. Forzar error (en development, throw new Error)
  2. Debería registrarse en Sentry dashboard

Verificar en Sentry:
  https://sentry.io → Projects → TRIVE
  ✅ Error aparece
  ✅ Stack trace visible
  ✅ Device info correcto
  ✅ User info (sin datos sensibles)
```

### 11.3 Graceful Degradation
```
Test: App sigue funcionando con errores menores
Scenario: Stripe no disponible
Expected:
  ✅ Pago no disponible
  ✅ Resto de app funciona
  ✅ Mensaje: "Pagos no disponibles ahora, intenta después"
  ✅ No crash
```

---

## ✅ FINAL CHECKLIST

```
AUTH & PROFILE (30 min)
  ✅ Signup pasajero
  ✅ Signup conductor
  ✅ Email verification
  ✅ Login/Logout
  ✅ Password reset
  ✅ Edit profile
  ✅ Change email
  ✅ Settings & privacy

ROUTES & SEARCH (45 min)
  ✅ Create route
  ✅ Search routes
  ✅ View details
  ✅ Filter by price/time
  ✅ Múltiples resultados

BOOKING & PAYMENT (1 hora)
  ✅ Reserve seats
  ✅ Payment form
  ✅ Stripe test cards
  ✅ Successful payment
  ✅ Failed payment
  ✅ Wallet payment (si aplica)

TRIP FLOW (1 hora)
  ✅ Dashboard view
  ✅ Accept/reject
  ✅ Live chat
  ✅ Location tracking
  ✅ Complete trip

RATINGS (30 min)
  ✅ Rate passenger
  ✅ Rate driver
  ✅ Write review
  ✅ Reviews visible

CANCELLATIONS (30 min)
  ✅ Cancel with refund
  ✅ Cancel without refund
  ✅ Driver cancels
  ✅ No-show ban

SECURITY (30 min)
  ✅ RLS policies
  ✅ Location privacy
  ✅ Encrypted passwords
  ✅ Secure tokens

PERFORMANCE (20 min)
  ✅ Screen load times
  ✅ Chat latency
  ✅ Search performance
  ✅ Memory stability
  ✅ Offline handling

NOTIFICATIONS (20 min)
  ✅ Push notifications
  ✅ Email notifications
  ✅ In-app alerts

ERROR HANDLING (20 min)
  ✅ Error messages
  ✅ Sentry reporting
  ✅ Graceful degradation

TOTAL: ~6-7 horas
```

---

## 📝 REPORT FORMAT

Después de testing, llenar:

```markdown
# Testing Report - [Fecha]

## Environment
- iOS Version: 16.5
- Android Version: 13
- App Version: 1.0.0
- Network: Wifi + 4G tested

## Results
- Total tests: 50
- Passed: 48 ✅
- Failed: 2 ❌
- Blockers: 0

## Issues Found
1. Chat latency >2s sometimes (Minor)
   - Reproducible: 30% of sends
   - Impact: User experience
   - Fix: Optimize WebSocket

2. Memory grows after 30 min usage (Minor)
   - Reproducible: Always
   - Impact: Long sessions
   - Fix: Check for leaks

## Recommendations
- Fix chat latency before launch
- Test with 1000+ active users
- Monitor Sentry for crashes

## Sign-off
Tester: [Tu nombre]
Date: [Fecha]
Ready for launch: YES / NO
```

---

**Fin de Testing. Listo para lanzar cuando pasen todos los tests.** 🎉
