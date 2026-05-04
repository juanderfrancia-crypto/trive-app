-- 🔴 BUG FIX: Pasajeros desaparecen cuando se inicia el viaje
-- 
-- PROBLEMA:
-- Cuando el conductor presiona "Iniciar Viaje", los pasajeros desaparecen
-- Aunque el status cambia a "en_curso", los bookings no se muestran
--
-- CAUSA:
-- Después de cambiar route.status → 'in_progress', se llama fetchDriverRoutes()
-- que hace query: SELECT bookings WHERE booking_status = 'confirmed'
-- Pero probablemente hay RACE CONDITION o los datos no están sincronizados
--
-- SOLUCIÓN:
-- 1. Asegurarse que el query incluya bookings en CUALQUIER status relevante
--    (no solo 'confirmed')
-- 2. O hacer que el estado local persista después del update
--
-- ============================================================================
-- VERIFICAR ESTADO ACTUAL DE BOOKINGS
-- ============================================================================

-- Busca una ruta en status 'in_progress' y ve sus bookings:
SELECT 
  r.id as route_id,
  r.status as route_status,
  r.origin,
  r.destination,
  COUNT(CASE WHEN b.booking_status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN b.booking_status = 'pending' THEN 1 END) as pending_bookings,
  COUNT(b.id) as total_bookings
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id
WHERE r.status = 'in_progress'
GROUP BY r.id
LIMIT 5;

-- Si ves que hay bookings pero con status != 'confirmed', 
-- entonces ese es el problema

-- ============================================================================
-- FIX EN CÓDIGO: DriverPanelScreen.tsx
-- ============================================================================

-- El query en fetchDriverRoutes en línea ~90 necesita cambiar:

-- ANTES (línea ~90):
-- .eq('booking_status', 'confirmed')

-- DESPUÉS:
-- .in('booking_status', ['confirmed', 'completed'])
-- O simplemente sin filtro si todos los bookings deben mostrarse

-- ============================================================================
-- TAMBIÉN: El estado local no debe ser sobrescrito
-- ============================================================================

-- Después de updateRouteStatus, NO debería llamar a fetchDriverRoutes() 
-- para refrescar, porque eso borra los pasajeros del estado local.

-- En su lugar, debería hacer:
-- setRoutes((prev) => 
--   prev.map(route => 
--     route.id === routeId 
--       ? { ...route, status: newStatus }  // MANTIENE passengers
--       : route
--   )
-- )

-- Y NO llamar a fetchDriverRoutes() después
