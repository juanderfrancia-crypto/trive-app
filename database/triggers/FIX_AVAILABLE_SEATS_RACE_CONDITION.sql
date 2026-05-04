-- 🔧 FIX: Recalcular available_seats correctamente después de confirmar
-- Ejecuta en Supabase SQL Editor

-- La RPC finalize_bookings_atomic debe recalcular available_seats, no decrementarlo
-- Porque hay una carrera: si 2 usuarios confirman simultáneamente, ambos decrementan

-- Opción A: Ejecuta esta query después de confirmaciones (manual fix)
UPDATE routes r
SET available_seats = r.total_seats - (
  SELECT COUNT(*) FROM bookings 
  WHERE route_id = r.id 
  AND booking_status = 'confirmed'
)
WHERE r.id IN (
  SELECT DISTINCT route_id FROM bookings WHERE booking_status = 'confirmed'
);

-- Verificar que se actualizó correctamente
SELECT 
  r.id,
  r.origin,
  r.destination,
  r.total_seats,
  r.available_seats,
  COUNT(b.id) as confirmed_bookings,
  r.total_seats - COUNT(b.id) as should_be_available
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id AND b.booking_status = 'confirmed'
GROUP BY r.id
ORDER BY r.created_at DESC
LIMIT 10;
