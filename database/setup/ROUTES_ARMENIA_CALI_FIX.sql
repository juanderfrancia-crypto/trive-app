-- ===========================================
-- DIAGNÓSTICO Y REPARACIÓN - RUTAS ARMENIA-CALI
-- ===========================================

-- 1. VER TODAS LAS RUTAS ARMENIA-CALI
SELECT 
  id, 
  origin, 
  destination, 
  total_seats, 
  available_seats, 
  price_per_seat,
  status,
  departure_time,
  created_at
FROM routes 
WHERE (origin ILIKE '%armenia%' OR destination ILIKE '%armenia%')
  AND (origin ILIKE '%cali%' OR destination ILIKE '%cali%')
ORDER BY created_at DESC;

-- 2. CONTAR RESERVAS POR RUTA ARMENIA-CALI
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  COUNT(b.id) as booking_count,
  (r.total_seats - COUNT(b.id)) as should_be_available
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id AND b.booking_status IN ('confirmed', 'pending')
WHERE (r.origin ILIKE '%armenia%' OR r.destination ILIKE '%armenia%')
  AND (r.origin ILIKE '%cali%' OR r.destination ILIKE '%cali%')
GROUP BY r.id, r.origin, r.destination, r.total_seats, r.available_seats
ORDER BY r.created_at DESC;

-- 3. REPARAR available_seats (EJECUTAR SI ESTÁ MAL)
-- Este script actualiza available_seats correctamente
UPDATE routes r
SET available_seats = (
  SELECT COALESCE(r.total_seats - COUNT(b.id), r.total_seats)
  FROM bookings b
  WHERE b.route_id = r.id 
    AND b.booking_status IN ('confirmed', 'pending')
)
WHERE (r.origin ILIKE '%armenia%' OR r.destination ILIKE '%armenia%')
  AND (r.origin ILIKE '%cali%' OR r.destination ILIKE '%cali%');

-- 4. VERIFICAR RESULTADO
SELECT 
  id,
  origin,
  destination,
  total_seats,
  available_seats,
  (total_seats - available_seats) as occupied_seats,
  departure_time
FROM routes 
WHERE (origin ILIKE '%armenia%' OR destination ILIKE '%armenia%')
  AND (origin ILIKE '%cali%' OR destination ILIKE '%cali%')
ORDER BY departure_time DESC;
