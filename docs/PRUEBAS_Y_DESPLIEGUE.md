# Pruebas y despliegue de Trive

Procedimiento paso a paso. Lo que hace el equipo de desarrollo está marcado como **[Código]**.
Lo que haces tú, en tu cuenta de Supabase, Expo o Play Console, está marcado como **[Manual]**.

Última actualización: 2026-10-03.

---

## 1. Estado de partida

| Pieza | Estado |
|---|---|
| Fase 2a (RPC y privilegios de administrador) | Aplicada en producción y verificada |
| Fases 2b1 a 2h (dinero, viajes, chat, privacidad, cuenta, identidad, recarga) | Escritas y probadas en el Postgres de validación (72/72). **Pendientes de aplicar** |
| Cliente (app móvil) | Actualizado y con chequeo de tipos limpio. **Pendiente de compilar y probar en dispositivo** |
| Política de privacidad y eliminación de cuenta | Escritas en `docs/publico/`. **Pendientes de publicar y de revisión legal** |

---

## 2. Antes de aplicar nada

1. **[Manual] Respaldo de la base de datos.** En la terminal de VS Code, desde la carpeta del proyecto:

       npx supabase db dump --linked -f ../respaldo_antes_fase2.sql

   Guarda el archivo fuera del repositorio. Si algo sale mal, es tu punto de regreso.

2. **[Código] Pruebas offline.** Verifican las migraciones en un Postgres real:

       cd supabase/tests/offline
       npm install
       npm test

   Debe decir `Total: 72  pasan: 72  fallan: 0`. Si no, no sigas.

3. **[Manual] Verificar dos supuestos contra producción.** Ejecuta en el SQL Editor:

       SELECT indexdef FROM pg_indexes
       WHERE tablename = 'bookings' AND indexdef ILIKE '%seat_number%';

   La prueba asume que el índice de asientos es **único y excluye las reservas canceladas**
   (`WHERE booking_status <> 'cancelled'`). Si el resultado no coincide, pásame el resultado antes de aplicar.

---

## 3. Aplicar las migraciones en producción

**Orden obligatorio.** Cada archivo se pega completo en el SQL Editor de Supabase y se ejecuta una vez.
La fase 2a ya está aplicada; empieza por la 2b1.

| # | Archivo |
|---|---|
| 1 | `supabase/migrations/20261003140000_security_phase2b1_money_core.sql` |
| 2 | `supabase/migrations/20261003150000_security_phase2b2_airport_flow.sql` |
| 3 | `supabase/migrations/20261003160000_security_phase2c_chat_threads.sql` |
| 4 | `supabase/migrations/20261003170000_security_phase2d_route_trips.sql` |
| 5 | `supabase/migrations/20261003180000_security_phase2e_profiles_privacy.sql` |
| 6 | `supabase/migrations/20261003190000_security_phase2f_account_deletion.sql` |
| 7 | `supabase/migrations/20261003200000_security_phase2g_driver_identity.sql` |
| 8 | `supabase/migrations/20261003210000_security_phase2h_admin_recharge.sql` |

Después de cada uno, el SQL Editor debe responder "Success". Si alguno falla, **para**, copia el mensaje de error y pásamelo.

**Importante:** la base queda con los permisos nuevos desde el paso 1. La app anterior (la que tienen
instalada los testers, si la hubiera) dejará de poder publicar, reservar o aceptar. Por eso el paso 3
de este documento debe hacerse junto con el APK nuevo, sin dejar la base a medio camino.

---

## 4. Configuración que haces tú (una sola vez)

1. **[Manual] Desplegar las funciones Edge.**

       npx supabase functions deploy delete-account
       npx supabase functions deploy send-push --no-verify-jwt

2. **[Manual] Crear el secreto del webhook.** Elige una cadena larga y aleatoria (por ejemplo 40 caracteres):

       npx supabase secrets set WEBHOOK_SECRET=PON_AQUI_LA_CADENA_LARGA

   Guárdala; la necesitas en el paso siguiente.

3. **[Manual] Webhook de notificaciones.** En el dashboard de Supabase: *Database → Webhooks → Create a new hook*.
   - Tabla: `notifications`, evento: `INSERT`.
   - Tipo: HTTP Request, método `POST`.
   - URL: `https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/send-push`
   - Encabezado: `x-webhook-secret` con el valor del paso 2.

   Esto envía el push al teléfono cuando el servidor crea una notificación (confirmar viaje, calificar, recarga).

4. **[Manual] Cierre automático de viajes a las 24 horas.** En el SQL Editor:

       CREATE EXTENSION IF NOT EXISTS pg_cron;
       SELECT cron.schedule('auto-confirm-trips', '*/15 * * * *', $$SELECT public.auto_confirm_expired_trips()$$);

   Si `CREATE EXTENSION` falla, actívala primero en *Database → Extensions* y repite.

5. **[Manual] Revisar el bucket de documentos.** En *Storage*, el bucket `driver-documents` debe estar en
   **privado** (sin "Public"). Si está público, los documentos de identidad son accesibles por cualquiera con el enlace.

6. **[Manual] Crear los administradores.** Solo el panel de Supabase puede marcar `is_admin`:

       UPDATE profiles SET is_admin = true WHERE id = 'UUID_DEL_ADMIN';

