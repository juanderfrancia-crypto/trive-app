# 🚗 Guía de Integración GPS - Animación de Viajes

## 📋 Descripción General

La animación del card de balance ahora puede mostrar tu progreso de viaje en **tiempo real** basado en la geolocalización del celular. 

### Dos Modos de Funcionamiento

**Modo 1: Viaje Activo (Con GPS Real)**
- Muestra un progreso lineal (0-100%)
- El carro se mueve según tu ubicación actual
- Texto dinámico: "Estamos en [Ubicación]..." / "¡Llegamos a [Destino]!"
- Se activa cuando hay viaje seleccionado en el reserva

**Modo 2: Demo (Sin Viaje Activo)**
- Animación alternada entre:
  - Carro moviéndose diagonalmente
  - Mapa con puntos simulados apareciend/desapareciendo
- Ciclo cada 6 segundos
- Solo UX, no GPS real

---

## 🔧 Configuración Requerida

### 1. **Android (AndroidManifest.xml)**

En `android/app/src/main/AndroidManifest.xml`, agregar estos permisos:

```xml
<!-- Permisos de Ubicación -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

En `app.json` (Expo), agregar:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Trive to access your location."
        }
      ]
    ],
    "permissions": [
      "LOCATION"
    ]
  }
}
```

### 2. **iOS (Info.plist)**

En `ios/Trive/Info.plist`, agregar:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Trive necesita tu ubicación para mostrar el progreso del viaje.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Trive usa tu ubicación para mejorar tu experiencia.</string>
```

---

## 📍 Cómo Funciona

### Flow del Sistema

```
1. Usuario selecciona ruta para reservar
   ↓
2. HomeScreen obtiene:
   - selectedRoute (del AppStore)
   - userLocation (GPS del celular cada 5 seg)
   ↓
3. Sistema calcula:
   - distancia desde origen → destino
   - porcentaje de progreso (0-100%)
   - ubicación más cercana (nombre de ciudad)
   ↓
4. Renderiza animación:
   - Línea de progreso (progresa en tiempo real)
   - Carro sigue la línea según %
   - Texto: "Estamos en [Jardin Plaza] (45%)"
   ↓
5. Actualiza cada 5 segundos
```

### Ubicaciones Soportadas

El sistema reconoce estas ciudades/puntos:

```
CALI Y ALREDEDORES:
- Centro Cali (3.4372, -76.5197)
- Jardín Plaza (3.3910, -76.5145)
- Norte Cali (3.4200, -76.5500)
- Sur Cali (3.3500, -76.5000)

RUTA CALI → PUERTO TEJADA:
- Buenaventura (3.3850, -76.4500)
- Puerto Tejada (3.3200, -76.2500)
- Palmira (3.3500, -76.3500)

RUTA CALI → ARMENIA:
- Armenia (3.5000, -76.0000)
- Cartago (3.4500, -76.2500)
```

Para agregar más ubicaciones, edita `src/utils/tripProgress.ts`:

```typescript
const KNOWN_LOCATIONS: LocationPoint[] = [
  // ... existentes ...
  { latitude: 3.5000, longitude: -76.1000, name: 'Tu Nueva Ciudad' },
]
```

---

## 🧪 Testing

### Escenario 1: Simular Sin GPS Real

1. Abre la app en desarrollo
2. La animación mostrará **Modo Demo** (carro diagonal + puntos)
3. Esto es normal si el GPS no está disponible o permiso negado

### Escenario 2: Activar Geolocalización

**Android (Emulator)**:
```bash
# Darle permisos al app
adb shell pm grant com.trive.app android.permission.ACCESS_FINE_LOCATION

# Simular ubicación específica (Cali)
telnet localhost 5554
geo fix -76.5197 3.4372
exit
```

**iOS (Simulator)**:
1. Abre Simulator
2. Features → Location → Otras opciones
3. Selecciona "Frecuencia: Alto"
4. Ingresa: Latitud 3.4372, Longitud -76.5197

### Escenario 3: Test Completo de Viaje

1. En app, selecciona una ruta de:
   - Cali → Puerto Tejada (120km)
   - Cali → Armenia (200km)
   
2. Cierra y abre HomeScreen

3. Deberías ver:
   - ✅ Línea de progreso (horizontal)
   - ✅ Puntos verde (origen) y rojo (destino)
   - ✅ Carro animado moveéndose en la línea
   - ✅ Porcentaje en tiempo real (0-100%)
   - ✅ Texto: "Estamos en Jardín Plaza (0%)"

4. Simula movimiento del GPS hacia destino:
   ```bash
   # Primer punto (0%)
   geo fix -76.5197 3.4372
   
   # Esperar 5 seg...
   
   # Segundo punto (50%)
   geo fix -76.3850 3.3850
   
   # Esperar 5 seg...
   
   # Tercer punto (100%)
   geo fix -76.2500 3.3200
   # Verás: "¡Llegamos a Puerto Tejada! 🎉"
   ```

---

## 💾 Datos Requieridos en DB

### Route Table - Campos esperados

```sql
SELECT 
  id,
  origin,          -- "Jardín Plaza" o "Cali"
  destination,     -- "Puerto Tejada"
  departure_time,
  arrival_time
