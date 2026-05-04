-- Script para diagnosticar el estado de GANANCIAS en Supabase
-- Ejecutar en Supabase SQL Editor

-- 1. VER TODOS LOS CONDUCTORES Y SUS RUTAS
SELECT 
  p.id,
  p.full_name,
  p.role,
  COUNT(DISTINCT r.id) as total_routes,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_routes,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.payment_status = 'completed' THEN b.id END) as completed_bookings,
  COUNT(DISTINCT CASE WHEN b.payment_status = 'pending' THEN b.id END) as pending_bookings
FROM profiles p
LEFT JOIN routes r ON p.id = r.driver_id
LEFT JOIN bookings b ON r.id = b.route_id
WHERE p.role = 'driver'
GROUP BY p.id, p.full_name, p.role
ORDER BY completed_routes DESC;

-- 2. VER DETALLES DE RUTAS Y BOOKINGS CON PAYMENT STATUS
SELECT 
  r.id as route_id,
  r.driver_id,
  r.status as route_status,
  r.price_per_seat,
  r.created_at as route_created_at,
  b.id as booking_id,
  b.payment_status,
  b.booking_status,
  b.price,
  b.created_at as booking_created_at
FROM routes r
LEFT JOIN bookings b ON r.id = b.route_id
WHERE r.driver_id IS NOT NULL
ORDER BY r.created_at DESC
LIMIT 50;

-- 3. VER TODAS LAS TRANSACCIONES EN EARNINGS_TRANSACTIONS
SELECT 
  et.id,
  et.driver_id,
  p.full_name,
  et.status,
  et.amount,
  et.created_at
FROM earnings_transactions et
LEFT JOIN profiles p ON et.driver_id = p.id
ORDER BY et.created_at DESC
LIMIT 20;

-- 4. VERIFICAR SI HAY TRIGGER ACTIVO QUE ACTUALICE EARNINGS_TRANSACTIONS
SELECT 
  t.trg_name,
  t.procedure_name,
  t.timing,
  t.manipulation_type
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
  AND t.trigger_name ILIKE '%earning%';

-- 5. VER ESTADO ACTUAL DE PAGOS BOOKINGS (IMPORTANTE!)
SELECT 
  payment_status,
  COUNT(*) as total,
  SUM(price) as total_amount
FROM bookings
GROUP BY payment_status;
