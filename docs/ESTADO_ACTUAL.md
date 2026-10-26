# Estado actual de Trive

Fuente de verdad del proyecto. Se actualiza al cerrar cada cambio importante.
Última actualización: 2026-10-26.

---

## -7. Capacidad técnica vs. demanda real de Puerto Tejada — pendiente, no ejecutado (2026-10-26)

No es un bug ni un cambio de código — es un análisis de capacidad hecho a pedido del dueño, con hallazgos que quedan como trabajo técnico pendiente antes de abrir más allá de la prueba cerrada.

**Contexto real (dato del dueño, no supuesto):** Puerto Tejada↔Cali ya tiene una operación de transporte informal ("pirata") diaria, de tiempo completo, con un piso de ~300 conductores × 4 puestos, de 4am a medianoche, lunes a sábado — Trive digitaliza una demanda que ya existe y se mueve todos los días, no una que hay que crear desde cero. Con un rango estimado de 4-8 ciclos/conductor/día (dato a confirmar con el dueño, que conoce la operación real), eso da entre ~124.000 y ~249.000 movimientos de pasajero al mes solo en ese corredor — sin contar los otros municipios cercanos (Padilla, Guachené, Villa Rica, Santander de Quilichao, ~230.000 habitantes combinados).

**Población del corredor (proyecciones DANE 2026, vía fuente intermediaria, no censo nuevo):** Puerto Tejada 43.709 · Villa Rica 23.909 · Guachené 20.437 · Padilla 10.622 · Santander de Quilichao 130.768.

**Hallazgos de capacidad técnica (contra el plan Free de Supabase, que es el que está activo hoy):**
- Auth (50.000 MAU) y almacenamiento (500 MB) alcanzan de sobra para el piloto en Puerto Tejada.
- **El riesgo real es el patrón de notificaciones**: `notify_passengers_new_route` (el trigger de "nueva ruta publicada") inserta una notificación —y por lo tanto dispara una invocación de la función `send-push`— **por cada pasajero cuyo municipio coincide, una por una, no en lote**. Con el volumen real de la operación pirata (cientos de conductores publicando varias veces al día) y cientos/miles de pasajeros con el mismo municipio configurado, esto puede agotar el tope gratuito de 500.000 invocaciones/mes de Supabase mucho antes de lo esperado — potencialmente dentro del mismo piloto si se captura una fracción real de esa demanda, no solo "si la app crece mucho a futuro".
- El plan Free no tiene cobro por exceso: si se choca contra cualquier tope, el proyecto empieza a fallar (escrituras/funciones bloqueadas), no cobra de más.

**Pendiente, en orden de prioridad:**
1. **Confirmar con el dueño cuántos ciclos/vueltas hace en promedio un conductor pirata al día** — es el dato que más cambia la proyección de volumen real.
2. **Agrupar/enviar en lote la función `send-push`** en vez de una invocación por pasajero por cada ruta publicada — esto es lo que más baja el riesgo real de agotar el tope gratuito.
3. **Subir a Supabase Pro (~USD 25/mes)** antes de abrir más allá de la prueba cerrada — no es opcional dado el volumen real de la operación que se está digitalizando, es la diferencia entre una caída real de la app y margen de seguridad.

**Cómo aplicar:** no ejecutar nada de esto sin confirmación explícita del dueño — queda documentado como trabajo pendiente, no como tarea en curso.

## -6. Sesión se cerraba sola de vez en cuando — causa identificada y corregida (2026-10-26)

Una usuaria reportó que la app a veces la mandaba al login sin haber cerrado sesión — cada vez que pasa, gasta un OTP nuevo de Twilio sin necesidad.

**Causa identificada:** `SecureStoreAdapter` en `src/services/supabase.ts` parte la sesión en varios "trozos" (SecureStore limita cada valor a 2048 bytes) y los escribía uno por uno, **sobrescribiendo en el mismo lugar cada vez**, sin ninguna protección si la escritura se interrumpe a mitad de camino. Eso pasa de forma predecible: `autoRefreshToken` renueva el token en segundo plano cada cierto tiempo sin que el usuario haga nada, y si Android mata la app justo en ese momento (común bajo presión de memoria), el trozo que se alcanzó a escribir queda mezclado con trozos viejos de la escritura anterior — una sesión corrupta. La próxima vez que la app intenta usarla, Supabase la rechaza como "Refresh Token" inválido, y `useAuth.ts:149-155` ya tenía código que ante ese error específico hace `signOut()` **en silencio** (sin alertar al usuario) — encaja exactamente con el síntoma reportado.

**Corregido:** esquema A/B (doble espacio). Cada escritura nueva va completa a un espacio aparte (el que no está activo en ese momento), y solo al final se cambia un único valor (`__active`) que dice cuál espacio usar. Si la app se cierra a mitad de la escritura, el espacio activo anterior — completo y válido — nunca se toca, así que la sesión sigue funcionando normal. Se mantiene compatibilidad hacia atrás: si un dispositivo todavía tiene una sesión guardada con el formato viejo (sin `__active`), se sigue leyendo igual, sin forzar un logout por este mismo cambio.

**Confianza del diagnóstico:** alta, pero no confirmada con telemetría en vivo (no se puede reproducir sin tener el bug en curso en un teléfono real). Es la causa estructural más plausible encontrada en el código, no una suposición al aire — si después del próximo build el problema sigue, hay que revisar otras causas (ej. configuración de rotación de refresh token en el dashboard de Supabase, o reinicios del Keystore de Android).

**Pendiente:** build de producción nuevo con este fix (no lanzado todavía).

## -5. Notificaciones push nunca llegan — diagnóstico confirmado, falta el build para ver la causa exacta (2026-10-23/24)

El dueño reportó que ningún tester recibe notificaciones push, pese a haber reservado cupo, cancelado, publicado ruta e iniciado viaje. Diagnóstico hecho con datos reales de producción (solo lectura, sin tocar nada):

**Confirmado con evidencia, no es sospecha:**
- Consulta a `profiles`: **ningún tester real de la prueba cerrada tiene `push_token` guardado.** Solo cuentas viejas de pruebas de antes del cambio de paquete (`com.trivesoft.app`) lo tienen.
- Consulta a `net._http_response` (donde `pg_net` guarda cada respuesta HTTP que dispara el trigger de `notifications`): para los usuarios sin token, `send-push` responde `{"skipped":"sin token de push"}` (correcto, no hay nada que mandar). Para los que sí tienen token (cuentas viejas), responde `{"ok":true}` — **Expo acepta el envío sin problema.**
- Conclusión: el trigger de base de datos, la función `send-push` y la API de Expo **funcionan bien**. El 100% del problema es que el teléfono nunca logra guardar el `push_token` en el perfil — `getPushNotificationToken()` en `src/services/pushNotifications.ts` tenía un `catch` vacío que se tragaba el error real en silencio, así que era imposible saber por qué sin verlo en vivo.