FROM routes;
```

**Importante**: Los nombres de origen/destino deben coincidir con `KNOWN_LOCATIONS` en `tripProgress.ts`.

Si tus rutas tienen datos diferentes, actualiza los nombres o agrega nuevas locaciones.

---

## ⚙️ Personalización

### 1. Cambiar Intervalo de Actualización GPS

En `HomeScreen.tsx`:

```typescript
// Actual: cada 5 segundos
const { location: userLocation } = useUserLocation(5)

// Cambiar a 10 segundos (menos batería)
const { location: userLocation } = useUserLocation(10)
```

### 2. Cambiar Distancia para Detectar Llegada

En `tripProgress.ts`, función `calculateTripProgress()`:

```typescript
// Actual: < 1km
if (distanceToDestination < 1) {
  status = 'arrived'
}

// Cambiar a < 500m (más preciso)
if (distanceToDestination < 0.5) {
  status = 'arrived'
}
```

### 3. Cambiar Distancia de Localidad Cercana

En `tripProgress.ts`, función `getNearestLocation()`:

```typescript
// Actual: 5km
getNearestLocation(lat, lng, 5)

// Cambiar a 2km (más restringido)
getNearestLocation(lat, lng, 2)
```

### 4. Agregar Más Ciudades

En `tripProgress.ts`:

```typescript
const KNOWN_LOCATIONS: LocationPoint[] = [
  // Existentes...
  
  // Agregar nuevas
  { latitude: 3.600, longitude: -76.100, name: 'Nueva Ciudad' },
  { latitude: 3.200, longitude: -76.600, name: 'Otra Ciudad' },
]
```

---

## 🔍 Debugging

### Ver logs de ubicación

```typescript
// En HomeScreen.tsx, dentro del useEffect de tripProgress:

useEffect(() => {
  if (!selectedRoute || !userLocation) return
  
  console.log('🚗 USER LOCATION:', userLocation)
  console.log('📍 ROUTE:', selectedRoute.origin, '→', selectedRoute.destination)
  console.log('📊 PROGRESS:', tripProgress, '%')
  console.log('📌 STATUS:', locationStatus)
}, [userLocation, selectedRoute])
```

### Verificar Coordenadas

```bash
# En consola del dev tools
import { getCoordinatesFromLocationName } from './utils/tripProgress'

getCoordinatesFromLocationName('Cali')
// Output: { latitude: 3.4372, longitude: -76.5197, name: 'Centro Cali' }
```

---

## ⚠️ Limitaciones & Consideraciones

### 1. **Consumo de Batería**
- GPS activo cada 5 seg = ~3-5% batería/hora
- Recomendación: Mostrar warning si viaje > 4 horas

### 2. **Precisión del GPS**
- Exactitud típica: 5-15 metros
- En ciudades con edificios altos: 20-50 metros
- Rural: puede ser menos preciso

### 3. **Ubicaciones Predefinidas**
- Solo funciona con ciudades en KNOWN_LOCATIONS
- Si origen/destino no está en lista → Usa DEMO mode
- Solución: Mantener actualizada la base de ciudades

### 4. **Sin Cobertura**
- Si el GPS falla → Fallback a coordenadas demo (Cali)
- App continúa funcionando pero sin GPS real
- Usuario no ve diferencia

### 5. **Privacidad**
- Solicita permiso de ubicación al usuario
- Datos GPS se usan solo localmente (no se envían a servidor)
- Usuario puede denegar permiso

---

## 📱 Estado Actual

### ✅ Implementado
- Hook `useUserLocation` - obtiene GPS cada N seg
- Funciones en `tripProgress.ts` - calculan progreso
- HomeScreen actualizado - renderiza ambos modos
- Fallback a DEMO si GPS no disponible

### ⏳ Next Steps (Futura)
- [ ] Historial de ubicaciones para conductor
- [ ] Ruta en tiempo real en pantalla de conductor
- [ ] Notificaciones: "Usuario llegando en 5 min"
- [ ] Integración Google Maps Polyline (ruta visual)
- [ ] Soporte offline (cache de últimas coords)

---

## 📞 Troubleshooting

| Problema | Solución |
|----------|----------|
| No funciona GPS | Verifica permisos en settings del celular |
| Siempre muestra DEMO | Asegúrate que `selectedRoute` existe en AppStore |
| Ubicación siempre = Cali | Permisos denegados, usando fallback |
| Progreso no avanza | GPS no está actualizando, intenta cambiar ubicación manual |
| App se congela | Reduce frecuencia GPS: `useUserLocation(10)` en lugar de `5` |
| Texto ubicación no aparece | Ciudad no está en KNOWN_LOCATIONS, agrégala |

---

**Última actualización**: 12 de abril de 2026  
**Status**: ✅ Ready for Testing  
**Dependencia**: `@react-native-community/geolocation` (instalable con `npm install`)
