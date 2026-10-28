# Mock de Vehículos para Testing

## 📋 Descripción

Archivos de datos mock para probar el sistema de vehículos en el ProfileScreen y DriverRegisterScreen.

## 📁 Archivos incluidos

### 1. **VEHICLE_MOCK_DATA.ts** (TypeScript)
Contiene objetos mock de vehículos listos para usar en el frontend.

**Exports:**
- `mockVehicles` - Objeto con todos los tipos de vehículos (auto, minibus, bus, taxi, moto)
- `mockSingleVehicle` - Array con 1 vehículo para testing
- `mockEmptyVehicles` - Array vacío para testing del estado "sin vehículos"
- `mockMultipleVehicles` - Array con varios vehículos
- `generateRandomVehicle()` - Función para generar vehículos aleatorios

**Uso en código:**
```typescript
import { mockSingleVehicle, mockVehicles } from '../pruebas/VEHICLE_MOCK_DATA'

// En un test o componente
const vehicles = mockSingleVehicle // [{ id: '...', vehicle_make: 'Toyota Corolla', ... }]
const randomVehicle = generateRandomVehicle()
```

### 2. **INSERT_MOCK_VEHICLES.sql** (SQL)
Script para insertar datos de prueba en Supabase.

**Pasos:**
1. Abre [Supabase SQL Editor](https://supabase.io)
2. Reemplaza `'driver-test-uuid-1'` con IDs reales de conductores
3. Copia y pega el contenido
4. Ejecuta

**Datos incluidos:**
- ✅ Auto: Toyota Corolla 2022, Placa ABC-123
- ✅ Minibus: Hyundai H350 2021, Placa XYZ-789
- ✅ Bus: Mercedes Benz O-500 2020, Placa BUS-001
- ✅ Taxi: Chevrolet Aveo 2023, Placa TAX-456
- ✅ Moto: Honda CB150 2023, Placa MOT-789

**Verificar datos:**
```sql
SELECT id, driver_id, vehicle_make, vehicle_plate, vehicle_type 
FROM routes 
WHERE vehicle_type IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

**Limpiar datos:**
```sql
DELETE FROM routes 
WHERE driver_id IN ('driver-test-uuid-1', 'driver-test-uuid-2', 'driver-test-uuid-3', 'driver-test-uuid-4', 'driver-test-uuid-5');
```

### 3. **test-vehicle-mock.js** (Node.js)
Script de testing que simula la función `fetchVehicles` sin necesidad de Supabase.

**Uso:**
```bash
node pruebas/test-vehicle-mock.js
```

**Pruebas incluidas:**
- ✅ Cargar Auto
- ✅ Cargar Minibus
- ✅ Cargar Bus
- ✅ Cargar Taxi
- ✅ Cargar Moto
- ✅ Sin vehículos (estado vacío)
- ✅ Manejo de errores

## 🎯 Casos de Testing

### Caso 1: Constructor con vehículo registrado
```typescript
const vehicles = mockSingleVehicle
// ProfileScreen mostrará:
// - Toyota Corolla 2022
// - Placa: ABC-123
// - Color: Blanco
```

### Caso 2: Constructor sin vehículo
```typescript
const vehicles = mockEmptyVehicles
// ProfileScreen mostrará:
// - Sin vehículo registrado
// - Agrega tu vehículo para comenzar
```

### Caso 3: Constructor con múltiples vehículos
```typescript
const vehicles = mockMultipleVehicles
// ProfileScreen mostrará el primero:
// - Toyota Corolla 2022
```

## 🚀 Cómo usar en ProfileScreen

El código el ProfileScreen ya implementa `fetchVehicles()` que:
1. Consulta la tabla `routes` en Supabase
2. Obtiene el primer vehículo del conductor
3. Muestra los datos en el ProfileScreen

Para testing local sin Supabase:

```typescript
// profileScreen.tsx - Testing
// import { mockSingleVehicle } from '../pruebas/VEHICLE_MOCK_DATA'

// Reemplaza este código:
// fetchVehicles()

// Con esto para testing:
// setVehicles(mockSingleVehicle)
```

## 📊 Estructura de datos Vehicle

```typescript
interface Vehicle {
  id: string              // ID único de la ruta en Supabase
  vehicle_make: string    // Ej: "Toyota Corolla"
  vehicle_year: number    // Ej: 2022
  vehicle_plate: string   // Ej: "ABC-123"
  vehicle_color: string   // Ej: "Blanco"
  vehicle_type: string    // 'auto' | 'minibus' | 'bus' | 'taxi' | 'moto'
}
```

## ✅ Validación

Los datos mock cumplen con:
- ✅ Tipos corrientes (auto, minibus, bus, taxi, moto)
- ✅ Valores realistas
- ✅ Compatibilidad con DriverRegisterScreen
- ✅ Compatibilidad con ProfileScreen
- ✅ Límites de asientos (4, 15, 80, 4, 2 respectivamente)

## 🔗 Archivos relacionados

- [src/screens/ProfileScreen.tsx](../../src/screens/ProfileScreen.tsx) - Consume estos datos
- [src/screens/DriverRegisterScreen.tsx](../../src/screens/DriverRegisterScreen.tsx) - Define los tipos de vehículos
- [src/services/supabase.ts](../../src/services/supabase.ts) - Cliente de Supabase

## 💡 Tips

1. **Para testing rápido**: Usa `test-vehicle-mock.js`
2. **Para testing en la app**: Usa `VEHICLE_MOCK_DATA.ts`
3. **Para testing en Supabase**: Usa `INSERT_MOCK_VEHICLES.sql`
4. **Para testing de errores**: Simula `hasError: true` en `test-vehicle-mock.js`

## 📝 Notas

- Los datos SQL deben ser ejecutados con conductores reales en tu BD
- El ProfileScreen obtiene Solo el PRIMER vehículo con `LIMIT 1`
- Los datos de mock pueden servir para testing unitario y E2E
- Limpia los datos de prueba después de terminar el testing en Supabase
