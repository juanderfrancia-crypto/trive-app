-- Tabla de movimientos de billetera (recargas y cobros por publicación)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount                integer NOT NULL,
  type                  text NOT NULL CHECK (type IN ('recharge', 'route_fee')),
  wompi_reference       text UNIQUE,
  wompi_transaction_id  text,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','declined','voided','error')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Usuarios solo ven sus propios movimientos
CREATE POLICY "own_transactions_select"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON wallet_transactions (wompi_reference)
  WHERE wompi_reference IS NOT NULL;

-- Función para incrementar saldo de forma atómica
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET    balance = COALESCE(balance, 0) + p_amount
  WHERE  id = p_user_id;
END;
$$;
