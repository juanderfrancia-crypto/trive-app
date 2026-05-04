-- WALLET_BALANCE_TEST_DATA.sql
-- Datos de prueba para el sistema de saldo/billetera

-- 1. Actualizar saldos para usuarios de prueba
UPDATE profiles 
SET balance = 45800
WHERE phone = '+573001234567';

UPDATE profiles 
SET balance = 120000
WHERE phone = '+573009876543';

UPDATE profiles 
SET balance = 5500
WHERE phone = '+573015551234';

UPDATE profiles 
SET balance = 1200
WHERE phone = '+573025559999';

-- 2. Verificar saldos actualizados
SELECT 
  id,
  name, 
  email,
  phone,
  balance,
  balance::TEXT || ' COP' AS saldo_formateado,
  CASE 
    WHEN balance >= 50000 THEN 'Saldo Saludable ✓'
    WHEN balance >= 10000 THEN 'Saldo Moderado ⚠'
    WHEN balance >= 5000 THEN 'Saldo Bajo ⚠'
    ELSE 'Saldo Crítico 🔴'
  END AS estado_saldo
FROM profiles 
WHERE phone IS NOT NULL
ORDER BY balance DESC;

-- 3. Ver transacciones registradas (si existen)
SELECT 
  wt.user_id,
  p.name,
  p.email,
  COUNT(*) as total_transacciones,
  SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END) as total_depositos,
  SUM(CASE WHEN wt.amount < 0 THEN ABS(wt.amount) ELSE 0 END) as total_retiros,
  MAX(wt.created_at) as ultima_transaccion
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
GROUP BY wt.user_id, p.name, p.email
ORDER BY ultima_transaccion DESC;