**Ya corregido (instrumentación, no la causa final todavía):**
- Migración `20261023100000_push_token_debug.sql`: agrega `profiles.push_token_debug` y `push_token_debug_at` (temporal, se puede quitar una vez resuelto el bug real).
- `src/services/pushNotifications.ts`: cada salida de `getPushNotificationToken()` y `registerPushToken()` (éxito o cualquier tipo de fallo: permiso denegado, plataforma no disponible, error de Expo, error al guardar) ahora escribe la razón real en esa columna, en vez de fallar en silencio.
- `src/hooks/useAuth.ts` y `src/screens/SettingsScreen.tsx`: actualizados para pasar el `userId` que la nueva instrumentación necesita.

**Pendiente — esto es lo que falta para cerrar el tema:**
1. Lanzar un build de producción nuevo con este código (el diagnóstico no sirve de nada hasta que esté instalado en un teléfono real).
2. Que alguien (el dueño o cualquier tester) abra la app una vez con ese build nuevo — el registro del token se intenta automáticamente al iniciar sesión (`useAuth.ts`), no hace falta ninguna acción especial.
3. Consultar `profiles.push_token_debug` después de eso — ahí va a estar la razón exacta (no es necesario adivinar: puede ser permiso de notificaciones negado, un problema de `google-services.json`/FCM con el paquete nuevo, o algo de la librería `expo-notifications`).
4. Una vez se sepa la causa real, aplicar el fix correspondiente (que todavía no se conoce, no asumir cuál es).

**Cómo aplicar:** al retomar, lo primero es preguntar si ya se hizo el build y se abrió la app en algún teléfono — si sí, consultar `push_token_debug` antes de proponer nada, ahí probablemente ya está la respuesta. No repetir el diagnóstico de arriba, ya está confirmado.

## -4. Bugs reportados por testers de la prueba cerrada (2026-10-21)

## -4. Bugs reportados por testers de la prueba cerrada (2026-10-21)

El dueño reportó varios problemas (con capturas) encontrados por los testers reales. Causa raíz confirmada contra el código para cada uno, no solo el síntoma:

- **Splash duplicado al abrir la app**: `app.json` tenía el splash configurado dos veces (la clave vieja `"splash"` y el plugin `"expo-splash-screen"`), mostrando la pantalla de carga nativa y luego la de Expo encima. Corregido: se quitó la clave vieja, queda solo el plugin.
- **Badge "1 solicitud" en Rutas personalizadas (conductor) sin nada adentro**: el contador (`DriverHomeScreen.tsx`) contaba `airport_requests` pendientes de TODA la base, sin filtrar por municipio del conductor ni excluir las que ya descartó — pero la lista real sí aplica ese filtro. Corregido: el contador ahora replica el mismo filtro que `loadDriverFeed` (`useAirportNegotiation.ts`).
- **"Datos personales" solo editaba el nombre**, aunque el subtítulo prometía "Nombre, correo y teléfono". Se completó: ahora el correo es editable (campo de contacto del perfil, nunca crea una cuenta nueva ni pide contraseña — usa `auth.updateUser({email})`, que Supabase no aplica hasta que el usuario confirma el enlace que le llega por correo) y el teléfono se muestra de solo lectura (es la identidad de acceso de la cuenta). Nueva migración `20261021100000_sync_profile_email.sql`: espejo del trigger que ya existía para teléfono, sincroniza `profiles.email` desde `auth.users.email` solo cuando el cambio ya fue confirmado.
- **Teclado tapaba el campo en ese mismo modal**: usaba `KeyboardAvoidingScreen` con `fill=true` por defecto, pero es un sheet anclado abajo (`position:absolute`) — el propio componente documenta que esos casos necesitan `fill=false`. Corregido.
- **Teclado no subía el campo de correo la primera vez en el login** (sí funcionaba después de cerrar y volver a abrir el teclado): el campo de teléfono ya tenía un `onFocus` que fuerza scroll al final como respaldo del `KeyboardAvoidingView`, pero el campo de correo/contraseña del login no lo tenía — por eso fallaba ahí y no en teléfono. Se agregó el mismo `onFocus` a correo y contraseña. (El dueño reportó que a veces pasa también en el flujo de reserva del pasajero, en una pantalla sin identificar — pendiente de más detalle para aplicar el mismo fix ahí si hace falta.)
- **Onboarding (primeras pantallas) tapaba el texto de abajo**: la altura de la ilustración (`ILLUSTRATION_MAX_HEIGHT`) era un valor fijo (340px) sin importar el alto real de la pantalla, dejando muy poco espacio para el texto en teléfonos más chicos. Corregido: ahora es proporcional al alto de pantalla (`Math.min(340, height * 0.32)`), y además cada slide quedó dentro de un `ScrollView` como respaldo por si algún texto sigue sin caber.
- **Tarjetas de "Salidas de hoy" no mostraban el destino**: solo tenían hora, conductor, cupos y precio. Se agregó el destino ("Hacia {destino}") como primera línea de la tarjeta. La placa del vehículo se deja para la pantalla de detalle del viaje (no la tarjeta compacta del inicio), es información de más detalle, no la decisión principal de si la ruta sirve.
- **Pasajero nuevo sin municipio elegido veía rutas sin relación con él en "Salidas de hoy"** (confirmado con capturas): `useTodayDepartures.ts` no aplica ningún filtro cuando el usuario no tiene `preferred_municipality` configurado, así que mostraba las primeras rutas del día sin importar destino/origen. Corregido: mientras no haya municipio elegido, la sección pide elegirlo en vez de mostrar rutas que no le aplican al usuario.

**Hallazgo aparte, más grande, documentado pero NO ejecutado todavía** (ver [[project_rediseno_login_pin]]): existe una pestaña "Correo" en el login que crea una cuenta de Supabase Auth completamente separada e independiente de la cuenta por teléfono — contradice el propio diseño documentado en `20261007100000_identity_single_account.sql` ("una persona, una cuenta: el teléfono es la identidad"). Decisión del dueño: no tocar esto ahora (la prueba cerrada ya está corriendo con el login actual), se va a resolver con un rediseño completo a teléfono+PIN (estilo Nequi) ~15-16 días antes de salir a producción pública, con un AAB nuevo antes de publicar.

## -2. Verificación de cuenta Twilio para Verify/OTP (2026-10-16 a 20)

No es un cambio de código — queda documentado aquí porque es un bloqueador real de login que tomó varios días resolver y conviene no repetir el diagnóstico si vuelve a pasar con otra cuenta.

**Síntoma:** desde que se activó Twilio Verify para el OTP de login, todo intento real devolvía `422 sms_send_failed` con el error de Twilio **60238** ("Verification Creation Attempt blocked by Twilio"). Según la documentación oficial de Twilio, ese código normalmente se resuelve solo en 72h tras el upgrade de cuenta a plan de pago — pasaron esas 72h (cuenta creada 2026-10-16, probado de nuevo el 2026-10-19) y el bloqueo seguía igual.

**Diagnóstico descartado:** no era un problema de configuración. Se verificó directo contra la API de Twilio (cuenta `status: active`, `type: Full`; Verify Service `VA64cbaa...` bien configurado) — ni la cuenta ni el Verify Service tenían nada mal. Tampoco hacía falta comprar un número propio (Verify usa infraestructura compartida de Twilio, no un número de la cuenta).

