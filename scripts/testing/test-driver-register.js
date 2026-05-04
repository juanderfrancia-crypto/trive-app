import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const SUPABASE_URL = 'https://iksenkkaxlmdiyeezoym.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3NDI2MzAsImV4cCI6MjA0ODMxODYzMH0.VkREAFXMhhJhfhwv82d5VrLGM9JvZS8vHSYB1PvLQHw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================
// VALIDACIONES (Lógica del Formulario)
// ============================================

function validateForm(formData) {
  const errors = [];

  if (!formData.origin?.trim()) {
    errors.push('Por favor ingresa el origen');
  }
  if (!formData.destination?.trim()) {
    errors.push('Por favor ingresa el destino');
  }
  if (!formData.departureTime?.trim()) {
    errors.push('Por favor ingresa la hora de salida (ej: 08:30)');
  }
  if (!formData.arrivalTime?.trim()) {
    errors.push('Por favor ingresa la hora de llegada (ej: 10:30)');
  }
  if (!formData.totalSeats?.trim() || parseInt(formData.totalSeats) < 1 || parseInt(formData.totalSeats) > 8) {
    errors.push('Por favor ingresa asientos válidos (1-8)');
  }
  if (!formData.pricePerSeat?.trim() || parseFloat(formData.pricePerSeat) <= 0) {
    errors.push('Por favor ingresa un precio válido');
  }
  if (!formData.vehicleMake?.trim()) {
    errors.push('Por favor ingresa la marca del vehículo');
  }
  if (!formData.vehicleYear?.trim() || formData.vehicleYear.length !== 4) {
    errors.push('Por favor ingresa un año válido (ej: 2020)');
  }
  if (!formData.vehiclePlate?.trim()) {
    errors.push('Por favor ingresa la placa del vehículo');
  }
  if (!formData.vehicleColor?.trim()) {
    errors.push('Por favor ingresa el color del vehículo');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// CASOS DE PRUEBA
// ============================================

const testCases = [
  {
    name: 'Test 1: Formulario válido completo',
    data: {
      origin: 'Bogotá Centro',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: true,
  },
  {
    name: 'Test 2: Origen vacío',
    data: {
      origin: '',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa el origen',
  },
  {
    name: 'Test 3: Destino vacío',
    data: {
      origin: 'Bogotá',
      destination: '',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa el destino',
  },
  {
    name: 'Test 4: Hora salida vacía',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa la hora de salida',
  },
  {
    name: 'Test 5: Asientos fuera de rango (9)',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '9',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa asientos válidos (1-8)',
  },
  {
    name: 'Test 6: Precio negativo',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '-50000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa un precio válido',
  },
  {
    name: 'Test 7: Año con menos de 4 dígitos',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '20',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa un año válido',
  },
  {
    name: 'Test 8: Placa vacía',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: '',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa la placa',
  },
  {
    name: 'Test 9: Color vacío',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: '',
    },
    shouldPass: false,
    expectedError: 'Por favor ingresa el color',
  },
  {
    name: 'Test 10: Múltiples campos vacíos',
    data: {
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    shouldPass: false,
    expectedErrorCount: 3,
  },
];

// ============================================
// EJECUTAR PRUEBAS DE VALIDACIÓN
// ============================================

function runValidationTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║  🧪 PRUEBAS DE VALIDACIÓN DE FORMULARIO                ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const validation = validateForm(testCase.data);
    const testNumber = index + 1;

    log(`\n[Test ${testNumber}] ${testCase.name}`, 'cyan');

    if (testCase.shouldPass) {
      if (validation.isValid) {
        log(`  ✅ PASÓ: Validación correcta (sin errores)`, 'green');
        passed++;
      } else {
        log(`  ❌ FALLÓ: Se esperaba que pasara pero tuvo errores:`, 'red');
        validation.errors.forEach((err) => log(`     - ${err}`, 'red'));
        failed++;
      }
    } else {
      if (!validation.isValid) {
        if (testCase.expectedError) {
          const hasExpectedError = validation.errors.some((err) =>
            err.includes(testCase.expectedError)
          );
          if (hasExpectedError) {
            log(`  ✅ PASÓ: Error esperado capturado`, 'green');
            log(`     Error: "${validation.errors[0]}"`, 'green');
            passed++;
          } else {
            log(`  ❌ FALLÓ: Error inesperado`, 'red');
            log(`     Esperado: "${testCase.expectedError}"`, 'red');
            log(`     Obtenido: "${validation.errors[0]}"`, 'red');
            failed++;
          }
        } else if (testCase.expectedErrorCount) {
          if (validation.errors.length === testCase.expectedErrorCount) {
            log(`  ✅ PASÓ: Cantidad de errores correcta (${validation.errors.length})`, 'green');
            passed++;
          } else {
            log(`  ❌ FALLÓ: Cantidad de errores incorrecta`, 'red');
            log(`     Esperado: ${testCase.expectedErrorCount} errores`, 'red');
            log(`     Obtenido: ${validation.errors.length} errores`, 'red');
            failed++;
          }
        } else {
          log(`  ✅ PASÓ: Validación falló como se esperaba`, 'green');
          passed++;
        }
      } else {
        log(`  ❌ FALLÓ: Se esperaba que fallara la validación`, 'red');
        failed++;
      }
    }
  });

  log(`\n╔════════════════════════════════════════════════════════╗`, 'blue');
  log(`║  📊 RESULTADOS DE VALIDACIÓN                           ║`, 'blue');
  log(`║  ✅ Pasadas: ${passed}`.padEnd(55) + '║', 'green');
  log(`║  ❌ Fallidas: ${failed}`.padEnd(55) + '║', failed > 0 ? 'red' : 'green');
  log(`║  📈 Total: ${testCases.length}`.padEnd(55) + '║', 'blue');
  log(`╚════════════════════════════════════════════════════════╝`, 'blue');

  return { passed, failed, total: testCases.length };
}

// ============================================
// PRUEBA DE CREACIÓN EN SUPABASE
// ============================================

async function testCreateRoute() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║  🌐 PRUEBA DE CREACIÓN EN SUPABASE                     ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  try {
    // Obtener usuario autenticado (o usar test user)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log('\n⚠️  No hay usuario autenticado', 'yellow');
      log('   Para esta prueba necesitas:', 'yellow');
      log('   1. Loguear en la app', 'yellow');
      log('   2. Ejecutar este script después del login', 'yellow');
      return;
    }

    log(`\n✅ Usuario autenticado: ${user.email}`, 'green');
    log(`   ID: ${user.id}`, 'yellow');

    // Datos de prueba
    const testRouteData = {
      driver_id: user.id,
      origin: 'Bogotá Centro - TEST',
      destination: 'Medellín - TEST',
      departure_time: '2026-04-04T08:30:00',
      arrival_time: '2026-04-04T12:45:00',
      price_per_seat: 45000,
      total_seats: 4,
      available_seats: 4,
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2020,
      vehicle_plate: 'TEST234',
      vehicle_color: 'Negro',
      status: 'scheduled',
    };

    log('\n📝 Intentando crear ruta con datos:', 'cyan');
    log(JSON.stringify(testRouteData, null, 2), 'yellow');

    const { data, error } = await supabase
      .from('routes')
      .insert([testRouteData])
      .select();

    if (error) {
      log(`\n❌ Error al crear ruta:`, 'red');
      log(`   ${error.message}`, 'red');
      return;
    }

    log(`\n✅ Ruta creada exitosamente`, 'green');
    log(`   Route ID: ${data[0].id}`, 'green');
    log(
      `   Estado: ${data[0].status} | Asientos: ${data[0].total_seats} | Disponibles: ${data[0].available_seats}`,
      'green'
    );

    // Verificar en BD
    log('\n🔍 Verificando ruta en BD...', 'cyan');
    const { data: routeFromDB, error: queryError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', data[0].id)
      .single();

    if (queryError) {
      log(`❌ Error al consultar: ${queryError.message}`, 'red');
      return;
    }

    log(`✅ Ruta recuperada correctamente:`, 'green');
    log(
      `   Origen: ${routeFromDB.origin} → Destino: ${routeFromDB.destination}`,
      'green'
    );
    log(`   Vehículo: ${routeFromDB.vehicle_make} (${routeFromDB.vehicle_plate})`, 'green');
    log(`   Precio: $${routeFromDB.price_per_seat.toLocaleString('es-CO')}`, 'green');

    // Limpiar (opcional: eliminar ruta de prueba)
    log('\n🗑️  Limpiando datos de prueba...', 'cyan');
    const { error: deleteError } = await supabase
      .from('routes')
      .delete()
      .eq('id', data[0].id);

    if (deleteError) {
      log(`⚠️  No se pudo eliminar ruta de prueba: ${deleteError.message}`, 'yellow');
    } else {
      log(`✅ Ruta de prueba eliminada`, 'green');
    }
  } catch (err) {
    log(`\n❌ Error inesperado: ${err.message}`, 'red');
  }
}

// ============================================
// ESTADÍSTICAS
// ============================================

async function getStatistics() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║  📊 ESTADÍSTICAS DE BASE DE DATOS                      ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  try {
    // Total de rutas
    const { count: totalRoutes } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true });

    // Total de bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Total de usuarios
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Rutas con seats disponibles
    const { count: availableRoutes } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true })
      .gt('available_seats', 0);

    log(`\n📈 Estadísticas Generales:`, 'cyan');
    log(`   Total de rutas: ${totalRoutes}`, 'yellow');
    log(`   Rutas con asientos disponibles: ${availableRoutes}`, 'yellow');
    log(`   Total de bookings: ${totalBookings}`, 'yellow');
    log(`   Total de usuarios: ${totalUsers}`, 'yellow');
  } catch (err) {
    log(`\n❌ Error al obtener estadísticas: ${err.message}`, 'red');
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║  🚀 SCRIPT DE PRUEBA - DriverRegisterScreen            ║', 'blue');
  log('║  Validación de lógica sin UI                           ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  // 1. Pruebas de validación
  const validationResults = runValidationTests();

  // 2. Estadísticas
  await getStatistics();

  // 3. Prueba de creación
  log('\n⚠️  Nota:', 'yellow');
  log('   Para probar creación en Supabase, necesitas "test-conductor@example.com"', 'yellow');
  log('   loggeado en la app. Si no tienes, la prueba se saltará.', 'yellow');
  await testCreateRoute();

  // Resumen final
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║  ✨ RESUMEN FINAL                                      ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');
  log(`\n✅ Validaciones: ${validationResults.passed}/${validationResults.total} pasadas`, 'green');
  log(
    validationResults.failed > 0
      ? `❌ ${validationResults.failed} validaciones fallaron`
      : `🎉 Todas las validaciones pasaron correctamente!`,
    validationResults.failed > 0 ? 'red' : 'green'
  );
  log('\n📚 Configuración:');
  log(`   Supabase URL: ${SUPABASE_URL.substring(0, 40)}...`, 'yellow');
  log(`   Proyecto: iksenkkaxlmdiyeezoym`, 'yellow');
  log('\n', 'reset');
}

main();
