# Estado actual de Trive

Fuente de verdad del proyecto. Se actualiza al cerrar cada cambio importante.
Última actualización: 2026-10-03.

---

## 1. Qué es Trive

App móvil (Expo / React Native, Android primero) para **viajes compartidos en Colombia**, con foco en rutas Puerto Tejada (Cauca) ↔ Cali y viajes al aeropuerto.

Digitaliza al **despachador**: la persona que, cuando un carro se llena, llama a los pasajeros y cobra alrededor de $2.000 por cupo. Hoy ese mercado es informal.

### Modelo de negocio (confirmado por el dueño)
- Pasajero y conductor pagan **entre ellos** (efectivo, Nequi, Daviplata). Trive **no procesa pagos de viaje**.
- Trive cobra solo:
  - **$2.000** por publicar una ruta, descontados del saldo Trive del conductor.
  - **$5.000** cuando el conductor acepta una solicitud de viaje particular o al aeropuerto.
- El saldo se carga por **recarga manual** (el conductor transfiere y un admin lo acredita).
- **Wompi** queda para cuando se decida cobrar en línea. No hay cuenta de Wompi todavía.

## 2. Usuarios y flujos

- **Conductor:** se registra, sube documentos (cédula, licencia, SOAT) y un admin los verifica. Publica rutas con hora y precio por cupo. Puede aceptar solicitudes de aeropuerto.
- **Pasajero:** busca "Cupos Hoy" y reserva asiento. Si no encuentra, crea una solicitud de viaje particular o al aeropuerto; los conductores hacen ofertas y se negocia por chat.
- **Seguridad:** botón SOS que abre WhatsApp con la ubicación para un contacto de emergencia.
- **Un mismo usuario** puede cambiar entre modo conductor y modo pasajero.

## 3. Infraestructura

| Componente | Valor |
|---|---|
| Backend | Supabase, proyecto `trive` (`iksenkkaxlmdiyeezoym`), región us-east-1, PostgreSQL 17 |
| Autenticación | Supabase Auth (teléfono y email) |
| Edge Functions | `notify-message` y `check-document-expiry` desplegadas. `create-wompi-transaction` y `wompi-webhook` existen en el repo pero **no están desplegadas** (Wompi pendiente) |
| Push | Expo Push (ver problema abierto P3) |
| Crashes | Firebase Crashlytics |
| Build | EAS (`eas.json`): `preview` APK, `production` AAB |
| Tienda | Google Play Console creada; pendiente de prueba cerrada |

## 4. Verificado en producción

Comprobado el 2026-10-03 con el CLI y consultas de solo lectura:

- Tabla `wallet_transactions` existe (migración de Wompi aplicada manualmente por el dueño).
- Todas las tablas que usa la app existen, excepto `error_logs`, que solo aparece como comentario TODO y no se llama.
- Todas las funciones RPC que usa la app existen, excepto `increment_balance` (ver P5).
- Columnas `referral_code`, `referred_by`, `emergency_contact` y `preferred_municipality` existen en `profiles`.
- Las 8 migraciones de `supabase/migrations/` tienen sus objetos creados en producción, pero **el historial de migraciones de Supabase está vacío** (ver P1).
- El proyecto está enlazado al CLI localmente.

## 5. Cambios hechos (en git)

- Migraciones renombradas a identificadores únicos, para que el CLI las reconozca:
  - `20260512_profile_trigger.sql` → `20260512100000_profile_trigger.sql`
  - `20260512_wompi.sql` → `20260512110000_wompi.sql`
  - `20260513_admin_history.sql` → `20260513100000_admin_history.sql`
  - `20260520_airport_requests.sql` → `20260520100000_airport_requests.sql`
  - `20260520_referrals.sql` → `20260520110000_referrals.sql`
  - `20260521_emergency_contact.sql` → `20260521100000_emergency_contact.sql`
  - `20260521_preferred_municipality.sql` → `20260521110000_preferred_municipality.sql`
  - `20260521_route_templates.sql` → `20260521120000_route_templates.sql`
- Corregido un error de sintaxis en la migración de Wompi (un texto sobrante en la línea del índice `idx_wallet_transactions_reference`).
- `supabase/.temp/` excluido de git (estado local del CLI).
- `ErrorBoundary` agregado en `App.tsx`: un error de render muestra una pantalla de reintento en vez de cerrar la app.

## 5.1 Auditoría de seguridad de producción (2026-10-03, solo lectura)

Datos reales ya existen: 13 perfiles, 220 reservas, 118 rutas, 82 notificaciones y 27 sesiones.

