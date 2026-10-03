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
