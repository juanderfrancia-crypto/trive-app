# Back-office web de Trive

Estado: **diseñado, no iniciado.** Se construye después de la prueba cerrada de la app móvil.

## Objetivo

Una web interna para operar el negocio: contabilidad, verificación, atención al cliente, operaciones, métricas e inteligencia de negocio. Conecta con los mismos datos de la app móvil, en la misma base de Supabase.

## Principios

- **Repositorio separado** de la app móvil (o carpeta independiente), para no mezclar permisos de empleados con la app de usuarios.
- **Sin confianza en el navegador.** La web solo tiene la clave pública y la sesión del empleado. Nunca tiene la clave de servicio.
- **Toda acción sensible pasa por una función del servidor** que vuelve a verificar el cargo del empleado.
- **MFA obligatorio** para todo el equipo.
- **Bitácora de auditoría** de cada acción interna en `admin_actions`.
- **Documentos con enlaces temporales** que vencen en minutos, con registro de cada apertura.
- **Métricas sin afectar la app:** vistas o agregados programados, no consultas pesadas sobre la base en vivo.

## Cargos y permisos

| Cargo | Puede | No puede |
|---|---|---|
| Contabilidad | Ver libro de movimientos, acreditar recargas, aprobar reembolsos, reportes | Ver documentos o chats |
| Verificación | Aprobar o rechazar documentos de conductores y vehículos, liberar placas | Tocar saldos |
| Atención al cliente | Atender tickets, incidencias y reportes de viajes; ver chats de soporte | Cambiar saldos o aprobar documentos |
| Operaciones | Ver viajes en curso, resolver disputas de confirmación y cancelaciones | Tocar saldos |
| Analítica | Métricas en solo lectura, sin datos personales completos | Cualquier escritura |
| Administrador general | Asignar cargos, ver toda la bitácora | — |

## Cambio necesario en la base

Hoy el permiso de administrador es `profiles.is_admin`. Se reemplaza por una **tabla de cargos de empleados**, donde cada persona tiene uno o más cargos y cada función valida el cargo específico. `profiles.is_admin` se elimina al final, cuando ya no lo use nadie.

## Orden de construcción

1. Tabla de cargos, MFA y bitácora de auditoría.
2. Verificación de conductores y vehículos.
3. Recargas y libro contable.
4. Atención al cliente: tickets, incidencias y disputas de confirmación.
5. Métricas y reportes.
6. Inteligencia de negocio, con un almacén de datos separado cuando el volumen lo justifique.

## Pendiente de decisión

- Tecnología de la web: React con Vite (recomendado) o Next.js.
- Lista de cargos definitiva y quién tiene cada uno.

## Decisión: la app móvil no tiene funciones de administración

La app que usan pasajeros y conductores **no contiene funciones de administración**. Todo lo que opera el negocio vive en el back-office web, incluidas la verificación de documentos y vehículos, las recargas y la atención de incidencias.

Consecuencias en el código actual (pendientes de retirar):
- `src/screens/AdminDocumentsScreen.tsx` y su ruta en la navegación.
- `src/components/AdminMenuButton.tsx` y el botón en el perfil.
- Las llamadas a `approve_document_admin`, `reject_document_admin`, `get_pending_documents_for_admin` y `get_processed_documents_for_admin` desde la app (`src/services/driverDocuments.ts`).
- Las escrituras a `admin_actions` desde la app (`src/services/driverDocuments.ts`).
- Las comprobaciones de `is_admin` en el cliente.

Mientras el back-office no exista, las acciones de administración se hacen **desde el SQL Editor de Supabase**, con las funciones de la base (`approve_document_admin`, `approve_vehicle`, `admin_credit_balance`). Esto es temporal y está documentado en `docs/PRUEBAS_Y_DESPLIEGUE.md`.

Orden propuesto: probar el flujo del conductor con aprobaciones por SQL, y después retirar las pantallas de administración de la app antes de la prueba cerrada.

**Motivo de la decisión (seguridad y buenas prácticas):**
- El código de administración viaja dentro del APK que descarga el público. Aunque la pantalla esté oculta, revela las funciones de administración y cómo se llaman.
- Los administradores no deberían usar el teléfono personal: un teléfono perdido con sesión abierta daría acceso a aprobar documentos o acreditar saldo.
- Separar el canal de los clientes del canal de los empleados hace posible auditar cada acción por persona, y reduce la superficie de ataque de la app pública.
- Quien aprueba documentos no debe ser el mismo canal que usa el conductor para trabajar.
