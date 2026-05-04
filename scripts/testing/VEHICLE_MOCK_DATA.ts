/**
 * Mock de datos de vehículos para testing
 * Estos datos pueden usarse para testing en el frontend
 */

export interface Vehicle {
  id: string
  vehicle_make: string
  vehicle_year: number
  vehicle_plate: string
  vehicle_color: string
  vehicle_type: 'auto' | 'minibus' | 'bus' | 'taxi' | 'moto'
}

// Mock de vehículos diferentes
export const mockVehicles: Record<string, Vehicle> = {
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
    vehicle_color: 'Azul',
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
    vehicle_color: 'Amarillo',
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

// Mock para testing - Sin vehículos registrados
export const mockEmptyVehicles: Vehicle[] = []

// Mock para testing - Un vehículo registrado
export const mockSingleVehicle: Vehicle[] = [mockVehicles.auto]

// Mock para testing - Múltiples vehículos (simulando que un conductor tiene varios)
export const mockMultipleVehicles: Vehicle[] = [
  mockVehicles.auto,
  mockVehicles.minibus,
  mockVehicles.taxi,
]

// Función para generar un vehículo aleatorio
export const generateRandomVehicle = (): Vehicle => {
  const types = Object.keys(mockVehicles) as Array<keyof typeof mockVehicles>
  const randomType = types[Math.floor(Math.random() * types.length)]
  return mockVehicles[randomType]
}

// SQL para insertar vehículos de prueba en Supabase
export const MOCK_VEHICLE_SQL = `
-- Insertar rutas con vehículos de prueba para conductores
-- Asumiendo que tienes usuarios con IDs específicos

-- Auto de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status
) VALUES (
  'YOUR_DRIVER_ID_HERE',
  'Cra 7 #45-89, Bogotá',
  'Bogotá',
  'Cra 50 #10-50, Medellín',
  'Medellín',
  '08:00:00',
  '12:00:00',
  4,
  4,
  45000,
  'Toyota Corolla',
  2022,
  'ABC-123',
  'Blanco',
  'auto',
  'active'
);

-- Minibus de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status
) VALUES (
  'YOUR_DRIVER_ID_HERE',
  'Terminal central, Bogotá',
  'Bogotá',
  'Centro, Cali',
  'Cali',
  '06:00:00',
  '14:00:00',
  15,
  15,
  50000,
  'Hyundai H350',
  2021,
  'XYZ-789',
  'Azul',
  'minibus',
  'active'
);

-- Bus de prueba
INSERT INTO routes (
  driver_id,
  departure_location,
  departure_city,
  arrival_location,
  arrival_city,
  departure_time,
  arrival_time,
  total_seats,
  available_seats,
  price_per_seat,
  vehicle_make,
  vehicle_year,
  vehicle_plate,
  vehicle_color,
  vehicle_type,
  status
) VALUES (
  'YOUR_DRIVER_ID_HERE',
  'Terminal norte, Bogotá',
  'Bogotá',
  'Terminal sur, Bucaramanga',
  'Bucaramanga',
  '05:00:00',
  '13:00:00',
  80,
  80,
  35000,
  'Mercedes Benz O-500',
  2020,
  'BUS-001',
  'Amarillo',
  'bus',
  'active'
);
`;

console.log('✅ Mock de vehículos cargado. Usa estos datos para testing:')
console.log('- mockVehicles: Objeto con todos los vehículos')
console.log('- mockSingleVehicle: Array con 1 vehículo')
console.log('- mockEmptyVehicles: Array vacío')
console.log('- mockMultipleVehicles: Array con varios vehículos')
console.log('- generateRandomVehicle(): Función para generar vehículos aleatorios')
