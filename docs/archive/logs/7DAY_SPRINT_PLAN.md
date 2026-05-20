# 📋 PLAN DE ACCIÓN: 7 DÍAS A LANZAMIENTO

## SPRINT OVERVIEW

**Objetivo**: Pasar de 6.5/10 a 9/10 MVP score  
**Duración**: 7 días  
**Resultado**: App funcional para 500+ usuarios en beta  
**Estrategia**: Arreglar críticos → Agregar features → QA intenso

---

## DÍA 1: MIÉRCOLES - CRÍTICOS & SETUP

### Morning (4h)

#### TAREA 1: Arreglar Race Condition Asientos
**Responsable**: Backend 1  
**Prioridad**: 🔴 CRÍTICO  
**Archivos**: `useBookings.ts`, Database schema

**Paso a paso**:
1. En Supabase SQL Editor ejecutar:
```sql
-- Primero, ver si constraint ya existe
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'bookings' AND constraint_type = 'UNIQUE';

-- Si no existe, agregar:
ALTER TABLE bookings 
ADD CONSTRAINT unique_route_seat 
UNIQUE (route_id, seat_number) 
WHERE booking_status != 'cancelled';

-- Crear función para manejar error
CREATE OR REPLACE FUNCTION handle_booking_conflict()
RETURNS TABLE (error TEXT, booking_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Seat already booked'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql;
```

2. Actualizar `useBookings.ts` - Manejar error de conflicto:
```typescript
try {
  const { data, error } = await supabase
    .from('bookings')
    .insert([...])
  
  if (error?.code === '23505') { // Unique constraint violation
    throw new Error('This seat was just booked by another user')
  }
} catch (err) {
  // Toast error: "Asiento ya reservado, elige otro"
}
```

3. **Testing**: 
   - [ ] Simulador: 2 tabs abiertos
   - [ ] Mismo route ID + mismo seat number
   - [ ] Verificar que solo 1 se crea
   - [ ] Otro recibe error 409 Conflict

**Evidencia de completado**: Screenshot DB mostrando constraint, test case pasando

---

#### TAREA 2: Setup Base de Datos - Auto-updates

**Responsable**: Backend 2  
**Archivos**: Supabase console

**Paso a paso**:
1. En Supabase → Settings → Extensions
   - [ ] Habilitar `pg_cron`
   - [ ] Habilitar `http` (para webhooks después)

2. En SQL Editor copiar y ejecutar [BOOKING_STATUS_AUTO_UPDATE.sql](../BOOKING_STATUS_AUTO_UPDATE.sql)
   - Crea función `update_completed_bookings()`
   - Crea cron job que corre cada 5 minutos

3. **Verificar**:
```sql
-- Listar cron jobs
SELECT * FROM cron.job;

-- Output esperado: 1 job "update_completed_bookings"
```

**Evidencia**: Screenshot de `cron.job` table

---

### Afternoon (4h)

#### TAREA 3: Testing del Setup

**Responsable**: QA 1  
**Archivos**: Pruebas manuales en Staging

**Paso a paso**:
1. Crear ruta en staging con departure time en pasado (ej: April 5):
```
SELECT * FROM routes WHERE to_char(departure_time, 'YYYY-MM-DD') = '2026-04-05'
```

2. Crear booking con status 'confirmed' en esa ruta

3. Esperar 5 minutos (o forzar cron manualmente)

4. Verificar que status cambió a 'completed':
```sql
SELECT booking_id, booking_status, departure_time 
FROM bookings 
WHERE route_id = 'YOUR_ROUTE_ID';
```

5. En app, abrir TripHistory y verificar que aparece

**Check**: [ ] App muestra ruta pasada en historial

---

## DÍA 2: JUEVES - PAGOS & PREPARACIÓN

### Morning (4h)

#### TAREA 4: Implementar Sistema de Pagos (Elegir opción)

**OPCIÓN A: CASH (Recomendado para beta)** ⏱️ 4 HORAS

