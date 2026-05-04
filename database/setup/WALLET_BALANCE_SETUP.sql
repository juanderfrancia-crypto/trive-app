-- WALLET_BALANCE_SETUP.sql
-- Agregar campo balance a tabla profiles y crear funciones de billetera

-- 1. Agregar columna balance a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;

-- 2. Crear índice para queries de balance
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(id, balance);

-- 3. Crear tabla de transacciones de billetera (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'bonus')), 
  description TEXT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Crear índices para transacciones
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);

-- 5. Crear función para agregar dinero a la billetera
CREATE OR REPLACE FUNCTION add_wallet_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Actualizar balance
  UPDATE profiles 
  SET balance = balance + GREATEST(p_amount, 0)
  WHERE id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, booking_id)
  VALUES (p_user_id, p_amount, p_transaction_type, p_description, p_booking_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función para retirar dinero de la billetera
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Obtener balance actual
  SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id;

  -- Verificar si hay suficiente balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Balance: %, Monto requerido: %', v_current_balance, p_amount;
  END IF;

  -- Actualizar balance
  UPDATE profiles 
  SET balance = balance - p_amount
  WHERE id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, booking_id)
  VALUES (p_user_id, -p_amount, p_transaction_type, p_description, p_booking_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear función para obtener balance actualizado
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance FROM profiles WHERE id = p_user_id;
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- 8. Crear función para obtener historial de transacciones
CREATE OR REPLACE FUNCTION get_wallet_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  transaction_id UUID,
  transaction_type TEXT,
  amount INTEGER,
  description TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    transaction_type,
    amount,
    description,
    created_at
  FROM wallet_transactions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 9. Habilitar RLS (Row Level Security) si es necesario
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 10. Crear políticas de seguridad para wallet_transactions
CREATE POLICY "Users can view their own wallet transactions" 
  ON wallet_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 11. Inicializar balance para usuarios existentes
UPDATE profiles 
SET balance = 45800
WHERE balance IS NULL OR balance = 0;

-- Verificación
SELECT id, name, email, balance FROM profiles ORDER BY created_at DESC LIMIT 5;
