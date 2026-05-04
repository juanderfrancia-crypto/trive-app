#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA - DriverRegisterScreen
 * Prueba la validación de formulario sin necesidad de la UI
 * 
 * Ejecución: node test-driver-register-simple.js
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function validateOrigin(origin) {
  return origin && origin.trim().length > 0;
}

function validateDestination(destination) {
  return destination && destination.trim().length > 0;
}

function validateDepartureTime(time) {
  if (!time || !time.trim()) return false;
  // Match HH:MM format
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time.trim());
}

function validateArrivalTime(time) {
  if (!time || !time.trim()) return false;
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time.trim());
}

function validateTotalSeats(seats) {
  if (!seats || !seats.trim()) return false;
  const num = parseInt(seats);
  return num >= 1 && num <= 8;
}

function validatePricePerSeat(price) {
  if (!price || !price.trim()) return false;
  const num = parseFloat(price);
  return num > 0;
}

function validateVehicleMake(make) {
  return make && make.trim().length > 0;
}

function validateVehicleYear(year) {
  if (!year || !year.trim()) return false;
  return year.length === 4 && /^\d{4}$/.test(year);
}

function validateVehiclePlate(plate) {
  return plate && plate.trim().length > 0;
}

function validateVehicleColor(color) {
  return color && color.trim().length > 0;
}

// Función de validación completa
function validateForm(formData) {
  const errors = [];

  if (!validateOrigin(formData.origin)) {
    errors.push('Por favor ingresa el origen');
  }
  if (!validateDestination(formData.destination)) {
    errors.push('Por favor ingresa el destino');
  }
  if (!validateDepartureTime(formData.departureTime)) {
    errors.push('Por favor ingresa la hora de salida (ej: 08:30)');
  }
  if (!validateArrivalTime(formData.arrivalTime)) {
    errors.push('Por favor ingresa la hora de llegada (ej: 10:30)');
  }
  if (!validateTotalSeats(formData.totalSeats)) {
    errors.push('Por favor ingresa asientos válidos (1-8)');
  }
  if (!validatePricePerSeat(formData.pricePerSeat)) {
    errors.push('Por valor ingresa un precio válido');
  }
  if (!validateVehicleMake(formData.vehicleMake)) {
    errors.push('Por favor ingresa la marca del vehículo');
  }
  if (!validateVehicleYear(formData.vehicleYear)) {
    errors.push('Por favor ingresa un año válido (ej: 2020)');
  }
  if (!validateVehiclePlate(formData.vehiclePlate)) {
    errors.push('Por favor ingresa la placa del vehículo');
  }
  if (!validateVehicleColor(formData.vehicleColor)) {
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
    name: 'Formulario válido completo',
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
    expectValid: true,
  },
  {
    name: 'Origen vacío',
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
    expectValid: false,
  },
  {
    name: 'Hora de salida en formato inválido (sin dos puntos)',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '0830',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    expectValid: false,
  },
  {
    name: 'Hora de salida fuera de rango (25:00)',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '25:00',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    expectValid: false,
  },
  {
    name: 'Asientos fuera de rango (9)',
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
    expectValid: false,
  },
  {
    name: 'Asiento 0 (menor que 1)',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '0',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    expectValid: false,
  },
  {
    name: 'Precio negativo',
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
    expectValid: false,
  },
  {
    name: 'Precio cero',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '0',
      vehicleMake: 'Toyota',
      vehicleYear: '2020',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    expectValid: false,
  },
  {
    name: 'Año con 2 dígitos',
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
    expectValid: false,
  },
  {
    name: 'Año con letras',
    data: {
      origin: 'Bogotá',
      destination: 'Medellín',
      departureTime: '08:30',
      arrivalTime: '12:45',
      totalSeats: '4',
      pricePerSeat: '45000',
      vehicleMake: 'Toyota',
      vehicleYear: '20ab',
      vehiclePlate: 'ABX234',
      vehicleColor: 'Negro',
    },
    expectValid: false,
  },
  {
    name: 'Placa vacía',
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
    expectValid: false,
  },
];

// ============================================
// EJECUTAR PRUEBAS
// ============================================

function runTests() {
  log('\n╔' + '═'.repeat(70) + '╗', 'blue');
  log(
    '║  ' +
      colors.bold +
      '🧪 PRUEBAS DE VALIDACIÓN - DriverRegisterScreen' +
      colors.reset +
      colors.blue +
      ' '.repeat(21) +
      '║',
    'blue'
  );
  log('╚' + '═'.repeat(70) + '╝\n', 'blue');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const validation = validateForm(testCase.data);
    const testNumber = index + 1;

    log(
      `[Test ${String(testNumber).padStart(2)}] ${testCase.name.padEnd(50)}`,
      'cyan'
    );

    if (testCase.expectValid === validation.isValid) {
      log(`           ✅ PASÓ`, 'green');
      passed++;
    } else {
      log(`           ❌ FALLÓ`, 'red');
      if (!validation.isValid) {
        validation.errors.forEach((err) => {
          log(`              Error: ${err}`, 'red');
        });
      } else {
        log(`              Esperaba errores pero pasó la validación`, 'red');
      }
      failed++;
    }
  });

  // Resumen
  log('\n╔' + '═'.repeat(70) + '╗', 'blue');
  log('║  📊 RESULTADOS'.padEnd(74) + '║', 'blue');
  log('╠' + '═'.repeat(70) + '╣', 'blue');
  log(
    `║  ✅ Pasadas:  ${String(passed).padStart(2)} / ${String(testCases.length).padStart(2)}`.padEnd(74) +
      '║',
    'green'
  );
  log(
    `║  ❌ Fallidas: ${String(failed).padStart(2)} / ${String(testCases.length).padStart(2)}`.padEnd(74) +
      '║',
    failed > 0 ? 'red' : 'green'
  );
  log('║  📈 Tasa de éxito: ' + ((passed / testCases.length) * 100).toFixed(1) + '%'.padEnd(53) + '║', 'yellow');
  log('╚' + '═'.repeat(70) + '╝\n', 'blue');

  return { passed, failed, total: testCases.length, rate: (passed / testCases.length) * 100 };
}

