# Informe Ejecutivo de Cambios — Trive App
**Fecha:** 12 de mayo de 2026
**Rama:** master

---

## 1. Correcciones de Contenido e Identidad de Marca

- **Nombre legal actualizado** en todas las pantallas legales: `Trive Mobility Colombia SAS` → `Trive Technologies SAS` (`TermsOfServiceScreen`, `PrivacyPolicyScreen`).
- **Datos de contacto reales** en `AboutTriveScreen`: email `privacy@trive.co`, teléfono `+57 300 577 2967`.
- **Términos de servicio y FAQ** actualizados para reflejar el modelo real de negocio: deducción de $2.000 de billetera por ruta publicada, métodos de pago Nequi/Daviplata/efectivo (reemplazando referencias incorrectas a comisión del 2%).

**Archivos modificados:**
- `src/screens/TermsOfServiceScreen.tsx`
- `src/screens/PrivacyPolicyScreen.tsx`
- `src/screens/AboutTriveScreen.tsx`
- `src/screens/HelpScreen.tsx`
- `src/screens/LearningCenterScreen.tsx`

---

## 2. Integración Pasarela de Pagos Wompi

Integración completa lista para conectar credenciales de producción.

### Edge Functions (Supabase Deno)

- **`create-wompi-transaction`**: recibe monto desde la app, genera referencia UUID única, calcula firma SHA256 de integridad, inserta transacción pendiente en BD y retorna URL de checkout de Wompi.
- **`wompi-webhook`**: recibe eventos de Wompi, verifica firma HMAC-SHA256, previene duplicados con chequeo de idempotencia, acredita saldo en billetera vía RPC `increment_wallet_balance` al aprobar el pago.

### Base de datos

- **Migración `20260512_wompi.sql`**: tabla `wallet_transactions` (id, user_id, amount, type, wompi_reference, wompi_transaction_id, status, created_at) + función atómica `increment_wallet_balance` para evitar condiciones de carrera en el saldo.

### UI — WalletScreen

- Selector de montos rápidos: $5.000 / $10.000 / $20.000 / $50.000.
- Apertura del checkout Wompi en navegador integrado (`expo-web-browser`).
- Polling automático de saldo cada 2 segundos (máx. 8 intentos) tras retornar del pago.
- Historial de transacciones con badges de estado (aprobado / pendiente / rechazado).

### Variables de entorno requeridas (pendiente configurar en Supabase)

| Variable | Descripción |
|---|---|
| `WOMPI_PUBLIC_KEY` | Llave pública del comercio |
| `WOMPI_INTEGRITY_SECRET` | Secreto para firma de integridad del checkout |
| `WOMPI_EVENTS_SECRET` | Secreto para verificación de eventos webhook |
| `WOMPI_REDIRECT_URL` | URL de retorno después del pago |

**Archivos creados:**
- `supabase/functions/create-wompi-transaction/index.ts`
- `supabase/functions/wompi-webhook/index.ts`
- `supabase/migrations/20260512_wompi.sql`
- `src/screens/WalletScreen.tsx` (reescrito)

---

## 3. Panel de Administración de Documentos

### AdminMenuButton

- Botón hamburguesa (☰) visible solo para usuarios con `is_admin = true`.
- Badge rojo en tiempo real con el conteo de documentos pendientes, actualizado vía Supabase Realtime (`postgres_changes` en tabla `driver_documents`).

### AdminDocumentsScreen

Pantalla rediseñada con dos pestañas:

**Pestaña Pendientes**
- Lista de documentos esperando verificación del admin.
- Visor de imágenes inline con modal de acciones.
- Soporte para PDF: abre en navegador externo a pantalla completa antes de mostrar opciones.
- Acciones: **Aprobar** (con fecha de vencimiento opcional) y **Rechazar** (con motivo obligatorio).
- Actualización optimista: al aprobar/rechazar, el documento se mueve al historial sin recargar.