**Causa real:** no era un bloqueo por tiempo, sino un ticket de revisión manual ya abierto desde el 2026-10-15 por **Twilio Fraud Operations – Onboarding & Compliance** (ticket `#29952189`, "Twilio Account Verification - Action Required"), en estado `Pending` porque nunca se había respondido su cuestionario. El bloqueo no se levanta hasta contestarlo completo.

**Qué se respondió (2026-10-19/20):**
- Cuestionario completo en el ticket: caso de uso (OTP vía Verify para login de la app Trive, sin SMS de marketing), que es la primera y única cuenta de Twilio, datos de la empresa (Jormelia Soft S.A.S., en trámite de registro ante Cámara de Comercio, radicado y pagado, pendiente resolución) y la aclaración de que la cuenta de Twilio se creó a nombre personal del dueño (persona natural, antes de que la empresa existiera) — no hay contradicción con los documentos de identidad ya subidos a Twilio.
- Correo de verificación de dominio (lo que Twilio pedía como prueba de que se controla `trivesoft.com`): se mandó desde `verificacion@trivesoft.com` usando la API de Resend (el dominio ya estaba verificado ahí para los correos reales de la app) hacia `verifymyaccount@twilio.zendesk.com`, confirmado `Sent` → `Delivered`. No fue necesario montar un buzón de correo nuevo — se usó la regla de Cloudflare Email Routing que ya existía (`privacy@trivesoft.com → soportetrive@gmail.com`) solo como referencia de que el dominio está bajo control del dueño, y Resend para el envío real.

**Resuelto (2026-10-20):** Twilio aprobó la cuenta ("account upgrade has been approved") tras un segundo intercambio donde además pidieron verificación de pago (últimos 4 dígitos de la tarjeta, nombre, código postal, monto de la última transacción y relación del titular con la empresa — proceso real de Twilio, respondido directo en el ticket autenticado, nunca por correo). Probado de punta a punta con un número real: el SMS con el código llegó correctamente. El login por OTP ya funciona en producción.

## -3. Login/registro por correo: SMTP y recuperación de contraseña rotos (2026-10-20)

Al revisar el flujo de login por correo (paralelo al de teléfono) se encontraron dos huecos reales de entrega, ninguno de los dos era un problema de código del flujo en sí, sino de la infraestructura de correo detrás:

**SMTP de Auth apuntaba a un Gmail personal:** Supabase Auth ya tenía SMTP personalizado activado, pero configurado con `smtp.gmail.com` y un Gmail personal como remitente — el propio Supabase lo marcaba con advertencia ("designed for sending personal rather than transactional email messages"). Se cambió a **Resend** (`smtp.resend.com`, usuario `resend`, clave de API dedicada `supabase-auth-smtp` con permiso de solo envío sobre `trivesoft.com`), remitente `noreply@trivesoft.com`. De paso se personalizaron las plantillas de "Confirm signup" (código de 6 dígitos, `{{ .Token }}`, igual que el flujo de teléfono) y "Reset Password" (botón con `{{ .ConfirmationURL }}`), antes genéricas de Supabase.

**Recuperación de contraseña no tenía a dónde volver:** `resetPasswordForEmail()` en `RecoveryAccountScreen.tsx` se llamaba sin `redirectTo`, así que el enlace usaba el Site URL del proyecto — que además estaba en `http://localhost:3000` (resto de desarrollo, nunca actualizado). La app tampoco tiene ningún `scheme` de deep link configurado (`app.json` no define ninguno), así que no había forma de volver a la app ni una página web que recibiera el enlace. Corregido:
- `RecoveryAccountScreen.tsx` ahora manda `redirectTo: 'https://trivesoft.com/restablecer-contrasena'`.
- Nueva página `trive-web/src/pages/ResetPasswordPage.tsx` (ruta `/restablecer-contrasena`) que recibe la sesión de recuperación de Supabase y deja guardar la contraseña nueva.
- Site URL del proyecto actualizado a `https://trivesoft.com` (ya no `localhost:3000`), y ese Redirect URL agregado a la lista blanca de Supabase.

**Pendiente:** nada bloqueante — falta el build nuevo de la app (ya tiene el `redirectTo`) y confirmar con una prueba real de registro/recuperación por correo una vez esté desplegado.

## -1. Auditoría de lanzamiento a Play Store (2026-10-15)

Se pidió dejar la app lista para subir a Google Play. Antes de tocar nada se verificó cada punto de la sección 6 (Problemas abiertos) contra el código y la base real — varios ya estaban resueltos sin que este documento se actualizara:

**Ya resueltos (el documento decía lo contrario):**
- P2 (seguridad de datos): `profiles` y `bookings` ya NO son de lectura pública — verificado contra producción, políticas RLS correctas (`can_view_profile()`, lectura solo del dueño/conductor/staff).
- P3 (`projectId` inconsistente): ya coincide en `app.json` y `pushNotifications.ts` (`17d0b706-d74a-4ddd-8633-b9d0fb6de764`).
- P5 (referidos): `increment_balance` ya no existe en ningún lado, no es una dependencia rota.
- P6 (calificaciones): `reviews.ts` ya usa el RPC `rate_booking`, no escribe directo.
- P7 (`autoIncrement`): ya está en `eas.json`.
- P8 (duplicación): `src/theme/colors.ts` ya no existe; las 3 pantallas de aeropuerto cumplen roles distintos (listado/detalle/creación), no son duplicadas.
- P9 (calidad): 32 `console.log` reales (no 119), no es bloqueador para publicar.

**Hallazgos nuevos, corregidos hoy:**
- **Nombre de paquete con error de tipeo**: `com.traive.triveapp` → corregido a `com.trivesoft.app` en `app.json` (decisión del dueño). Esto es irreversible una vez publicado en Play Store, por eso se corrigió antes del primer build de producción. **Pendiente**: `google-services.json` local y el secreto `GOOGLE_SERVICES_JSON` en EAS siguen apuntando al paquete viejo — hay que registrar un nuevo Android app en Firebase (proyecto `trive-5759c`) con el paquete `com.trivesoft.app`, descargar el `google-services.json` nuevo, reemplazar el archivo local y actualizar el secreto de EAS (`eas secret:create --name GOOGLE_SERVICES_JSON --type file`) antes del próximo build — si no, las notificaciones push (FCM) no van a funcionar con el nuevo paquete.
- **Assets de Play Store generados**: `assets/store/feature-graphic.png` (1024×500) y `assets/store/icon-512.png` (ícono de alta resolución sin el relleno blanco que tenía `assets/icon.png` — ese archivo se deja intacto porque también es el `foregroundImage` del ícono adaptativo de Android, que sí necesita ese margen de seguridad).
- **Página pública de eliminación de cuenta**: no existía (Google Play la exige, accesible sin la app instalada). Creada en `trive-web` (`/eliminar-cuenta`), con las dos vías (desde la app, o formulario web que reusa `send-contact-message`) y el detalle de qué se borra vs. qué se conserva anonimizado, basado en `anonymize_account()` (migración `20261003190000`).
- **Capturas de pantalla desactualizadas**: `assets/screenshots/` son mockups de mayo que no se parecen a la app actual (compara con la pantalla de inicio real, muy distinta). Hacen falta capturas reales nuevas antes de armar la ficha de Play Store — pendiente de que el dueño las tome desde su teléfono.
- **Limpieza menor pendiente de aprobación**: `anon` tenía permisos de escritura (UPDATE/DELETE/TRUNCATE) sobre `profiles` que no son explotables (RLS los bloquea igual) pero no deberían estar ahí — el sistema bloqueó la escritura automática por ser una modificación de permisos en producción; falta que el dueño apruebe el `REVOKE` o lo ejecute él mismo.

