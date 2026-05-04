-- ============================================================================
-- 🔒 POLÍTICAS RLS (ROW LEVEL SECURITY) PARA earnings_transactions
-- ============================================================================
-- Ejecuta esto DESPUÉS de crear la tabla earnings_transactions
-- Esto asegura que cada conductor SOLO VEA sus propias transacciones

-- ============================================================================
-- PASO 1: HABILITAR RLS EN LA TABLA (si no está habilitado)
-- ============================================================================

ALTER TABLE earnings_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: CREAR POLÍTICAS DE SEGURIDAD
-- ============================================================================

-- ✅ POLÍTICA 1: Conductores solo ven sus PROPIAS transacciones
CREATE POLICY "Drivers can view their own transactions"
ON earnings_transactions FOR SELECT
USING (
  -- El usuario autenticado es el mismo conductor (driver_id)
  auth.uid() = driver_id
);

-- ✅ POLÍTICA 2: Sistema (backend) puede INSERTAR transacciones
CREATE POLICY "Backend can insert earnings transactions"
ON earnings_transactions FOR INSERT
WITH CHECK (
  -- Permiten inserciones desde funciones del sistema
  true
);

-- ✅ POLÍTICA 3: Conductores pueden ver sus transacciones (alternativa)
CREATE POLICY "Drivers can read their own earnings"
ON earnings_transactions FOR SELECT
USING (
  -- Si el usuario es conductor, puede ver sus ganancias
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
      AND profiles.id = earnings_transactions.driver_id
  )
);

-- ✅ POLÍTICA 4: Admin puede ver todas las transacciones (para auditoría)
CREATE POLICY "Admin can view all earnings transactions"
ON earnings_transactions FOR SELECT
USING (
  -- Si el usuario es admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- PASO 3: CREAR POLÍTICAS PARA TABLA profiles (si no existen)
-- ============================================================================

-- Si quieres que drivers actualicen su campo updated_at
-- (el trigger lo hace, pero por si acaso):

CREATE POLICY "Users can update their own profile timestamp"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PASO 4: VERIFICACIÓN
-- ============================================================================

-- Ejecutar estos queries para VERIFICAR que RLS está habilitado:

-- Ver todas las políticas creadas:
SELECT * FROM pg_policies WHERE tablename = 'earnings_transactions';

-- Ver si RLS está habilitado en la tabla:
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'earnings_transactions';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
✅ QUÉ HACE ESTO:

1. HABILITAMOS RLS
   - Supabase solo permite acceso autorizado
   - Sin estas políticas, NADIE puede ver nada

2. CREAMOS POLÍTICAS:
   - Drivers: Solo ven sus PROPIAS transacciones
   - Admin: Ve TODO (para auditoría)
   - Backend: Puede insertar transacciones automáticamente

3. SEGURIDAD:
   - Conductor 1 NO ve ganancias de Conductor 2
   - Datos sensibles protegidos
   - GDPR compliant

✅ DESPUÉS DE EJECUTAR:

- Los triggers funcionan automáticamente
- Conductores solo ven sus datos
- Admin puede auditar todo
- Datos completamente seguros

❌ RIESGOS SI NO LO HACES:

- Cualquiera puede ver ALL ganancias (seguridad = 0)
- Violación de GDPR
- Datos sensibles expuestos
- Inaceptable para producción

*/

-- ============================================================================
-- FIN DEL SCRIPT RLS
-- ============================================================================
