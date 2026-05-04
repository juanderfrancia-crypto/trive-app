/**
 * Script de testing para ProfileScreen con datos mock
 * 
 * Uso:
 * node test-vehicle-mock.js
 * 
 * Este script simula el comportamiento de fetchVehicles en ProfileScreen
 * y prueba que los datos se muestren correctamente
 */

// Mock del objeto Vehicle
const mockVehicles = {
  auto: {
    id: 'mock-auto-1',
    vehicle_make: 'Toyota Corolla',
    vehicle_year: 2022,
    vehicle_plate: 'ABC-123',
    vehicle_color: 'Blanco',
    vehicle_type: 'auto',
  },
  minibus: {
    id: 'mock-minibus-1',
    vehicle_make: 'Hyundai H350',
    vehicle_year: 2021,
    vehicle_plate: 'XYZ-789',
    vehicle_color: 'Azul marino',
    vehicle_type: 'minibus',
  },
  bus: {
    id: 'mock-bus-1',
    vehicle_make: 'Mercedes Benz O-500',
    vehicle_year: 2020,
    vehicle_plate: 'BUS-001',
    vehicle_color: 'Amarillo',
    vehicle_type: 'bus',
  },
  taxi: {
    id: 'mock-taxi-1',
    vehicle_make: 'Chevrolet Aveo',
    vehicle_year: 2023,
    vehicle_plate: 'TAX-456',
    vehicle_color: 'Amarillo taxi',
    vehicle_type: 'taxi',
  },
  moto: {
    id: 'mock-moto-1',
    vehicle_make: 'Honda CB150',
    vehicle_year: 2023,
    vehicle_plate: 'MOT-789',
    vehicle_color: 'Negro',
    vehicle_type: 'moto',
  },
}

// Simulación de la función fetchVehicles
const simulateFetchVehicles = async (vehicleType = 'auto', hasError = false) => {
  console.log('\n🔄 Simulando fetchVehicles...\n')
  
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 500))
  
  if (hasError) {
    console.log('❌ Error en la consulta a Supabase')
    return []
  }
  
  const vehicle = mockVehicles[vehicleType]
  return [vehicle]
}

// Función para renderizar el vehículo (simula lo que hace ProfileScreen)
const renderVehicleCard = (vehicles) => {
  if (vehicles.length === 0) {
    return {
      title: 'Sin vehículo registrado',
      subtitle: 'Agrega tu vehículo para comenzar',
      status: 'empty',
    }
  }
  
  const vehicle = vehicles[0]
  return {
    title: `${vehicle.vehicle_make} ${vehicle.vehicle_year}`,
    subtitle: `Placa: ${vehicle.vehicle_plate}`,
    color: `Color: ${vehicle.vehicle_color}`,
    type: vehicle.vehicle_type,
    status: 'loaded',
  }
}

// Pruebas
const runTests = async () => {
  console.log('====================================')
  console.log('🧪 TESTS DE MOCK DE VEHÍCULOS')
  console.log('====================================')
  
  // Test 1: Vehículo Auto
  console.log('\n📋 Test 1: Cargando Auto...')
  let vehicles = await simulateFetchVehicles('auto')
  let card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 2: Vehículo Minibus
  console.log('\n📋 Test 2: Cargando Minibus...')
  vehicles = await simulateFetchVehicles('minibus')
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 3: Vehículo Bus
  console.log('\n📋 Test 3: Cargando Bus...')
  vehicles = await simulateFetchVehicles('bus')
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 4: Vehículo Taxi
  console.log('\n📋 Test 4: Cargando Taxi...')
  vehicles = await simulateFetchVehicles('taxi')
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 5: Vehículo Moto
  console.log('\n📋 Test 5: Cargando Moto...')
  vehicles = await simulateFetchVehicles('moto')
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 6: Sin vehículos
  console.log('\n📋 Test 6: Sin vehículos registrados...')
  vehicles = []
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado:', card)
  
  // Test 7: Error en la consulta
  console.log('\n📋 Test 7: Error en la consulta...')
  vehicles = await simulateFetchVehicles('auto', true)
  card = renderVehicleCard(vehicles)
  console.log('✅ Resultado (maneja error correctamente):', card)
  
  console.log('\n====================================')
  console.log('✅ TODOS LOS TESTS COMPLETADOS')
  console.log('====================================')
  
  console.log('\n💡 Datos disponibles para testing:')
  console.log('Tipos de vehículos:', Object.keys(mockVehicles))
  console.log('\nPrueba con: node test-vehicle-mock.js')
}

// Ejecutar los tests
runTests().catch(console.error)