**Pendiente para terminar de dejarla lista:**
1. Nuevo `google-services.json` desde Firebase + actualizar secreto en EAS.
2. Capturas de pantalla reales nuevas (el dueño las toma desde su teléfono).
3. `REVOKE` de los permisos sobrantes de `anon` en `profiles` (aprobación pendiente).
4. Build de producción nuevo con el paquete corregido, e instalación limpia para probar.

## 0. Dónde quedamos (bitácora, 2026-10-14)

**Back-office web construido (repo nuevo y separado `trive-backoffice`, no estaba en este repo):**
- V1: cargos de empleado (`staff_roles`, reemplaza el booleano único `profiles.is_admin` para las pantallas nuevas sin quitarlo del todo todavía), login con MFA nativo de Supabase, cola de verificación de conductores/vehículos con reclamo exclusivo, recargas de saldo, bitácora de auditoría real (se corrigieron dos huecos: el log de documentos dependía de un insert sin `await` del cliente, y el de vehículos no existía).
- Métricas y reportes: viajes completados, ingresos, conductores verificados, expedientes pendientes, gráfica de 14 días y rutas más frecuentes.
- Atención al cliente: tickets de soporte reales (reemplazan el `mailto:` de `BugReportScreen`) y resolución de disputas de viaje (reservas en `booking_status = 'disputed'` no tenían ningún camino de salida antes de esto).
- Libro contable: lectura filtrable de todos los movimientos de `wallet_transactions` (tipo, estado, usuario, fecha), más allá del formulario simple de Recargas.
- **Se retiró la administración de la app móvil pública**: se borraron `AdminDocumentsScreen.tsx` y `AdminMenuButton.tsx`, y las funciones del cliente que solo ellos usaban en `driverDocuments.ts`. Ningún RPC perdió autorización (seguían protegidos del lado del servidor); solo se quitó la puerta de entrada desde el APK.
- Todo commiteado y pusheado a `seguridad/fase-2` en este repo, y a `main` en `trive-backoffice`.

**Pendiente de este trabajo:** nada bloqueante — el back-office queda operativo para que el dueño lo use ya. Falta, cuando el dueño decida, dar de alta más empleados (hoy es manual, un insert en `staff_roles`) y evaluar si se separa la cuenta de prueba `admin1@trive.com` del uso real de back-office.

## 0.0 Rediseño enterprise + procesos nuevos del back-office (2026-10-14, misma sesión)

Después de V1, se le pidió explícitamente un rediseño "enterprise" (marca, sombra, profundidad, copywriting, logo, login, página de inicio) y luego una lista completa de procesos/UI faltantes, construida de más a menos compleja:

**Visual:** logo e ícono reales de la app integrados (sin el PNG pixelado del wordmark — se reconstruyó como texto + CSS), colores de marca reales (`#1230B8` de `theme.ts`, no un azul genérico de Tailwind) como tokens de Tailwind, tipografía Plus Jakarta Sans, sombra consistente en todas las tarjetas/tablas/modales, página de Login partida (panel de marca + formulario) y página de **Inicio** nueva (antes redirigía directo a Verificación) con accesos en vivo por cargo. **Modo oscuro completo** vía variables CSS semánticas (`bg-surface`, `text-text-primary`, etc. — cambian solas bajo `.dark`, sin tocar cada componente), con switch en la sidebar y persistencia en el navegador; incluye un token aparte (`brand-ink`) para que el azul de marca como texto siga pasando el contraste AA sobre fondo oscuro sin aclarar los botones.

**Procesos nuevos:**
- **Gestión de empleados** (`/empleados`, solo administrador general): crear la cuenta requiere el Admin API de Supabase (`service_role`), así que vive en una Edge Function nueva (`invite-employee`) — el back-office nunca tiene esa clave. Como el proyecto no tiene SMTP propio (ver `docs/features/EMAIL_RATE_LIMIT_SOLUTION.md`), no se manda correo de invitación: se genera una contraseña temporal que se muestra una sola vez para compartir por otro medio. Asignar/quitar cargos a un empleado que ya existe sí es un RPC normal.
- **Moderación de cuentas** (`/moderacion`, cargo `operaciones`): no existía ninguna forma de suspender a un conductor/pasajero que incumpliera las políticas. Nueva Edge Function `moderate-account` (usa `auth.admin.updateUserById` con `ban_duration`, mismo mecanismo que ya usaba `delete-account`) + columna `profiles.account_status`.
- **Débito manual de saldo**: `admin_debit_balance` (el tipo `admin_debit` ya existía en el CHECK de `wallet_transactions` pero nadie lo usaba). Recargas ahora tiene un selector Recargar/Debitar.
- **Badges en vivo** en la sidebar (tickets y disputas abiertas) vía Supabase Realtime — requirió agregar política de RLS de lectura para el cargo correspondiente (antes todo pasaba por RPCs, sin SELECT directo) y sumar `support_tickets` a la publicación de realtime (`bookings` ya estaba).
- **Sidebar responsive** con menú hamburguesa en pantallas angostas (antes no colapsaba).
- **Filtros en Bitácora** (tipo de acción, empleado, rango de fechas — antes solo mostraba las últimas 200 sin forma de buscar).
- **Confirmación en acciones destructivas**: "Aprobar" documento/vehículo en el expediente ahora pide un segundo clic ("¿Confirmar?") en vez de ejecutar de inmediato.
- Unificado el azul de las gráficas de Métricas con el azul institucional (antes usaba un azul de dataviz distinto, `#2a78d6`).

**Migraciones nuevas:** `20261014160000_gestion_empleados.sql`, `20261014170000_moderacion_cuentas.sql`, `20261014180000_realtime_staff_badges.sql`, `20261014190000_debito_manual.sql`. **Edge Functions nuevas:** `invite-employee`, `moderate-account`.

**Pendiente de este bloque:** ninguno de los puntos originales de la lista quedó sin hacer. Separar `admin1@trive.com` sigue siendo la única acción que falta y que solo puede tomar el dueño.

## 0.0.1 Finanzas de la empresa (2026-10-14, misma sesión)

El dueño preguntó si el back-office ya cubre toda la operación de Trive comparado con BlaBlaCar/Uber/InDrive. Se le aclaró que el modelo de Trive es de mercado de rutas publicadas (como BlaBlaCar), no de despacho bajo demanda (Uber/InDrive) — por eso cosas como GPS en vivo, precio dinámico o nómina de conductores no aplican. De ahí salió un hueco real: el Libro Contable (`wallet_transactions`) solo rastrea saldo *interno* de usuarios, no la contabilidad real de la empresa (caja, cuentas bancarias, gastos fijos, rentabilidad).