1. Modificar `BookingScreen.tsx` - UI Payment:
```typescript
// Línea ~80 (donde está el selector de pago)
<TouchableOpacity 
  style={[styles.paymentOption, selectedPayment === 'cash' && styles.selected]}
  onPress={() => setSelectedPayment('cash')}
>
  <Text>Pagar en Efectivo Al Conductor</Text>
  <Text style={styles.subtitle}>$ {totalPrice} - Efectivo</Text>
</TouchableOpacity>

// Remover / comentar Mercado Pago por ahora
{/* <TouchableOpacity onPress={handleMercadoPago}> ... </TouchableOpacity> */}
```

2. Agregar DB migration:
```sql
-- En Supabase SQL Editor
ALTER TABLE bookings 
ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';

ALTER TABLE bookings 
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
-- pending → verified (cuando conductor confirma)
```

3. Actualizar `useBookings.ts`:
```typescript
const createBooking = async (bookingData: any) => {
  return supabase.from('bookings').insert({
    ...bookingData,
    payment_method: 'cash',
    payment_status: 'pending' // Esperando confirmación conductor
  })
}
```

4. **Testing**: 
   - [ ] Crear booking
   - [ ] Verificar en DB: payment_method='cash', payment_status='pending'
   - [ ] Conductor ve booking con estado "Pendiente Pago"

---

**OPCIÓN B: MERCADO PAGO** ⏱️ 8 HORAS

