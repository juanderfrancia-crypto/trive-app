-- DIAGNÓSTICO: Identificar qué bookings deben ser 'completed'
-- Ejecutar en Supabase SQL Editor

-- 1️⃣ VER CORRELACIÓN: payment_status vs route.status
SELECT 
  b.payment_status,
  b.payment_method,
  r.status as route_status,
  COUNT(*) as total,
  SUM(b.price) as total_amount
FROM bookings b
JOIN routes r ON b.route_id = r.id
GROUP BY b.payment_status, b.payment_method, r.status
ORDER BY total DESC;

-- 2️⃣ IDENTIFICAR: Cash payments en rutas COMPLETED
-- Estos DEBEN tener payment_status='completed'
SELECT 
  COUNT(*) as cash_in_completed_routes,
  SUM(b.price) as total_amount
FROM bookings b
JOIN routes r ON b.route_id = r.id
WHERE r.status = 'completed'
  AND b.payment_method = 'cash'
  AND b.payment_status IN ('cash', 'pending');

-- 3️⃣ IDENTIFICAR: Bookings que están 'refunded' o 'expired'
SELECT 
  b.id,
  b.payment_status,
  b.payment_method,
  b.booking_status,
  r.status,
  r.driver_id,
  b.created_at
FROM bookings b
JOIN routes r ON b.route_id = r.id
WHERE b.payment_status IN ('expired', 'refunded')
  OR b.payment_method = 'pending'
LIMIT 30;

-- 4️⃣ VER: Bookings 'completed' sin payment_method
SELECT 
  COUNT(*) as completed_without_method,
  SUM(b.price) as total_amount
FROM bookings b
WHERE b.payment_status = 'completed'
  AND (b.payment_method IS NULL OR b.payment_method = '');