Se construyó **Finanzas** (`/finanzas`, cargo `contabilidad`), completamente independiente y manual:
- **Cuentas** (`finance_accounts`): banco, caja menor, ahorros u otra — cada una con su saldo calculado a partir de sus movimientos (no un campo mutable).
- **Categorías** (`finance_categories`): 10 precargadas (3 de ingreso: comisión de rutas, aporte de socios, otros ingresos; 7 de gasto: arriendo, salarios, servicios, impuestos apartados, viáticos, infraestructura, otros) + se pueden crear nuevas libremente desde el formulario (híbrido, decisión explícita del dueño).
- **Movimientos** (`finance_movements`): ingreso o gasto, ligado a una cuenta y una categoría, con fecha (puede ser retroactiva), descripción y quién lo registró. Se puede borrar (con confirmación de doble clic) si fue un error.
- **Resumen/rentabilidad** (`get_finance_summary`): ingresos, gastos, neto y desglose por categoría de un período.
- Todo registra en la bitácora (`finance_income_added`, `finance_expense_added`, `finance_movement_deleted`).

Migración: `20261014200000_finanzas_empresa.sql`. Sin Edge Function nueva (no necesita el Admin API, son RPCs normales).

**Hallazgo aparte, confirmado al investigar la pregunta:** no existe absolutamente nada de facturación electrónica DIAN en el repo — ni factura, ni CUFE, ni resolución. El dueño confirmó que no hace falta todavía porque ni siquiera están en producción real. Queda anotado para cuando sí lo estén (es una decisión para resolver con contador/abogado, no una tarea de código).

## 0.0.2 Insights y alertas accionables en Inicio (2026-10-15, misma sesión)

El dueño pidió mejorar la UX con KPIs e insights de lo que pasa en la plataforma. Antes de construir nada se investigaron los datos reales para no mostrar ruido como si fuera señal — y se encontró que la "tasa de cancelación de rutas" (109 de 128 históricas, 10/10 en los últimos 30 días) es casi toda de las cuentas de prueba de 6 meses de desarrollo, no uso real: se descartó explícitamente ese KPI por ahora.

Se agregó, en la página de **Inicio**:
- **"Esto necesita tu atención"**: alertas accionables (no números sueltos) que solo aparecen si hay algo real pendiente, cada una con link directo a la pantalla donde se resuelve — `get_staff_alerts()`, gateado por cargo: expedientes esperando más de 5 días (`verificacion`), tickets sin respuesta hace más de 24h (`atencion_cliente`), disputas sin resolver hace más de 2 días (`operaciones`).

## 0.0.3 Siete pendientes del back-office, de más a menos complejo (2026-10-15, misma sesión)

Se preguntó qué le faltaba al software web aparte de lo ya conocido. Se identificaron 7 huecos y el dueño pidió construirlos todos, en orden de mayor a menor complejidad:

1. **Conciliación Libro Contable ↔ Finanzas** (`get_reconciliation_status`, migración `20261015110000`): compara el total de comisiones de rutas que debieron generarse (`wallet_transactions`) contra lo efectivamente registrado como ingreso en Finanzas. Si hay una diferencia pendiente, aparece un aviso en `/finanzas` con un botón "Registrar este ingreso" que precarga el formulario de movimiento — no es conciliación transacción por transacción, es un agregado (decisión deliberada para no requerir un flujo de match manual).
2. **Pruebas automatizadas**: primera suite de tests del proyecto — `Vitest` instalado, `src/lib/format.ts` y `src/lib/csv.ts` extraídos de código duplicado (6 copias de `money()`/`initialsOf()` entre pantallas) con 14 tests unitarios. Además, suite SQL no destructiva en `triveupp-main` (`supabase/tests/finance_regression.sql`, `BEGIN;...ROLLBACK;`) con 4 validaciones de integridad (saldo de cuentas, rango de retención, conciliación no nula, categorías del sistema completas) — segura de correr contra producción en cualquier momento.
3. **Monitoreo de errores propio** (sin cuenta de terceros): tabla `frontend_error_logs` + RPCs (migración `20261015120000`), captura global (`window.onerror`, `unhandledrejection`) más un `ErrorBoundary` de React, con deduplicación de 5 segundos por mensaje repetido. Pantalla nueva `/errores` (solo `administrador_general`) para revisar y limpiar el registro.
4. **Expiración de sesión por inactividad**: 30 minutos sin actividad del mouse/teclado/touch cierra la sesión automáticamente (`useIdleLogout`), solo activo cuando ya se pasó el MFA.
5. **Exportar a CSV**: botón en Bitácora y en Libro Contable para bajar lo filtrado en pantalla, con BOM UTF-8 para que Excel no dañe las tildes.
6. **Gastos recurrentes (plantillas)**: `finance_recurring_templates` (migración `20261015130000`) — guardan cuenta/categoría/monto/tipo de un gasto que se repite (arriendo, salarios), un botón "Usar" precarga el formulario de movimiento con la fecha de hoy; no hay automatización, cada uso sigue siendo un movimiento real y explícito.
7. **Editar un movimiento de Finanzas**: antes solo se podía borrar y volver a crear. `update_finance_movement` (migración `20261015140000`) permite cambiar cuenta/categoría/monto/descripción/fecha, pero **no el tipo** (ingreso↔gasto) — si se necesita cambiar eso, se borra y se crea de nuevo. Queda en la bitácora (`finance_movement_edited`).

Migraciones: `20261015110000_conciliacion_finanzas.sql`, `20261015120000_monitoreo_errores.sql`, `20261015130000_gastos_recurrentes.sql`, `20261015140000_editar_movimiento_finanzas.sql`. Sin Edge Functions nuevas. `npm run build` y `npm run test` (14 tests) pasando en `trive-backoffice`.

**Pendiente de este bloque:** ninguno de los 7 puntos quedó sin hacer.
- **"Cómo va el negocio"**: 3 KPIs nuevos — rentabilidad del mes (cruza Finanzas con Inicio por primera vez), retención de pasajeros (% que ya reservó más de una vez — real: 90% sobre una base de 10 pasajeros, muestra pequeña pero honesta), documentos aprobados/rechazados del mes.
- `get_dashboard_metrics` (Métricas) se extendió con `docs_approved`, `docs_rejected` y `passenger_retention` — mismo cargo `analitica` que ya tenía, sin romper nada de lo existente.

Migración: `20261015100000_insights_inicio.sql`. Sin Edge Function.

## 0.0.4 Monitoreo con Sentry, dominio propio y sitio público (2026-10-15, misma sesión)