**Pestaña Historial**
- Documentos ya procesados (verificados / rechazados / vencidos).
- Carga lazy al primer acceso (no recarga en cada cambio de pestaña).
- Muestra: tipo de documento, nombre del conductor, estado con badge de color, fecha de procesamiento, fecha de vencimiento, motivo de rechazo.

### Base de datos

- **Migración `20260513_admin_history.sql`**: función `get_processed_documents_for_admin()` con `SECURITY DEFINER` para bypass de RLS, restringida a usuarios con rol `support`, retorna los últimos 100 documentos procesados ordenados por fecha.

**Archivos modificados/creados:**
- `src/components/AdminMenuButton.tsx` (reescrito)
- `src/screens/AdminDocumentsScreen.tsx` (reescrito)
- `src/services/driverDocuments.ts` (agregadas `getPendingDocumentsCount`, `getProcessedDocumentsForAdmin`)
- `supabase/migrations/20260513_admin_history.sql`

---

## 4. Pantalla de Documentos del Conductor

- **Bug "Desconocido"**: `getStatusInfo()` no tenía caso para el estado `expired`, caía al `default` mostrando "Desconocido". Corregido con caso explícito: ícono `alert-circle`, color rojo, label "Vencido".
- **Botón de subida**: ahora se muestra para estados `pending`, `rejected` y `expired` (antes solo para los dos primeros).
- **Badge de vencimiento**: ahora se muestra correctamente para documentos `verified` y `expired`.

**Archivos modificados:**
- `src/screens/DriverDocumentsScreen.tsx`

---

## 5. Perfil del Conductor — Sección Mi Vehículo

- **Botón Editar**: añadido dentro de la card del vehículo en posición absoluta (esquina inferior derecha), con ícono de lápiz y fondo sutil del color primario.
- **Bug de año y color vacíos**: el `SELECT` en `loadDriverData` omitía los campos `vehicle_year` y `vehicle_color`. Corregido para que el formulario de edición los pre-rellene correctamente.
- **Visualización completa**: la card ahora muestra marca, placa, año y color del vehículo.

**Archivos modificados:**
- `src/screens/ProfileScreen.tsx`

---

## 6. Corrección de Autenticación — Cierre de Sesión

**Problema:** al presionar "Cerrar Sesión", aparecía el alert de "Sesión expirada, tu sesión expiró o fue cerrada desde otro dispositivo".

**Causa raíz:** `AppNavigator` y `ProfileScreen` instancian `useAuth()` de forma independiente, creando dos suscripciones a `onAuthStateChange`. Al hacer logout:
1. El primer callback veía `_manualLogout = true` → no mostraba alert → reseteaba `_manualLogout = false`.
2. El segundo callback veía `_manualLogout = false` → mostraba el alert de sesión expirada incorrectamente.

**Solución:** reemplazar el reset inmediato `_manualLogout = false` por `setTimeout(() => { _manualLogout = false }, 0)`, asegurando que todos los callbacks activos lean el flag antes de que se resetee.

**Archivos modificados:**
- `src/hooks/useAuth.ts`

---

## 7. Saludo Personalizado en HomeScreen

- El saludo ahora muestra las primeras **dos palabras** del nombre del usuario en lugar de solo la primera.
- Ejemplos: `"Jhan"` → `"Jhan"` · `"Jhan Sanchez"` → `"Jhan Sanchez"` · `"Jhan Carlos Sanchez Banguero"` → `"Jhan Carlos"`.

**Archivos modificados:**
- `src/screens/HomeScreen.tsx`

---

## Resumen de Pendientes en Producción

| # | Tarea | Estado |
|---|---|---|
| 1 | Ejecutar migración `20260512_wompi.sql` en Supabase SQL Editor | Pendiente |
| 2 | Ejecutar migración `20260513_admin_history.sql` en Supabase SQL Editor | Pendiente |
| 3 | Desplegar Edge Function `create-wompi-transaction` | Pendiente |
| 4 | Desplegar Edge Function `wompi-webhook` | Pendiente |
| 5 | Agregar secrets de Wompi en Supabase Dashboard | Pendiente |
| 6 | Configurar URL del webhook en el dashboard de Wompi | Pendiente |