7. **[Manual] Aprobar conductores y vehículos mientras no existe el back-office.**
   - Documentos: pantalla de administración de la app (ya existe).
   - Vehículos: en el SQL Editor, con el id del vehículo pendiente:

         SELECT id, driver_id, plate, status FROM vehicles WHERE status = 'pending';
         SELECT public.approve_vehicle('ID_DEL_VEHICULO');

8. **[Manual] Recargas de saldo.** Un conductor transfiere (Nequi o Daviplata) y tú lo acreditas con:

       SELECT public.admin_credit_balance('UUID_DEL_CONDUCTOR', 50000, 'Nequi comprobante 12345');

   La nota es obligatoria y queda en la bitácora. Solo funciona con un usuario marcado como administrador.

---

## 5. Compilación y tiendas

1. **[Código] Corregir el `projectId` de EAS.** Hoy hay tres valores distintos. Antes del build hay que
   confirmar el correcto en expo.dev (proyecto `trive-app`) y unificarlo en `app.json` y en
   `src/services/pushNotifications.ts`. **Pídeme que lo haga cuando me confirmes el valor.**

2. **[Código] Incremento automático de versión.** Agregar `"autoIncrement": true` al perfil `production` de `eas.json`.

3. **[Manual] Build.** Lo lanzas tú, cuando digas. No lo hago sin tu confirmación.

       eas build --profile production --platform android

4. **[Manual] Publicar las páginas legales.** Sube la carpeta `docs/publico/` a GitHub Pages (o a cualquier
   hosting estático). Quedan dos URL:
   - Política de privacidad: `.../privacidad.html`
   - Eliminación de cuenta: `.../eliminar-cuenta.html`

   Antes, completa los campos marcados en amarillo: razón social, NIT, correo de contacto y plazo de conservación de documentos.
   **Revísalo con un abogado.** Los textos describen lo que la app hace, pero la decisión de plazos es tuya.

5. **[Manual] Play Console.** Completa, en este orden:
   - *Política de privacidad*: la URL del paso 4.
   - *Eliminación de cuenta*: la URL `eliminar-cuenta.html`.
   - *Seguridad de datos*: declara teléfono, nombre, correo, fotos, documentos de identidad, ubicación (solo cuando la usan), mensajes y datos de dispositivo.
   - *Acceso a la app*: deja una cuenta de prueba de pasajero y una de conductor con instrucciones. Sin esto Google no puede revisar la app.
   - *Pruebas cerradas*: sube el AAB y agrega al menos 12 testers. La prueba debe durar 14 días seguidos antes de pedir producción.

---

## 6. Pruebas en dispositivo con dos cuentas

Necesitas dos teléfonos o dos cuentas: un **pasajero** y un **conductor verificado** con vehículo aprobado.
Marca cada punto cuando funcione. Si alguno falla, anota la pantalla y el mensaje.

**Conductor**
- [ ] Registra su cédula y la guarda. Intenta guardar otra vez: la app debe bloquearlo.
- [ ] Sube la tarjeta de propiedad, SOAT, licencia y técnico-mecánica.
- [ ] Registra un vehículo: queda en revisión. No puede publicar hasta que lo apruebes.
- [ ] Con saldo menor a $2.000, al publicar ve el mensaje de saldo insuficiente.
- [ ] Con saldo suficiente, publica una ruta: se descuentan $2.000 y la ruta aparece en la búsqueda.
- [ ] Inicia el viaje y luego lo marca como completado.
- [ ] Acepta una solicitud de aeropuerto directa: se descuentan $5.000.
- [ ] Hace una contrapropuesta; cuando el pasajero la acepta, se descuentan $5.000.
- [ ] Chatea con el pasajero en su hilo, con la oferta aceptada.

**Pasajero**
- [ ] Busca viajes, selecciona asiento, elige punto de desembarque y confirma.
- [ ] Ve los asientos ocupados por otros, sin ver sus nombres.
- [ ] Cancela una reserva antes de la salida.
- [ ] Recibe la notificación "¿Llegaste bien?" y confirma con "Sí, llegué".
- [ ] Reporta "Hubo un problema" en otro viaje; el viaje queda en disputa.
- [ ] Califica al conductor una vez; intentar calificar de nuevo debe bloquearse.
- [ ] Crea una solicitud de aeropuerto, recibe ofertas, rechaza una y acepta otra.
- [ ] Cancela una solicitud ya aceptada: el conductor recupera $5.000.
- [ ] Desde Perfil → Privacidad, elimina la cuenta. Luego intenta entrar: debe fallar.

**Seguridad (con las dos cuentas)**
- [ ] Un tercer usuario no ve el perfil ni las reservas de los dos anteriores.
- [ ] Un usuario sin sesión no puede leer datos de la base.

---

## 7. Pendientes que quedan fuera de esta versión

Son decisiones o trabajos que no puedo cerrar desde el código.

- **Datos visibles entre personas con relación.** Quien tiene una reserva o una solicitud en común con otro
  puede ver su nombre, teléfono, correo y saldo. Cerrar esto por columnas exige cambiar las consultas de la app.
  Recomendación: una vista pública con nombre, foto y calificación, y el teléfono solo en la reserva confirmada.
- **Back-office web.** Mientras no exista, las aprobaciones de vehículos y las recargas son manuales (pasos 7 y 8).
- **Plazo de conservación de documentos de conductor.** Es una decisión legal tuya.
- **Funciones de producción no versionadas.** `get_pending_documents_for_admin` y `get_processed_documents_for_admin`
  existen en producción y validan administrador, pero no están en el repositorio. Conviene versionarlas.