1. Setup cuenta Mercado Pago:
   - Ir a [mp.me/dev](https://www.mercadolibre.com)
   - Crear app "Trive"
   - Copiar `ACCESS_TOKEN` y `PUBLIC_KEY`

2. Instalar SDK:
```bash
npm install @react-native-payment/mercado-pago-web
```

3. Crear `src/services/mercadoPago.ts`:
```typescript
import MercadoPago from '@react-native-payment/mercado-pago-web'

export const initMercadoPago = (publicKey: string) => {
  MercadoPago.setPublishableKey(publicKey)
}

export const createCheckout = async (bookingId: string, amount: number) => {
  const preference = {
    items: [{
      title: `Viaje Trive ${bookingId}`,
      quantity: 1,
      unit_price: amount,
    }],
    back_urls: {
      success: 'exp://your-app/booking/success',
      failure: 'exp://your-app/booking/failure',
    },
    notification_url: 'https://your-backend/webhook',
  }
  
  // Crear preference en backend
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(preference)
  })
  
  return response.json()
}
```

4. Integrar en `BookingScreen.tsx`:
```typescript
const handlePayment = async () => {
  const checkout = await createCheckout(bookingId, totalPrice)
  // Abrir MP checkout
}
```

5. Setup webhook para confirmar pago en backend

⚠️ **SOLO SI TIENES EXPERIENCIA CON PAGOS** - Considerar opción A

---

### Afternoon (4h)

#### TAREA 5: Documentar Sistema de Pagos

**Responsable**: Tech Lead  

1. Crear documento `PAYMENT_FLOW.md`:
   - Diagrama del flujo: User → Payment → Booking
   - Estados de transición (pending → verified → completed)
   - Qué hace el conductor cuando ve "pending payment"
   - Cómo se marca como pagado (cash) vs automático (MP)

2. Crear instrucciones para conductores:
   - "Al recoger pasajero, verifica el viaje en su sección 'Mis viajes'"
   - "Cobra $ amount"
   - "Presiona 'Marcar como pagado' en la app"

---

## DÍA 3: VIERNES - GPS & MAPAS

### Morning (4h)

#### TAREA 6: Integrar Google Maps

**Responsable**: Frontend 1  
**Archivos**: `src/components/RouteMap.tsx`, `SearchScreen.tsx`

**Paso a paso**:

1. Obtener Google Maps API Key:
   - Ir a Google Cloud Console
   - Crear nuevo proyecto "Trive"
   - Habilitar "Maps SDK for React Native"
   - Crear API Key
   - Guardar en `.env.local`: `GOOGLE_MAPS_API_KEY=xxx`

2. Instalar librería:
```bash
expo install react-native-maps @react-native-community/geolocation
```

3. Crear componente `src/components/RouteMap.tsx`:
```typescript
import MapView, { Marker, Polyline } from 'react-native-maps'

export const RouteMap = ({ originCoords, destinationCoords, route }: Props) => {
  const [region, setRegion] = useState({
    latitude: (originCoords.lat + destinationCoords.lat) / 2,
    longitude: (originCoords.lng + destinationCoords.lng) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })

  return (
    <MapView style={{ flex: 1 }} region={region}>
      {/* Marker origen */}
      <Marker
        coordinate={originCoords}
        title="Origen"
        pinColor="green"
      />
      
      {/* Marker destino */}
      <Marker
        coordinate={destinationCoords}
        title="Destino"
        pinColor="red"
      />
      
      {/* Línea ruta (si tienes coordenadas de la ruta) */}
      {route.waypoints && (
        <Polyline
          coordinates={route.waypoints}
          strokeColor="#007AFF"
          strokeWidth={3}
        />
      )}
    </MapView>
  )
}
```

4. Integrar en `SearchScreen.tsx` o nuevo screen `RouteDetailScreen.tsx`:
```typescript
<RouteMap 
  originCoords={route.origin_coords} 
  destinationCoords={route.destination_coords}
/>
```

5. **Alternativa rápida (si tienes prisa)**:
   - Embed Google Maps iframe HTML:
```typescript
const mapUrl = `https://maps.google.com/maps?q=${origin}+to+${destination}&output=embed`
// En WebView
<WebView source={{ uri: mapUrl }} />
```

**Testing**: 
- [ ] Mapa aparece
- [ ] Markers en origen y destino
- [ ] Zoom correcto

---

### Afternoon (4h)

#### TAREA 7: Data de Coordenadas

**Responsable**: Backend  

1. Verificar tabla `routes` tiene coordenadas:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'routes' 
AND column_name LIKE '%coord%' OR column_name LIKE '%lat%';
```

2. Si no existen, migracion:
```sql
ALTER TABLE routes ADD COLUMN origin_latitude FLOAT;
ALTER TABLE routes ADD COLUMN origin_longitude FLOAT;
ALTER TABLE routes ADD COLUMN destination_latitude FLOAT;
ALTER TABLE routes ADD COLUMN destination_longitude FLOAT;

-- Datos de ejemplo
UPDATE routes 
SET origin_latitude = 3.4372, origin_longitude = -76.5197 -- Cali
WHERE LOWER(origin) LIKE '%cali%';
```

3. Update queries en `useRoutes.ts` para traer coords:
```typescript
const data = await supabase
  .from('routes')
  .select(`
    ...,
    origin_latitude,
    origin_longitude,
    destination_latitude,
    destination_longitude
  `)
```

---

## DÍA 4: SÁBADO - QA INTENSO

### Full Day (8h)

#### TAREA 8: Testing End-to-End

**Responsable**: QA Lead  
**Testers**: Mínimo 3 personas

**Setup Testing**:
1. Crear 5 rutas de prueba en Staging
2. Asignar 5 testers en diferentes ciudades (o simular)
3. Todos tienen acceso a la app staging

**Casos de prueba (Ejecutar en orden)**:

```
TEST SUITE 1: AUTENTICACIÓN
[ ] Nuevo usuario puede registrarse
[ ] Login con email/OTP funciona
[ ] Logout real (limpia session)
[ ] Recuperar sesión después login

TEST SUITE 2: BÚSQUEDA & BOOKING
[ ] Search filtra por ciudad origen/destino
[ ] Solo rutas futuras aparecen (sin rutas pasadas)
[ ] Seleccionar asiento, cambiar asiento (cambio refleja en precio)
[ ] Booking se crea con status 'confirmed'
[ ] A los 5 min, status cambia a 'completed' (si es ruta pasada)

TEST SUITE 3: PAGOS (si implementaste)
[ ] Cash: Booking muestra "Pendiente pago efectivo"
[ ] MP: Flujo MP abre y vuelve correctamente
[ ] DB: payment_status se guarda

TEST SUITE 4: RATINGS
[ ] Después de viaje, botón "Calificar" disponible
[ ] Modal abre, permite 5 estrellas + comentario
[ ] Calificación se guarda en DB
[ ] Promedio del conductor actualiza
[ ] Ruta muestra "Calificado" ✓

TEST SUITE 5: HISTORIAL
[ ] TripHistory carga viajes completados
[ ] Viajes pasados + futuros separados
[ ] Click en viaje muestra detalles

TEST SUITE 6: RACE CONDITION
[ ] Tester A y B abren MISMO viaje, MISMO asiento
[ ] A lo reserva
[ ] B ve error: "Asiento ya fuá reservado"
[ ] DB: Solo 1 booking creado

TEST SUITE 7: MAPAS (si habilitaste)
[ ] RouteDetail muestra mapa
[ ] Markers en origen/destino
[ ] Zoom level correcto
```

**Reporte de bugs**:
- Formato: `[SEVERITY] Feature - Descripción`
- Ejemplos:
  - `[CRITICAL] Booking - Server error al crear bookings`
  - `[HIGH] Rating - Las estrellas se pueden clickear pero no guardan`
  - `[MEDIUM] UI - Toast messages no centra correctamente`

**Target**:
- 0 Critical bugs
- ≤ 2 High bugs
- ≤ 5 Medium bugs

---

## DÍA 5: DOMINGO - BUILD & DEPLOY

### Morning (4h)

#### TAREA 9: Build APK/IPA

**Responsable**: DevOps  

**Android APK**:
```bash
cd trive-app
expo build:android --type apk --release-channel staging
# Esperar ~20 min
# Download APK
# Enviar a testers: https://testers.appcenter.ms/...
```

**iOS IPA** (necesita Mac):
```bash
eas build --platform ios --profile staging
# Esperar ~30 min
# Setup TestFlight beta testing
```

**Nota**: Siesta necesaria después de build 😴

---

### Afternoon (4h)

#### TAREA 10: Deploy Backend (si hubo cambios)

**Responsable**: Backend Lead  

1. Listar cambios en Supabase:
```
- ✅ Constraint unique asientos
- ✅ Extension pg_cron
- ✅ Columns payment_method/status (si cash)
- ✅ Columns coordenadas (si mapas)
```

2. Crear SQL migration script consolidado:
```sql
-- migration-2026-04-11-staging.sql
-- Ejecutar en Supabase SQL Editor
-- [Todo lo anterior en un archivo]
```

3. Ejecutar en staging, verificar que no hay errores

---

## DÍA 6: LUNES - HOTFIXES & OPTIMIZACIÓN

### Full Day (8h)

#### TAREA 11: Arreglar Bugs Encontrados

**Responsable**: Engineers  

**Prioridad**:
1. 🔴 Critical: Fix en < 2 horas
2. 🟠 High: Fix en < 4 horas
3. 🟡 Medium: Fix después release (puede ser hotfix después)

**Ejemplo workflow**:
```
1. Tester reporta: "Toast cover el botón continuar"
2. Engineer encuentra código en TripHistoryScreen.tsx
3. Mueve Toast position de bottom a top
4. Re-run test
5. Test pasa ✅
6. Commit: "Fix: Move toast position to top"
```

---

#### TAREA 12: Performance Tuning

**Responsable**: Performance Engineer  

1. Profiler con React DevTools:
   - ¿Qué screens tienen lag?
   - ¿Renders innecesarios?

2. Optimizaciones típicas:
```typescript
// Usar memo para components que no debe re-render
export const RouteCard = memo(({ route }: Props) => {
  return <...>
})

// useMemo para queries costosas
const filteredRoutes = useMemo(() => {
  return routes.filter(r => r.destination === selectedDest)
}, [routes, selectedDest])

// Lazy load de imágenes
<Image 
  source={{ uri: photoUrl }}
  defaultSource={require('...')}
/>
```

3. Testing:
   - [ ] App abre en < 3 seg
   - [ ] SearchScreen pagina resultados (no todas a la vez)
   - [ ] Memory usage < 150MB

---

## DÍA 7: MARTES - LANZAMIENTO BETA

### Morning (2h)

#### TAREA 13: Crear Documentación para Beta Users

**Responsable**: Product Manager  

1. Crear `BETA_USER_GUIDE.md`:
   - Cómo bajar la app
   - Cómo registrarse
   - Step-by-step: Buscar viaje → Reservar → Calificar
   - "Problemas? Reporta en este formulario"

2. Crear formulario Google:
   - "¿Qué edad tienes?", "¿Cuántas veces viajas/mes?", "Problemas encontrados?"
   - Link en app (HelpScreen)

3. Setup WhatsApp broadcast:
   - Crear grupo "Trive Beta Testers"
   - Enviar: Guía + link descargar + link formulario

---

### Afternoon (2h)

#### TAREA 14: LAUNCH 🚀

**Responsable**: CEO / Product Lead  

**Checklist Pre-Launch**:
- [ ] DNS / certificates válidos
- [ ] Backend APIs respondiendo
- [ ] Database backups en AWS
- [ ] 24/7 Monitoring habilitado
- [ ] Runbook de incident response
- [ ] Contacto técnico 24/7 (teléfono/email)

**Acciones**:
1. Envian link de descargar a 50 beta testers
2. Monitoreando: servidor, crashes, errores API
3. Reporte diario de bugs

**Métricas a seguir**:
- Users activos / día
- Viajes completados / día
- Rating promedio
- Crash rate
- Payment success rate (si MP)

---

## 🎯 DEPENDENCIAS & RIESGOS

| Dependencia | Owner | Deadline | Risk |
|------------|-------|----------|------|
| Google Maps API Key | Frontend | Day 3 AM | Medium (puede tomar horas) |
| Mercado Pago Account | Backend | Day 2 | Low (si CASH omitir) |
| Testers disponibles | PM | Day 4 | High (necesita 3+ personas) |
| iOS Developer Account | DevOps | Day 5 | Low (si solo Android) |

---

## 📊 SUCCESS METRICS

**MVP Launchable si**:
- ✅ Cero critical bugs después de QA
- ✅ Race condition arreglada
- ✅ Pagos funcionan (cash o MP)
- ✅ Mapas muestran (aunque básico)
- ✅ Ratings se guardan
- ✅ 50+ beta users sin churn > 30%
- ✅ Server uptime 99.9%

**Red flags que retrasan**:
- 🚩 Race condition NO se arregla 
- 🚩 Más de 3 critical bugs post-QA
- 🚩 GPS/Mapas no funciona
- 🚩 Crash rate > 2%
- 🚩 Payment gateway rechaza transacciones

---

## 👥 ASIGNACIONES SUGERIDAS

```
BACKEND TEAM:
- Engineer 1: Race condition + testing
- Engineer 2: DB setup, payment flow, coordenadas

FRONTEND TEAM:
- Engineer 1: Google Maps integration
- Engineer 2: Payment UI updates, optimizaciones

QA TEAM:
- Lead: Test plan + tester coordination
- Tester 1-3: Ejecutar test suite

DEVOPS:
- Build APK/IPA, monitoring setup

PRODUCT:
- PM: Beta user recruitment, feedback collection
```

---

## 📅 TIMELINE VISUAL

```
MON  TUE  WED  THU  FRI  SAT  SUN  MON
     |    |    |    |    |    |    |
     S1   S2   S3   S4   S5   S6   LAUNCH
     
S1 = Sprint críticos (Race condition, pagos setup)
S2 = Pagos + documentación
S3 = GPS + mapas
S4 = QA intenso (50+ test cases)
S5 = Build + deploy + hotfixes
S6 = Performance + docs Beta
```

---

**Última actualización**: 7 de abril de 2026  
**Status**: 🟡 READY TO START  
**Next step**: Asignar team! 🚀
