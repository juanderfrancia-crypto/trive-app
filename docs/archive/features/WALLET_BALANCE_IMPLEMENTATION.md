# SISTEMA DE SALDO/BILLETERA - IMPLEMENTACIÓN COMPLETA

## 📋 ¿Qué es el "Saldo"?

El **Saldo** es dinero virtual en la billetera digital del usuario TRIVE. Se usa para:
- Pagar viajes directamente sin tarjeta de crédito
- Guardar créditos de promociones y bonos
- Acumular reembolsos de viajes cancelados
- Hacer pagos instantáneos sin fricción

## 🎯 Estado Actual

### ✅ Frontend Completado
- **HomeScreen.tsx**: Badge dinámico que muestra el saldo actual
  - Formato: `$45.8k` si balance >= 1000, sino `$50`
  - Colores dinámicos según nivel:
    - 🟢 Verde: Balance >= $10,000 (Saludable)
    - 🟡 Amarillo: Balance $5,000 - $9,999 (Moderado)
    - 🔴 Rojo: Balance < $5,000 (Crítico)
  - Wallet icon que cambia de color según estado

### ✅ Datos Cargados en Login
- **LoginScreen.tsx**: Carga `balance` desde BD en Email login
- **LoginPhoneScreen.tsx**: Carga `balance` desde BD en Phone OTP login
  - Incluye nuevos usuarios (default: $0)

### ✅ Zustand Store Actualizado
- **useAppStore.ts**: 
  - `user?.balance: number | undefined` (nuevo campo)
  - `balance: number` global state (fallback: 45800)
  - Sincroniza con BD en login

## 📊 Base de Datos

### Tabla: profiles
```sql
ALTER TABLE profiles ADD balance INTEGER DEFAULT 0;
CREATE INDEX idx_profiles_balance ON profiles(id, balance);
```

### Tabla: wallet_transactions (Nueva)
```sql
wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID -> profiles(id),
  amount INTEGER (en centavos),
  transaction_type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'bonus',
  description TEXT,
  booking_id UUID -> bookings(id),
  created_at TIMESTAMP,
  created_by UUID
)
```

## 🔧 Funciones SQL Disponibles

### 1. `add_wallet_balance(user_id, amount, type, description, booking_id)`
Agrega dinero a la billetera:
```sql
SELECT add_wallet_balance(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  50000,
  'bonus',
  'Promoción de bienvenida'
);
```

### 2. `deduct_wallet_balance(user_id, amount, type, description, booking_id)`
Retira dinero con validación:
```sql
SELECT deduct_wallet_balance(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  15000,
  'payment',
  'Pago de viaje',
  'booking-id-123'::uuid
);
```

### 3. `get_wallet_balance(user_id)`
Obtiene balance actual:
```sql
SELECT get_wallet_balance('550e8400-e29b-41d4-a716-446655440000'::uuid);
```

### 4. `get_wallet_transactions(user_id, limit)`
Obtiene historial de transacciones:
```sql
SELECT * FROM get_wallet_transactions(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  20
);
```

## 🚀 Próximos Pasos (Opcionales)

### 1. Pagos con Saldo en Bookings
En `BookingScreen.tsx`:
- Agregar opción "Pagar con Saldo"
- Validar balance suficiente
- Llamar a `deduct_wallet_balance()` al confirmar

### 2. Pantalla de Transacciones
- Nueva pantalla: `WalletTransactionsScreen.tsx`
- Mostrar historial completo
- Filtrar por tipo: Depósitos, Retiros, Pagos, Reembolsos

### 3. Recarga de Saldo
- Integrar pasarela de pagos (Stripe, PayPal)
- Agregar saldo con tarjeta de crédito
- Promociones: "Recarga $50k, lleva $60k"

### 4. Sistema de Transacciones de Booking
En `bookings` table o nueva tabla `booking_payments`:
- Registrar automáticamente pago de saldo
- Vincular con `wallet_transactions`
- Reembolsos automáticos en cancelación

## 📱 Archivos Modificados

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `src/store/useAppStore.ts` | Agregó `balance?: number` a AppUser interface | ~16 |
| `src/screens/LoginScreen.tsx` | Cargaba balance en email login | ~61-70, ~88-93 |
| `src/screens/LoginPhoneScreen.tsx` | Cargaba balance en phone OTP login | ~99-108, ~129-138 |
| `src/screens/HomeScreen.tsx` | Badge dinámico con colores y lógica | ~353-376 |

## 🗄️ Archivos SQL Creados

| Archivo | Propósito |
|---------|-----------|
| `WALLET_BALANCE_SETUP.sql` | Schema, índices, funciones PL/pgSQL |
| `WALLET_BALANCE_TEST_DATA.sql` | Actualizaciones de saldos de prueba |

## ✨ Características del Badge

```
┌─────────────────────────────────┐
│  [wallet] Saldo: $45.8k          │  Verde (Saludable)
│  [wallet] Saldo: $7.5k           │  Amarillo (Moderado)
│  [wallet] Saldo: $2.1k           │  Rojo (Crítico)
└─────────────────────────────────┘
```

- Recalcula en cada login
- Actualiza si se modifica balance en Zustand
- Color dinámico basado en threshold
- Formato legible (k para miles)

## 🔐 Seguridad

- Row Level Security (RLS) en `wallet_transactions`
- Usuarios solo ven sus propias transacciones
- `created_by` registra quién hizo la acción
- Validación en `deduct_wallet_balance()` (saldo insuficiente)
- Referential integrity con ON DELETE CASCADE

## 📝 Notas

- **Balance en centavos**: El monto se almacena en centavos (50000 = $500)
- **Sin decimales en display**: Mostrar como `$45.8k` es suficiente
- **Default balance**: 45800 centavos ($458) o según configuración
- **Transacciones inmutables**: Histórico completo never get deleted
