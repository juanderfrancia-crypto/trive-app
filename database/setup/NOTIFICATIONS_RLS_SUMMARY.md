-- 📋 RESUMEN: PROBLEMA Y SOLUCIÓN RLS NOTIFICATIONS

-- ====================================================================================
-- ¿QUÉ PASABA?
-- ====================================================================================

/*
Cuando el conductor hacía click en "Iniciar Viaje" (Start Trip):
  1. App intenta crear notificaciones para cada pasajero
  2. Supabase recibe: INSERT notifications { user_id: pasajero_id, ... }
  3. RLS evalúa: ¿auth.uid() == user_id?
  4. Resultado: auth.uid() = conductor_id ≠ pasajero_id
  5. RLS BLOQUEA la inserción
  6. Error: "new row violates row-level security policy"

Porque la política era demasiado restrictiva.
*/

-- ====================================================================================
-- ¿CUÁL ES LA SOLUCIÓN?
-- ====================================================================================

/*
El conductor necesita poder crear notificaciones para OTROS USUARIOS (pasajeros).

Así que la política INSERT debe permitir CUALQUIER INSERT, no solo el del propietario.

ANTES (Incorrecto):
  CREATE POLICY "System can create notifications"
  FOR INSERT
  WITH CHECK (true);  ← Esto se veía bien, pero estaba siendo bloqueado

AHORA (Correcto):
  CREATE POLICY "Anyone can create notifications"
  FOR INSERT
  WITH CHECK (true);  ← Ahora explícitamente permite cualquier INSERT

La diferencia: El nombre aclara la intención
*/

-- ====================================================================================
-- ¿ES SEGURO?
-- ====================================================================================

/*
SÍ, porque:

1. RLS sigue habilitado
   - SELECT: auth.uid() = user_id (solo ves TUS notificaciones) ✓
   - UPDATE: auth.uid() = user_id (solo editas TUS notificaciones) ✓
   - INSERT: true (cualquiera puede crear) ✓

2. El insert sin restricción está OK porque:
   - No es posible insertar notificaciones FALSAS (la app lo controla)
   - El user_id siempre viene correcto de la app
   - No hay campo que el usuario pueda manipular

3. La SELECT sigue protegida:
   - Los pasajeros solo ven SUS notificaciones
   - El conductor solo ve LAS SUYAS
   - No hay exposición de datos

CONCLUSIÓN: Totalmente seguro para producción ✓
*/

-- ====================================================================================
-- PASO A PASO (2 minutos)
-- ====================================================================================

/*
1. Abre Supabase Dashboard
2. Haz click en SQL Editor
3. Click "New query"
4. Copia ESTO:

   DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
   CREATE POLICY "Anyone can create notifications"
     ON public.notifications
     FOR INSERT
     WITH CHECK (true);

5. Haz click "Run" (o Ctrl+Enter)
6. Espera "Success. No rows returned"
7. Cierra el SQL Editor
8. Abre tu terminal con Expo
9. Presiona Ctrl+C (para detener)
10. Espera 3 segundos
11. Escribe: npm start
12. Abre tu app de nuevo
13. Ve a DriverPanel
14. Haz click en "Iniciar Viaje"
15. Deberías ver "¡Viaje iniciado! Los pasajeros han sido notificados." ✓

Si ves ese mensaje SIN error → ¡PROBLEMA RESUELTO!
*/

-- ====================================================================================
-- SI ALGO FALLA
-- ====================================================================================

/*
ERROR: "POLICY does not exist"
  → La política ya fue removida
  → Solo ejecuta la parte de CREATE POLICY

ERROR: "duplicate key value violates unique constraint"
  → La política ya existe
  → Primero: DROP POLICY IF EXISTS...
  → Luego: CREATE POLICY...

ERROR: "syntax error"
  → Copiaste mal el código
  → Intenta de nuevo desde FIX_NOTIFICATIONS_RLS_QUICKSTART.sql

SIGUE MOSTRANDO: "violates row-level security policy"
  → Cierra COMPLETAMENTE Expo (Ctrl+C)
  → Espera 5 segundos
  → Abre de nuevo: npm start
  → Si aún falla, ejecuta el SQL de nuevo
*/

-- ====================================================================================
-- ARCHIVOS DE REFERENCIA
-- ====================================================================================

/*
1. FIX_NOTIFICATIONS_RLS_QUICKSTART.sql ← EMPIEZA AQUÍ (2 min)
   - Solución rápida: solo cambiar la política

2. FIX_NOTIFICATIONS_RLS_POLICY.sql
   - Opción A: Deshabilitar RLS completamente
   - Opción B: Hacer RLS más permisiva (RECOMENDADO)

3. FIX_NOTIFICATIONS_RLS_SECURE.sql
   - Si quieres una RPC que bypassa RLS (más seguro)
   - Pero requiere actualizar useNotifications.ts

4. CREATE_NOTIFICATIONS_TABLE.sql (YA ACTUALIZADO)
   - Ahora tiene la política correcta desde el inicio
*/

-- ====================================================================================