// ============================================
// VALIDACIONES INDIVIDUALES (DEMOSTRACIÓN)
// ============================================

function demonstrateValidations() {
  log('╔' + '═'.repeat(70) + '╗', 'blue');
  log(
    '║  🔍 VALIDACIONES INDIVIDUALES (Ejemplos)'.padEnd(74) +
      '║',
    'blue'
  );
  log('╚' + '═'.repeat(70) + '╝\n', 'blue');

  const demos = [
    { name: 'Origen "Bogotá"', fn: () => validateOrigin('Bogotá'), expected: true },
    { name: 'Origen ""', fn: () => validateOrigin(''), expected: false },
    { name: 'Hora "08:30"', fn: () => validateDepartureTime('08:30'), expected: true },
    { name: 'Hora "25:00"', fn: () => validateDepartureTime('25:00'), expected: false },
    { name: 'Asientos "4"', fn: () => validateTotalSeats('4'), expected: true },
    { name: 'Asientos "9"', fn: () => validateTotalSeats('9'), expected: false },
    { name: 'Precio "45000"', fn: () => validatePricePerSeat('45000'), expected: true },
    { name: 'Precio "0"', fn: () => validatePricePerSeat('0'), expected: false },
    { name: 'Año "2020"', fn: () => validateVehicleYear('2020'), expected: true },
    { name: 'Año "20"', fn: () => validateVehicleYear('20'), expected: false },
  ];

  demos.forEach((demo, i) => {
    const result = demo.fn();
    const status = result === demo.expected ? '✅' : '❌';
    log(`${status} ${demo.name.padEnd(20)} → ${result}`, result === demo.expected ? 'green' : 'red');
  });

  log('', 'reset');
}

// ============================================
// CÁLCULOS DE EJEMPLO
// ============================================

function demonstrateCalculations() {
  log('\n╔' + '═'.repeat(70) + '╗', 'blue');
  log(
    '║  💰 CÁLCULOS DE EJEMPLO (Estimado de Ingresos)'.padEnd(74) +
      '║',
    'blue'
  );
  log('╚' + '═'.repeat(70) + '╝\n', 'blue');

  const examples = [
    { seats: 4, price: 45000 },
    { seats: 3, price: 50000 },
    { seats: 5, price: 40000 },
    { seats: 8, price: 35000 },
  ];

  examples.forEach((example) => {
    const total = example.seats * example.price;
    log(
      `🚗 ${example.seats} asientos × $${example.price.toLocaleString('es-CO')} = $${total.toLocaleString(
        'es-CO'
      )}`,
      'yellow'
    );
  });

  log('', 'reset');
}

// ============================================
// MAIN
// ============================================

function main() {
  log('\n', 'reset');
  log('╔' + '═'.repeat(70) + '╗', 'bold');
  log(
    '║  🚀 SCRIPT DE PRUEBA - DriverRegisterScreen (Lógica sin UI)'.padEnd(75) +
      '║',
    'blue'
  );
  log('╚' + '═'.repeat(70) + '╝', 'blue');

  // Demo de validaciones individuales
  demonstrateValidations();

  // Demo de cálculos
  demonstrateCalculations();

  // Ejecutar todas las pruebas
  const results = runTests();

  // Resumen final
  log('╔' + '═'.repeat(70) + '╗', 'blue');
  log('║  ✨ CONCLUSIÓN'.padEnd(74) + '║', 'blue');
  log('╠' + '═'.repeat(70) + '╣', 'blue');

  if (results.failed === 0) {
    log('║  ' + colors.bold + '🎉 Todas las pruebas pasaron correctamente!' + colors.reset + ' '.repeat(28) + '║', 'green');
  } else {
    log(`║  ⚠️  ${results.failed} prueba(s) fallaron - Revisar lógica`.padEnd(74) + '║', 'red');
  }

  log(
    `║  Tasa de éxito: ${results.rate.toFixed(1)}%`.padEnd(74) +
      '║',
    results.rate === 100 ? 'green' : 'yellow'
  );
  log('╚' + '═'.repeat(70) + '╝\n', 'blue');

  // Tips
  log('💡 TIPS:', 'yellow');
  log('   • La validación rechaza campos vacíos', 'yellow');
  log('   • Las horas deben estar en formato HH:MM (00:00 a 23:59)', 'yellow');
  log('   • Asientos: 1-8 solamente', 'yellow');
  log('   • Precio debe ser mayor a 0', 'yellow');
  log('   • Año debe tener exactamente 4 dígitos', 'yellow');
  log('\n');
}

main();