El dueño compró `trivesoft.com` en Cloudflare y pidió usarlo para alojar el back-office. Antes de eso se agregó monitoreo de errores con Sentry (cuenta propia del dueño, org `trive-1k`) en los dos frontends existentes, en paralelo a lo que ya había:
- **App móvil**: `@sentry/react-native` inicializado en `index.ts` (antes de `registerRootComponent`), `App` envuelta con `Sentry.wrap`, y el `ErrorBoundary` existente ahora también manda la excepción a Sentry además de solo loguearla.
- **Back-office**: `@sentry/react` inicializado en `main.tsx`. `logError()` (la función que ya alimentaba `frontend_error_logs` en Supabase y la pantalla `/errores`) ahora también manda la excepción a Sentry — las dos vías conviven, no se reemplazó ninguna.
- No se configuró subida de source maps ni crash reporting nativo todavía (necesita `SENTRY_AUTH_TOKEN` y tocar el build de EAS) — queda para cuando se retome el build de producción.

Después, el dueño decidió separar el dominio: `trivesoft.com` iba a quedar con el login de empleados directo, lo cual no tenía sentido para un dominio público. Se construyó un **sitio público nuevo** (repo separado `trive-web`, mismo stack que `trive-backoffice`: Vite + React + TS + Tailwind v4) con estructura inspirada en blablacar.co (pedido explícito, no es una copia) pero con identidad de Trive:
- Hero, cómo funciona, confianza/verificación de conductores, cobertura actual (Puerto Tejada↔Cali, sin prometer zonas que no existen), preguntas frecuentes, banner de soporte, y una sección de descarga con lista de espera por correo (como la app aún no está en Google Play).
- **Lista de espera**: tabla nueva `launch_notify_subscribers` (migración `20261015150000_lista_lanzamiento.sql`) — insert público vía RLS (sin SELECT público), lectura solo por `get_launch_notify_subscribers()` gateada a `administrador_general`/`operaciones`. Pendiente: no se construyó todavía una pantalla en el back-office para ver esa lista (solo queda accesible por SQL); se puede agregar cuando haga falta.
- **Términos de Uso y Política de Privacidad**: se reutilizó tal cual el texto ya aprobado en la app (`TermsOfServiceScreen`/`PrivacyPolicyScreen`), no se inventó contenido legal nuevo.
- **Ilustraciones**: se encontraron 5 ilustraciones undraw ya recoloreadas a la marca en `design-canvas/assets/undraw/` que nunca se conectaron a ningún componente de la app (`order-ride`, `confident`, `instant-support`, `sign-in`, `no-signal`). Se usaron en el hero, la sección de confianza, el banner de soporte, la sección de descarga y una página 404 nueva (el sitio no tenía ninguna).
- Nota pendiente sin resolver: el correo de contacto ya aprobado en los términos es `privacy@trive.co` (dominio `.co`), pero el sitio vive en `trivesoft.com` (dominio `.com`) — queda así hasta que el dueño decida si los unifica.

**Infraestructura final en Cloudflare Pages:**
- `trivesoft.com` → proyecto `trive-web` (sitio público).
- `backoffice.trivesoft.com` → proyecto `trive-backoffice` (antes vivía en el dominio raíz, se movió).
- Ambos conectados a sus repos de GitHub (`juanderfrancia-crypto/trive-web`, `juanderfrancia-crypto/trive-backoffice`) con deploy automático en cada push a `main`.

**Pendiente de este bloque:** pantalla en el back-office para ver/exportar `launch_notify_subscribers`; decidir si se unifica el dominio del correo de contacto; subida de source maps de Sentry cuando se arme el build de producción.

## 0.1 Dónde quedamos (bitácora, 2026-10-10)

**Hecho y verificado (resumen desde el 2026-10-03; detalle completo en el historial de git de la rama `seguridad/fase-2`, todo commiteado y pusheado):**
- Las 9 migraciones de seguridad de la fase 2 (2a–2h) aplicadas en producción, más las migraciones posteriores: índices de rendimiento, vehículo/pasajeros en solicitudes personalizadas, `airport_request_dismissals`. Base de datos verificada: sin lectura pública de `profiles` ni `bookings`, 12 funciones clave existen.
- Flujo de "rutas personalizadas" (aeropuerto/destino) unificado en un solo hub, sin pantallas duplicadas, con filtro por municipio y un "No me interesa" para el conductor.
- Notificaciones push corregidas de punta a punta (prioridad, handler, canal Android) — ver `docs/` y memoria `project_notificaciones_push` para el detalle técnico.
- Modo "ver como pasajero" para conductores (vista de sesión, sin tocar `profiles.role`) — ver `docs/MODO_CONDUCTOR_PASAJERO.md`.
- Inicio del conductor rediseñado, Billetera con historial agrupado y paginado, recarga mínima de $10.000 con monto libre, `wompi-webhook` ahora notifica al aprobar un pago.
- Manejo de teclado unificado en 27 pantallas/componentes de toda la app (antes el teclado tapaba el campo en 18 de ellas, y otras 12 usaban un patrón inconsistente y más lento en Android).
- Dos fugas de canales de Realtime corregidas (`useRequestsBadge`, `useNegotiationChat`) que podían tumbar la app al recargar en desarrollo.
- APK de preview compilado e instalado varias veces durante las sesiones. **El build más reciente que incluye todo lo de esta lista es anterior a los últimos commits** — falta un build nuevo antes de probar en teléfono.
- Pruebas offline de la base: 72/72 (última corrida registrada el 2026-10-03; no se ha vuelto a correr desde los cambios de esquema más recientes).

**Pendiente, en este orden:**
1. **Build nuevo + instalación limpia en los dos teléfonos** (desinstalar del todo antes de poner el próximo APK, para que el permiso de notificaciones se pida de verdad). Confirmar ícono de Trive correcto y notificaciones a tiempo.
2. **Rotar secretos expuestos en el chat** — **hecho 2026-10-14**:
   - `WEBHOOK_SECRET` rotado (valor nuevo) y movido a Supabase Vault; el trigger `push-notificaciones` ya no llama a `supabase_functions.http_request` con el secreto como argumento literal — ahora ejecuta una función propia (`public.trigger_push_notification()`) que lo lee de `vault.decrypted_secrets` en cada ejecución. Probado de punta a punta insertando una notificación real: `net._http_response` devolvió `200 {"ok":true}`.
   - El JWT de `service_role` que estaba expuesto en texto plano en **dos lugares** (el cron `check-document-expiry-daily` y el trigger `on_trip_message_insert` → función `notify-message`) se quitó de los dos: ninguna de esas funciones usa el header `Authorization` para nada (cada una arma su propio cliente con `SUPABASE_SERVICE_ROLE_KEY` desde su propio entorno), así que el header solo necesitaba un JWT válido del proyecto para pasar la verificación del gateway — se reemplazó por la clave **anon** (pública, sin riesgo si se expone). Probado con `curl` antes de aplicar: ambas funciones responden 200/400 (lógica propia), nunca 401.
   - Verificado con una búsqueda completa sobre `pg_trigger`/`cron.job`: no queda ningún JWT de `service_role` en ninguna definición.
   - **Pendiente, opcional**: regenerar la clave `service_role` del proyecto en el dashboard (Settings → API Keys) sigue siendo buena práctica porque su valor se vio en el chat en una sesión anterior — pero ya no es urgente, porque no queda ningún lugar en el código o la base que dependa de ese valor específico (las Edge Functions leen `SUPABASE_SERVICE_ROLE_KEY` del entorno que Supabase les inyecta automáticamente, no de un secreto que haya que sincronizar a mano).
   - **Hallazgo corregido 2026-10-14**: `notify-message` (avisos de chat de viaje) no tenía ningún chequeo de secreto compartido como sí tiene `send-push` — cualquiera con la clave anon (pública) podía invocarla directo con un payload armado a mano y disparar una notificación push falsa a un usuario arbitrario, suplantando a Trive (vector de phishing/spam). Se le agregó el mismo chequeo `x-webhook-secret` (reusa el secreto ya guardado en Vault), se redesplegó con `--no-verify-jwt`, y el trigger `on_trip_message_insert` ahora pasa por `public.trigger_trip_message_notification()` (lee el secreto de Vault, igual que el de push-notificaciones). Probado: sin secreto da `401`; con el secreto correcto, `400`/`200` según el caso; probado de punta a punta insertando un mensaje real entre dos cuentas de prueba (`net._http_response` devolvió `200`).
