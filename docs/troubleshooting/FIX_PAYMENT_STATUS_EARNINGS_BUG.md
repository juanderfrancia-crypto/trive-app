# 🔧 FIX PAYMENT STATUS BUG - Guía Completa

## 🚨 El Problema

Tu base de datos tiene 107 bookings con `payment_status='cash'` cuando debería ser `'completed'`.

Esto causa que tu hook de ganancias vea **0 COP** aunque haya $100,000+ en la BD.

---

## 📊 Estado Actual (CONFIRMAR)

Ejecuta esto en Supabase SQL Editor:

```sql
SELECT 
  payment_status,
  payment_method,
  COUNT(*) as total,
  SUM(price) as total_amount
FROM bookings
GROUP BY payment_status, payment_method
ORDER BY total DESC;
```

**Resultado esperado:**
```
| payment_status | payment_method | total | total_amount |
|---|---|---|---|
| cash           | cash           | 107   | $X,XXX,XXX   | ← ESTOS SON EL PROBLEMA
| pending        | cash           | 12    | $X,XXX       | ← Y ESTOS TAMBIÉN
| completed      | null           | 6     | $X,XXX       | ← Estos falta payment_method
| expired        | card           | 19    | $X,XXX       | ← ESTADO INVÁLIDO
| refunded       | cash           | 3     | $X,XXX       | ← OK
| pending        | expired        | 1     | $XXX         | ← INVÁLIDO
```

---

## ✅ PASO A PASO: REPARACIÓN

### PASO 1: Backup (Seguridad)

```sql
-- Opcional pero recomendado
CREATE TABLE bookings_backup_before_fix AS SELECT * FROM bookings;
```

### PASO 2: EJECUTAR MIGRACIÓN

En Supabase SQL Editor, copia y ejecuta TODO el contenido de:
**`database/migrations/FIX_PAYMENT_STATUS_BUG_COMPLETE.sql`**

⚠️ **IMPORTANTE**: Ejecutar COMPLETO, no en partes.

Esto arreglará automáticamente:
- ✅ 107 `payment_status='cash'` → `'completed'` (si ruta está completed)
- ✅ 12 `payment_status='pending'` con cash → `'completed'` (si ruta completada)
- ✅ 19 `payment_status='expired'` → `'completed'` o `'refunded'`
- ✅ 1 `payment_method='pending'` → `'cash'`
- ✅ 6 `payment_method=null` → `'cash'`

### PASO 3: EJECUTAR TRIGGERS CORRECTOS

Después, copia y ejecuta TODO el contenido de:
**`database/triggers/PAYMENT_STATUS_CORRECT_TRIGGERS.sql`**

Esto previene que el bug vuelva a ocurrir.

### PASO 4: VERIFICAR RESULTADO

```sql
-- Ver estado final
SELECT 
  payment_status,
  payment_method,
  COUNT(*) as total,
  SUM(price) as total_amount
FROM bookings
GROUP BY payment_status, payment_method
ORDER BY payment_status;

-- Ver ganancias REALES
SELECT 
  COUNT(DISTINCT driver_id) as total_drivers,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_bookings,
  SUM(CASE WHEN payment_status = 'completed' THEN price ELSE 0 END) as total_earnings,
  SUM(CASE WHEN payment_status = 'pending' THEN price ELSE 0 END) as pending_earnings
FROM bookings;
```

**Resultado esperado después:**
```
| payment_status | payment_method | total |
|---|---|---|
| completed      | cash           | 107   | ← Ahora son muchos!
| completed      | card           | 6     |
| pending        | cash           | 12    | ← Aún pendientes
| pending        | card           | 19    | ← Esperando Wompi
| refunded       | cash           | 3     |
| refunded       | card           | 1     |
```

---

## 🧪 PASO 5: PROBAR EN LA APP

1. Abre la app
2. Ve a "Ganancias"
3. **Resultado esperado**: Ya NO debe decir 0 COP

---

## 📝 Estados de Pago Correctos (Memorizar)

### `payment_status` (Qué pasó con el DINERO)
- `pending` - Aún esperando confirmación/pago
- `completed` - Dinero está confirmado ✅
- `refunded` - Dinero devuelto ↩️

### `payment_method` (HOW fue pagado)
- `cash` - Dinero físico en mano
- `card` - Transferencia/tarjeta via Wompi
- `wallet` - Billetera interna (futuro)

### Combinaciones Válidas

| Escenario | payment_status | payment_method | Cuándo |
|---|---|---|---|
| Conductor va a recoger | `pending` | `cash` | Viaje confirmado, sin pagar |
| Pasajero paga en auto | `completed` | `cash` | Viaje terminó, dinero entregado |
| Pago por app (Card) | `pending` | `card` | En espera de Wompi |
| Pago confirmado por Wompi | `completed` | `card` | Wompi procesó el pago |
| Usuario cancela | `refunded` | `cash/card` | Cancelación confirmada |

---

## 🚀 PRÓXIMOS PASOS

Después de arreglar esto:

1. ✅ Validar ganancias en app
2. 🔧 Implementar Wompi para `payment_method='card'`
3. 📱 Crear flow de confirmación manual para Cash
4. 💾 Implementar sistema de confirmación de pago en ruta completada

---

## ⚠️ SI ALGO SALE MAL

Si ejecutas la migración y algo no funciona:

1. Ejecuta: `ROLLBACK;` (si aún no has hecho commit)
2. Restaura desde backup: `DROP TABLE bookings; DROP TABLE bookings_backup_before_fix; ALTER TABLE bookings_backup_before_fix RENAME TO bookings;`
3. Contacta al equipo técnico con los logs

---

## 📞 Soporte

Si necesitas ayuda:
- Ejecutar: `SELECT * FROM payment_status_changelog ORDER BY created_at DESC LIMIT 20;` para ver qué cambió
- Preguntar: "¿Qué error veo en Supabase?"