Verificado con la clave pública (`anon`) que viene dentro de la app:

| Tabla | RLS | Lo que expone hoy |
|---|---|---|
| `profiles` | activo | Lectura pública (`Anyone can view all profiles`): emails, teléfonos, saldos, roles |
| `bookings` | activo | Lectura pública (`read_all_bookings`, `true`): 220 reservas |
| `notifications` | **desactivado** | 82 notificaciones legibles y escribibles |
| `user_sessions` | **desactivado** | 27 sesiones legibles y escribibles |
| `trip_preferences`, `travel_preferences`, `rating_snapshots` | **desactivado** | sin datos hoy, pero abiertas |
| `earnings_transactions` | activo | `INSERT` con `check = true` para `public`: cualquier usuario puede insertar ganancias |

Políticas que permiten abuso por parte de usuarios autenticados:
- `bookings.update_own_booking`: el pasajero puede cambiar cualquier columna de su reserva (estado y pago).
- `profiles`: el rol `authenticated` puede escribir `balance`, `is_admin`, `role`, `driver_verified`, `rating` y `membership_*`.
- Las comprobaciones de administrador leen `profiles.is_admin`, que el usuario puede cambiar a sí mismo.

Dependencias del cliente que hay que respetar al cerrar esto:
- Tarjetas de viajes y chats muestran nombre y foto de la contraparte (`profiles!passenger_id(...)`, `profiles!driver_id(...)`, 16 sitios).
- El panel del conductor muestra teléfono y email del pasajero (`DriverPanelScreen`, línea 113).
- Los descuentos de saldo, el crédito de referidos y el cambio de rol se hacen hoy desde el cliente.

## 6. Problemas abiertos

Estos son los que hay que resolver antes de la prueba cerrada en Play Console.

- **P1 · Historial de migraciones vacío.** Hay que marcar las 8 migraciones como aplicadas en el historial remoto antes de cualquier `db push`. Requiere aprobación explícita, porque escribe en producción.
- **P2 · Seguridad de datos (crítico, ver sección 5.1).** Datos personales y de reservas son legibles por cualquiera con la clave pública, y los usuarios pueden escribir saldo, rol y administración. Cerrarlo exige cambios en base de datos y en el cliente, en el mismo paso.
- **P3 · `projectId` de EAS inconsistente.** Hay tres valores: `17d0b706…` en `app.json`, `e96c93aa…` en `src/services/pushNotifications.ts` y `e77b81ed…` en la documentación. Hay que confirmar cuál es el proyecto real en expo.dev.
- **P4 · Borrado de cuenta incompleto.** `PrivacyScreen` solo cancela reservas y rutas y cierra sesión. Google Play exige eliminar la cuenta y sus datos, y tener una URL pública para solicitarlo.
- **P5 · Referidos.** El crédito de $2.000 al referidor se escribe desde el cliente del conductor nuevo y RLS lo bloquea en silencio. `increment_balance` no existe; el fallback del cliente sí funciona para el bono de $1.000.
- **P6 · Calificaciones.** `src/services/reviews.ts` intenta escribir el `rating` de otro usuario, lo que RLS bloquea. Hoy el promedio de calificaciones no se actualiza.
- **P7 · `eas.json` sin `autoIncrement`** en el perfil `production`. La segunda subida a Play puede ser rechazada por `versionCode` repetido.
- **P8 · Duplicación.** Hay dos archivos de tema con colores distintos (`src/theme/colors.ts` y `src/theme/theme.ts`), tres pantallas de solicitudes de aeropuerto con lógica parecida, y scripts repetidos en `database/`.
- **P9 · Calidad.** 22 `catch` vacíos, ~119 `console.log`/`TODO` en `src/`, y pantallas muy grandes (Perfil 1.764 líneas, Panel del conductor 1.613, Registro de conductor 1.546, Inicio 1.513).

## 7. Reglas de trabajo

- No se lanza ningún `eas build` sin confirmación del dueño.
- No se escribe en producción (base de datos, funciones, historial) sin aprobación explícita de la acción concreta.
- Los cambios de base de datos viven en `supabase/migrations/` con nombre `AAAAMMDDHHMMSS_descripcion.sql`, y se aplican con `npx supabase db push` después de revisar `--dry-run`.
- Cada cambio relevante se commitea con un mensaje claro y se registra aquí.
- Documentación antigua en `docs/archive/` y `docs/deployment/`: no es fuente de verdad. Lo que dice este archivo prevalece.