3. **Prueba de punta a punta conductor + pasajero** del flujo de rutas normales (no solo personalizadas), ya con todo lo de esta lista.
4. **Proveedor de SMS para OTP:** decidir entre Firebase Phone Auth o un proveedor SMS pagado para Twilio.
5. ~~Bucket `audio-messages` sigue público.~~ **Hecho 2026-10-14**: bucket pasado a privado (`storage.buckets.public = false`). No había código en la app usando este bucket (la función de notas de voz en el chat nunca se conectó a la interfaz, aunque las columnas `negotiation_messages.audio_url`/`audio_duration`/`is_audio_listened` sí existen desde hace meses, con 3 archivos de prueba ya guardados). Se decidió con el dueño no construir esa función por ahora: el chat de texto ya cubre la negociación, y audio suma moderación/privacidad sin aportar mucho en esta etapa. Si se retoma algún día, debe usar URLs firmadas (como `driver-documents`), nunca acceso público.
6. **Build de producción** y configuración de Play Console, solo después de las pruebas.
7. **Revisión legal** de las páginas de privacidad y eliminación, y plazos de conservación de documentos.

**Decisiones abiertas:**
- Limpiar o conservar los datos de prueba antes de la prueba cerrada (los conductores de prueba con rutas aparecen en la búsqueda).
- Plazo de conservación de documentos de conductor.
- Back-office web: V1 + métricas + atención al cliente + libro contable construidos y en uso (repo `trive-backoffice`); ver bitácora 2026-10-14 arriba. Queda para después: dar de alta empleados desde la propia web (hoy es manual) e inteligencia de negocio (descartada por ahora, prematura).
- Confirmado (no es una decisión abierta, ya resuelta): Trive se queda como app nativa, sin versión PWA/híbrida de reemplazo — el código lo permitiría (Expo soporta salida web) pero las notificaciones push, la ubicación en segundo plano y la cámara son más débiles en navegador. Hoy la app solo está configurada para Android: no hay perfil de build ni `bundleIdentifier` de iOS en `eas.json`/`app.json`.

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
- **Un conductor puede ver la app como pasajero** desde un enlace en su Inicio, sin que cambie su rol real ni su saldo — es una vista temporal de sesión, no un cambio de cuenta. Detalle y la opción más completa (modo persistente) pendiente de construir si hace falta: `docs/MODO_CONDUCTOR_PASAJERO.md`.

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

## 5.2 Fase 1 de seguridad aplicada (2026-10-03)

Migración `supabase/migrations/20261003120000_security_phase1_rls.sql`, ejecutada por el dueño en el SQL Editor de Supabase.

Verificado con la clave pública después de aplicarla:
- `notifications`, `user_sessions`, `travel_preferences`, `trip_preferences`, `rating_snapshots`: sin filas visibles para el público.
- `earnings_transactions`: INSERT anónimo rechazado (42501, RLS).

Sigue abierto (fase 2): `profiles` (13 filas) y `bookings` (220 filas) siguen legibles por el público.


## 5.3 Fase 2a aplicada (2026-10-03, rama `seguridad/fase-2`)

Migración `supabase/migrations/20261003130000_security_phase2a_rpc_hardening.sql`:
- `increment_wallet_balance`: quita EXECUTE a `anon`, `authenticated` y `PUBLIC`. Hoy cualquier usuario podía acreditarse saldo. El webhook de Wompi usa la clave de servicio y no se afecta.
- `profiles.is_admin`: trigger que impide que el usuario cambie su propio privilegio. Sin esto, el control de administrador no sirve.
- `approve_document_admin`: exige administrador. Antes cualquier usuario podía verificar cualquier documento.
- `accept_airport_offer`: exige ser el pasajero de la solicitud o el conductor de la oferta. Antes cualquier usuario podía aceptar cualquier oferta por id.

Verificado después de aplicar: `increment_wallet_balance` y `create_negotiation_payment` responden 42501 (permiso denegado) a `anon`; `approve_document_admin` responde "No autorizado".

Sin pendientes en triggers de `profiles`: la consulta devolvió 0 filas.

Ya no aplica (resuelto arriba):
- `reject_document_admin`: sin control de administrador.
- `finalize_bookings_atomic`: sin control de dueño; hay que conservar su tipo de retorno exacto.
- `create_negotiation_payment`: hay que confirmar si ya descuenta el saldo de $5.000, porque el cliente también lo descuenta antes de llamar.
- Triggers sobre `profiles` que actualizan `driver_verified`.

## 5.4 Fase 2b parte 1 preparada (rama `seguridad/fase-2`, sin aplicar)

Migración `supabase/migrations/20261003140000_security_phase2b1_money_core.sql` y cambios de cliente:
- `publish_route`: cobra $2.000 y crea la ruta en una sola transacción. Reemplaza el cobro y la inserción desde el cliente en `useRoutes.createRoute`.
- `accept_request_direct`: cobra $5.000 y acepta la solicitud en una sola transacción. Reemplaza `useAirportRequests.acceptRequest`.
- `create_negotiation_payment`: ahora deja registro en el libro (`wallet_transactions`).
- `accept_airport_offer`: sin cambios; se beneficia del cobro atómico. Se quitó la validación de saldo del cliente en `useAirportNegotiation`, que leía el saldo de quien tenía la sesión.
- `profiles.balance`: el usuario ya no puede escribirlo desde la API. Columnas editables en lista blanca.
- `profiles.balance >= 0`: restricción en la base (NOT VALID).
- Rol: solo `driver` o `passenger` desde la app.
- `puede_conducir(uid)`: rol conductor y `driver_verified`. Todas las funciones de conductor la usan.
- Políticas de INSERT directo sobre `routes` eliminadas.

Pendiente en la misma fase (2b parte 2):
- Chat de negociación abierto antes de aceptar (`send_negotiation_message` aún exige pago).
- Insertar directo en `negotiation_messages` (política abierta).
- Bookings: lectura pública, escritura del conductor, mapa de asientos.
- Lectura pública de `profiles`.
- Bono de referido: se pagará al completar y confirmar el primer viaje (no al publicar). Hoy está desactivado en el cliente.
- Confirmación del viaje por el pasajero (24 h), reembolsos y vehículos.

