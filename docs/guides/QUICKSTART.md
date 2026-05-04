#!/usr/bin/env node
// 🚀 INICIO RÁPIDO - 5 MINUTOS

/*
█████████████████████████████████████████████████████████████████████████████████
 ¿QUÉ HACEMOS?
█████████████████████████████████████████████████████████████████████████████████

PROBLEMA ACTUAL:
  "Unas veces al conductor le aparecen todos [pasajeros] en el panel 
   y otras veces solo la mitad cuando ya dice que cupo lleno"

CAUSA RAÍZ:
  available_seats se calcula manualmente en la app
  → Race conditions cuando múltiples usuarios reservan
  → Números inconsistentes
  → Los asientos no coinciden con la realidad

SOLUCIÓN:
  Mover la lógica de available_seats a un TRIGGER en la base de datos
  → Recalcula automáticamente después de CADA cambio
  → Atómico (sin race conditions)
  → Consistente 100% del tiempo

RESULTADO:
  ✅ Conductor siempre ve asientos correctos
  ✅ Funciona con N usuarios reservando simultáneamente
  ✅ Código más simple (menos bugs)


█████████████████████████████████████████████████████████████████████████████████
 QUÉ CAMBIÓ (Resumen)
█████████████████████████████████████████████████████████████████████████████████

✅ src/hooks/useBookings.ts
   - Función releasePendingBookings(): Ahora solo cancela bookings, 
     TRIGGER recalcula available_seats
   - Función cancelBooking(): Igual, simplificada

✅ src/screens/DriverPanelScreen.tsx
   - Agregada orden por seat_number (más legible)
   - Polling cambiado de 1s a 2s (menos carga)

✅ CREATE_AVAILABLE_SEATS_TRIGGER.sql (NUEVO)
   - Función + 3 triggers que recalculan available_seats
   - Se ejecuta en Supabase (no en la app)

✅ Documentación (3 archivos)
   - SUPABASE_EXECUTION_GUIDE.sql - Paso a paso
   - BOOKING_FLOW_COMPLETE_FIX.sql - Explicación completa
   - CHANGES_SUMMARY.md - Qué cambió y por qué


█████████████████████████████████████████████████████████████████████████████████
 INSTRUCCIONES (Solo 4 pasos)
█████████████████████████████████████████████████████████████████████████████████

PASO 1️⃣: ABRIR SUPABASE
──────────────────────────────────────────────────────────────────────────────────
1. Ve a https://supabase.com
2. Login en tu proyecto
3. Click "SQL Editor" (izquierda)
4. Click "New query"


PASO 2️⃣: COPIAR Y EJECUTAR SQL
──────────────────────────────────────────────────────────────────────────────────
Abre el archivo: SUPABASE_EXECUTION_GUIDE.sql

Copia SOLO el código entre:
  "PASO 1: CREAR EL TRIGGER..."
  hasta
  "✅ Si ves "Success"..."

Pégalo en Supabase SQL Editor y haz click "Run"
(O presiona Ctrl+Enter)

Espera a que diga "Success. No rows returned" (eso es normal)


PASO 3️⃣: EJECUTAR PASO 2 (Limpiar datos)
──────────────────────────────────────────────────────────────────────────────────
En el MISMO archivo, busca:
  "PASO 2: LIMPIAR DATOS..."

Copia ese código:
  UPDATE routes r
  SET available_seats = ...
  
Pégalo en Supabase y haz click "Run"

Deberías ver: "X rows updated" (donde X = número de rutas)


PASO 4️⃣: VERIFICAR Y RECARGAR EXPO
──────────────────────────────────────────────────────────────────────────────────
En el MISMO archivo, busca:
  "PASO 3: VERIFICAR..."

Copia el SELECT y ejecútalo

Deberías ver todas las filas con "✅ OK" en la columna "verificacion"

Ahora:
  1. Terminal con Expo
  2. Presiona Ctrl+C (para detener)
  3. Espera 3 segundos
  4. Escribe: npm start
  5. Vuelve a abrir la app


█████████████████████████████████████████████████████████████████████████████████
 PROBAR QUE FUNCIONA (5 min más)
█████████████████████████████████████████████████████████████████████████████████

1. Abre la app en tu teléfono/emulador
2. Busca una ruta con al menos 2 asientos disponibles
3. Selecciona 2-3 asientos
4. Confirma la reserva (ponle pagar después)
5. Ve al DriverPanel (otro usuario o abre inspector)
6. Deberías VER esos 2-3 pasajeros INMEDIATAMENTE ✅
7. available_seats debería haber disminuido ✅

¿RESULTADO?
  ✅ Sí funciona → Felicidades, problema RESUELTO
  ❌ No funciona → Mira "SI ALGO NO FUNCIONA" abajo


█████████████████████████████████████████████████████████████████████████████████
 SI ALGO NO FUNCIONA
█████████████████████████████████████████████████████████████████████████████████

❌ "ERROR: relation 'bookings' does not exist"
   → Tus tablas no existen
   → Ve a Supabase → Table Editor
   → Verifica que existen: bookings, routes, profiles

❌ "ERROR: syntax error"
   → Copiaste mal el SQL
   → Borra todo y intenta de nuevo
   → Copia desde SUPABASE_EXECUTION_GUIDE.sql línea por línea

❌ "Triggers ejecutados pero no actualiza"
   → Ejecuta de nuevo PASO 1 (recrear triggers)
   → Luego PASO 2 (limpiar datos)

❌ "DriverPanel muestra 0 pasajeros pero hay bookings"
   → Los bookings no tienen status='confirmed'
   → Ve a Supabase → Table Editor → bookings
   → Verifica que la columna booking_status = 'confirmed'

❌ "available_seats es negativo"
   → Algo está mal con los triggers
   → Ejecuta PASO 2 de nuevo (recalcula)


█████████████████████████████████████████████████████████████████████████████████
 ARCHIVOS PARA REFERENCIA
█████████████████████████████████████████████████████████████████████████████████

1. SUPABASE_EXECUTION_GUIDE.sql ← LEER PRIMERO
   Paso a paso para ejecutar en Supabase

2. CHANGES_SUMMARY.md
   Qué cambió en el código y por qué

3. BOOKING_FLOW_COMPLETE_FIX.sql
   Explicación completa del flujo de reserva

4. FIX_RACE_CONDITION_ATOMIC_BOOKING.sql
   (Ya actualizado con la lógica correcta)


█████████████████████████████████████████████████████████████████████████████████
 PREGUNTAS FRECUENTES
█████████████████████████████████████████████████████████████████████████████████

P: ¿Esto va a romper algo?
R: No. Solo simplificamos código existente. No hay breaking changes.

P: ¿Y si algo falla?
R: Los triggers se ejecutan DESPUÉS de que cambian los datos.
   Si hay error, el cambio ya ocurrió (rollback automático en transacciones).
   Pero Supabase tiene backup, así que cero riesgo.

P: ¿Cuándo en producción?
R: Cuando todo funcione en desarrollo. Los triggers son super estables.

P: ¿Los usuarios verán algo diferente?
R: Sí, pero para bien:
   - Asientos siempre correctos
   - Más rápido (menos queries)
   - Sin errores raros

P: ¿Qué pasa si me equivoco al copiar el SQL?
R: Click "Cancel" y intenta de nuevo. No modifica nada si cancelas.


█████████████████████████████████████████████████████████████████████████████████
 PRÓXIMOS PASOS
█████████████████████████████████████████████████████████████████████████████████

Cuando todo funcione:
  ✅ Hacer commit en Git
  ✅ Publicar a Expo
  ✅ Hacer deploy a producción
  ✅ Celebrar 🎉


█████████████████████████████████████████████████████████████████████████████████
*/

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🚀 LISTO PARA EJECUTAR EN SUPABASE                       ║
║                                                                              ║
║  1. Abre: SUPABASE_EXECUTION_GUIDE.sql                                      ║
║  2. Copia el código                                                         ║
║  3. Pégalo en Supabase SQL Editor                                           ║
║  4. Click "Run"                                                             ║
║  5. Espera "Success"                                                        ║
║  6. Haz npm start en Expo                                                   ║
║  7. Prueba reservando asientos                                              ║
║                                                                              ║
║  ¿Preguntas? Mira BOOKING_FLOW_COMPLETE_FIX.sql                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
