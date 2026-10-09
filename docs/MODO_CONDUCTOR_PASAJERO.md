# Modo conductor / pasajero

Decisión tomada el 2026-10-09. Resuelve: un conductor necesita, de vez en cuando,
usar la app como pasajero (por ejemplo, para reservar un viaje de alguien más).
Hoy `profiles.role` es un valor fijo (`driver` | `passenger` | `support`) y casi
toda la navegación depende de él — no existía ninguna forma de cruzar de un lado
al otro sin pedirle a un admin que le cambiara el rol en la base de datos.

Se evaluaron dos opciones (ver también la referencia de diseño, abajo).

## Opción B — Acceso rápido (la que se construyó)

Una vista temporal, solo en cliente, que no toca `profiles.role` ni el saldo.
Un conductor puede "ver" la app como pasajero y volver, sin que nada quede
guardado en el servidor.

**Cómo funciona:**
- `useAppStore` (`src/store/useAppStore.ts`) tiene un campo `viewingAsPassenger:
  boolean` y su setter `setViewingAsPassenger`. **No se persiste** — el
  `partialize` del store solo guarda `hasSeenOnboarding`, así que este campo
  vuelve a `false` solo con cerrar y abrir la app, y también se resetea
  explícitamente en `logout()`.
- Tres pantallas deciden qué mostrar combinando el rol real con este campo,
  en vez de usar solo `isDriverRole(user)`:
  - `src/screens/HomeScreen.tsx` (pestaña Inicio)
  - `src/navigation/TabNavigator.tsx`, función `TripsTab` (pestaña Viajes)
  - `src/screens/AirportHubScreen.tsx` (pestaña Solicitudes)
- El punto de entrada está en `src/screens/DriverHomeScreen.tsx`: un enlace
  "Usar como pasajero" que llama a `setViewingAsPassenger(true)`.
- El punto de salida está en `src/screens/PassengerHomeScreen.tsx`: cuando
  `viewingAsPassenger` es `true`, aparece un banner arriba ("Viendo como
  pasajero · Volver a conductor") que llama a `setViewingAsPassenger(false)`.

**Qué NO cambia (decisión deliberada, no un olvido):**
- `WalletScreen.tsx` sigue mostrando la identidad de conductor sin importar
  `viewingAsPassenger`: es la misma plata, la misma cuenta. No tiene sentido
  fingir que el saldo es "de pasajero".
- `NotificationsScreen.tsx` sigue enrutando con el rol real: las notificaciones
  pertenecen a la cuenta real (p. ej. "alguien reservó tu ruta"), no a la vista
  temporal. Si se enrutaran con el modo simulado, tocar una notificación real
  de conductor mientras se está "viendo como pasajero" llevaría a la pantalla
  equivocada.
- El banner de "volver a conductor" solo vive en Inicio. Si en el futuro se ve
  que la gente se queda navegando en Viajes/Solicitudes sin volver a Inicio,
  vale la pena promoverlo a un banner global (ver limitaciones abajo).

**Costo:** bajo. ~6 archivos tocados, nada de backend, ninguna migración.

## Opción A — Modo activo (para más adelante, si hace falta)

Un switch persistente tipo BlaBlaCar/DiDi/inDrive: "Modo conductor" /
"Modo pasajero" como una preferencia real del usuario, no una vista de sesión.

**Cuándo construirla:** si se ve que la gente usa mucho el botón de la Opción B,
se queda navegando largo rato como pasajero, o pide quedarse "en modo pasajero"
entre sesiones (hoy eso es imposible con la Opción B, que siempre vuelve a
conductor al reabrir la app).

**Qué toca, para hacerlo bien:**
1. **Dato persistente real**, no solo cliente. Dos caminos:
   - (a) Agregar una columna nueva, p. ej. `profiles.active_mode text` separada
     de `role` (más limpio: `role` sigue siendo "qué puede hacer" — conductor
     verificado o no — y `active_mode` es "qué está viendo ahora mismo"). Un
     conductor puede tener `role='driver'` y `active_mode='passenger'` a la vez.
   - (b) Reusar `role` como el modo activo y agregar una tabla/flag aparte para
     "es conductor verificado" (p. ej. ya existe `driver_verified` en
     `profiles` y la tabla `drivers`/`vehicles` — probablemente ya alcanza para
     saber si alguien PUEDE publicar, independiente de en qué modo esté).
   - Se recomienda (a): no mezclar "capacidad" con "vista actual".
2. **Persistir la preferencia** en el store con `partialize` (agregar la clave
   nueva a la lista que si se guarda en AsyncStorage), para que sobreviva a
   cerrar la app — a diferencia de la Opción B, que es a propósito efímera.
3. **Revisar TODOS los usos de `isDriverRole`/`isPassengerRole`** (hoy 5
   lugares: `TabNavigator`, `HomeScreen`, `AirportHubScreen`,
   `NotificationsScreen`, `WalletScreen` — buscar `isDriverRole` antes de
   empezar, puede haber crecido) y decidir, pantalla por pantalla, si debe
   seguir el modo activo o el rol real/capacidad — igual que se decidió para
   Wallet/Notifications en la Opción B.
4. **Banner o indicador global**, no solo en Inicio: con un modo persistente,
   el usuario puede pasar sesiones enteras en modo pasajero, así que la señal
   de "en qué modo estoy" debe verse desde cualquier pestaña (ej. en el
   `TabNavigator` mismo, no solo en una pantalla).
5. **Qué pasa con un viaje en curso.** Si el conductor tiene una ruta
   `in_progress` o pasajeros con reservas activas, decidir si se le permite
   cambiar a modo pasajero (probablemente no — bloquear el switch con un
   mensaje claro, no fallar en silencio).
6. **Registro de push / badges por modo.** Hoy el badge de "Solicitudes"
   (`useRequestsBadgeCount`) y el de alertas no distinguen modo. Si el modo es
   persistente, confirmar que los contadores y las notificaciones push tienen
   sentido para alguien que pasa temporadas como pasajero y temporadas como
   conductor.
7. **Analítica/soporte:** si el back-office (`docs/BACKOFFICE.md`) muestra
   "rol" de un usuario, debe distinguir entre capacidad (`role`) y modo activo.

**Costo estimado:** medio-alto — toca base de datos (migración), store con
persistencia, navegación, y una revisión completa de los 5+ puntos que hoy
asumen un rol fijo.

## Maqueta de referencia

Las dos opciones se diseñaron como mockup interactivo antes de construir nada:
el Artifact comparaba el switch persistente (Opción A) contra el acceso rápido
(Opción B) — útil como referencia visual si se retoma la Opción A más adelante,
pero no es la fuente de verdad del código (este documento sí lo es).