Orden de despliegue: aplicar la migración junto con el APK nuevo. El cliente anterior ya no puede publicar ni aceptar.

## 5.5 Fase 2b parte 2 preparada (rama `seguridad/fase-2`, sin aplicar)

Migración `supabase/migrations/20261003150000_security_phase2b2_airport_flow.sql` y cambios de cliente:
- `airport_requests`: el pasajero solo crea y lee las suyas. Se eliminan las escrituras directas de aceptar y de cambiar estado. Los conductores solo ven solicitudes pendientes si `puede_conducir`.
- `airport_offers`: se elimina `passenger_accept_offer`, que permitía aceptar una oferta sin cobrar. Los conductores crean ofertas solo si `puede_conducir`.
- `cancel_airport_request`: pasajero cancela y, si el conductor ya pagó, se devuelven $5.000 al libro. Conductor cancela sin reembolso. En curso o completada no se cancela. Usado por `useAirportNegotiation` y `useAirportRequests`.
- `reject_airport_offer`: el pasajero rechaza una oferta; la solicitud sigue visible para otros conductores. Aún no hay botón en la app.
- `send_negotiation_message`: el conductor escribe cuando la solicitud está aceptada (el cobro ya ocurrió). Se elimina la política de INSERT directo.

Decisión técnica pendiente: el chat **antes** de aceptar requiere un hilo por oferta. Hoy `negotiation_messages` está ligado a la solicitud con un solo conductor asignado. Hay que decidir si se rediseña la tabla o si el chat previo se hace con ofertas.

## 5.6 Fase 2c preparada: chat por hilo (rama `seguridad/fase-2`, sin aplicar)

Migración `supabase/migrations/20261003160000_security_phase2c_chat_threads.sql` y cambios de cliente.

Modelo: un hilo por (solicitud, conductor). Se escribe mientras la oferta esté `pending` o `accepted` y la solicitud no esté cancelada ni completada. Al rechazarse o cerrarse, el hilo queda de solo lectura con su historial.
- `send_chat_message(p_request_id, p_driver_id, p_text, p_type)`: reemplaza `send_negotiation_message`. Valida participante y estado del hilo.
- `mark_chat_thread_read(p_request_id, p_driver_id)`: reemplaza `mark_negotiation_messages_read`. Corrige el bug: marcaba como leídos también los mensajes propios.
- `accept_request_direct`: crea la oferta aceptada, para que todo acuerdo tenga su hilo.
- Política de lectura: participantes, sin depender del estado de la solicitud.
- Se elimina el INSERT directo en `negotiation_messages`.

Cliente:
- `useNegotiationChat(requestId, driverId)`: hilo por conductor; `isOpen` reemplaza el bloqueo por pago.
- `NegotiationChatModal`: recibe `driverId`; el historial siempre se ve y la caja de entrada aparece solo si el hilo está abierto.
- Pantallas que abren el chat pasan `driverId`: lista de chats (conductor y pasajero), viajes activos, feed del conductor, solicitudes del pasajero.
- Detalle de solicitud (pasajero): cada oferta pendiente tiene **Chatear** y **Rechazar** (`reject_airport_offer`).

Pendiente: el chat del pasajero en solicitudes sin conductor asignado solo se abre desde el detalle de cada oferta.

## 5.7 Estado de la fase 2 (2026-10-03)

Procedimiento completo, orden de aplicación y pruebas en dispositivo: `docs/PRUEBAS_Y_DESPLIEGUE.md`.

- Aplicada en producción: fase 2a.
- Escrita y validada en el Postgres de pruebas (72/72): fases 2b1, 2b2, 2c, 2d, 2e, 2f, 2g, 2h.
- Funciones Edge escritas: `delete-account` (eliminación de cuenta) y `send-push` (push de notificaciones del servidor).
- Páginas legales escritas en `docs/publico/` (privacidad y eliminación de cuenta), pendientes de revisión legal.
- Pendiente de decisión y de configuración manual: ver el procedimiento, secciones 4 y 7.

## 6. Problemas abiertos

Estos son los que hay que resolver antes de la prueba cerrada en Play Console.

- **P1 · Historial de migraciones vacío.** Hay que marcar las 8 migraciones como aplicadas en el historial remoto antes de cualquier `db push`. Requiere aprobación explícita, porque escribe en producción.
- **P2 · Seguridad de datos (crítico, ver secciones 5.1 y 5.2; fase 1 aplicada, falta fase 2).** Datos personales y de reservas son legibles por cualquiera con la clave pública, y los usuarios pueden escribir saldo, rol y administración. Cerrarlo exige cambios en base de datos y en el cliente, en el mismo paso.
- **P3 · `projectId` de EAS inconsistente.** Hay tres valores: `17d0b706…` en `app.json`, `e96c93aa…` en `src/services/pushNotifications.ts` y `e77b81ed…` en la documentación. Hay que confirmar cuál es el proyecto real en expo.dev.
- **P4 · Borrado de cuenta incompleto.** `PrivacyScreen` solo cancela reservas y rutas y cierra sesión. Google Play exige eliminar la cuenta y sus datos, y tener una URL pública para solicitarlo.
- **P5 · Referidos.** El crédito de $2.000 al referidor se escribe desde el cliente del conductor nuevo y RLS lo bloquea en silencio. `increment_balance` no existe; el fallback del cliente sí funciona para el bono de $1.000.
- **P6 · Calificaciones.** `src/services/reviews.ts` intenta escribir el `rating` de otro usuario, lo que RLS bloquea. Hoy el promedio de calificaciones no se actualiza.
- **P7 · `eas.json` sin `autoIncrement`** en el perfil `production`. La segunda subida a Play puede ser rechazada por `versionCode` repetido.
- **P8 · Duplicación.** Hay dos archivos de tema con colores distintos (`src/theme/colors.ts` y `src/theme/theme.ts`), tres pantallas de solicitudes de aeropuerto con lógica parecida, y scripts repetidos en `database/`.
- **P9 · Calidad.** 22 `catch` vacíos, ~119 `console.log`/`TODO` en `src/`, y pantallas muy grandes (Perfil 1.764 líneas, Panel del conductor 1.613, Registro de conductor 1.546, Inicio 1.513).

## 6.1 Documentos de referencia

- Políticas de negocio y seguridad confirmadas por el dueño: `docs/POLITICAS_NEGOCIO_Y_SEGURIDAD.md`.
- Back-office web (diseño, no iniciado): `docs/BACKOFFICE.md`.

## 7. Reglas de trabajo

- No se lanza ningún `eas build` sin confirmación del dueño.
- No se escribe en producción (base de datos, funciones, historial) sin aprobación explícita de la acción concreta.
- Los cambios de base de datos viven en `supabase/migrations/` con nombre `AAAAMMDDHHMMSS_descripcion.sql`, y se aplican con `npx supabase db push` después de revisar `--dry-run`.
- Cada cambio relevante se commitea con un mensaje claro y se registra aquí.
- Documentación antigua en `docs/archive/` y `docs/deployment/`: no es fuente de verdad. Lo que dice este archivo prevalece.
