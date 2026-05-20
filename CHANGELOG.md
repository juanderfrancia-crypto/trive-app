# Changelog — Trive

Todos los cambios relevantes del proyecto se documentan aquí.  
Formato: `[YYYY-MM-DD] — Descripción`

---

## [2026-05-20] — Identidad visual, flujo de viaje completado y calificación desde notificaciones

### Nuevo
- **Botón "Calificar conductor" en notificaciones**: Al completar un viaje, el pasajero recibe una notificación tipo `trip_completed` que al abrirse muestra un botón de calificación directamente en el modal de detalle. Al calificar, la notificación se elimina automáticamente para evitar duplicados.
- **Ícono personalizado para notificaciones push**: `assets/notification-icon.png` (PNG blanco/transparente, color de fondo `#1230B8`) configurado en `app.json`.
- **Historial de Viajes rediseñado**: `TripHistoryScreen` con identidad visual completa — cards con sombra azul, gradiente en ícono de ruta, filtros con gradiente activo, status chips, badge "Calificado".
- **Modal "Mis Chats" rediseñado**: Bottom sheet con fondo `#F4F6FF`, handle bar, cards blancas con sombra azul, avatar cuadrado con gradiente, pill "En curso".

### Mejorado
- **Flujo de viaje completado**: Al marcar un viaje como completado en `DriverPanelScreen`, ahora se actualizan los bookings a `booking_status: 'completed'` y `payment_status: 'completed'`. Esto hace funcional el contador "Gastado este mes" en el HomeScreen del pasajero.
- **Payload de notificación `trip_completed`**: Ahora incluye `driver_id`, `driver_name`, `booking_id`, `origin` y `destination` para habilitar la calificación desde la notificación.
- **ProfileScreen — Hero del conductor**: Nueva distribución foto izquierda / info derecha, sin card border, estadísticas con labels, badge "CONDUCTOR VERIFICADO".
- **ProfileScreen — Botón Cerrar Sesión**: Rediseñado con ícono, color rojo suave, texto centrado.
- **ProfileScreen — Sombras**: Sombras azul-tintadas (`#0E2699`) en cards y botones para mayor realismo.
- **`useNotifications` hook**: Eliminado `syncUnread` que causaba el error "Cannot update a component while rendering". Reemplazado por `useEffect` reactivo que observa `notifications`.
- **`NotificationsScreen`**: Modal de detalle inlineado (no sub-componente) para eliminar el parpadeo al abrir.

### Fix
- `yearsOnApp` ya no muestra "1 año" para usuarios nuevos. Removido `Math.max(1, ...)`.
- Logout button: texto centrado correctamente con `justifyContent: 'center'` y sin `flex: 1` en el texto.

### Infraestructura
- Proyecto EAS migrado a cuenta `instaj` (`triveestara@gmail.com`).
- `google-services.json` configurado como variable secreta en EAS (`GOOGLE_SERVICES_JSON`) para entornos `production` y `preview`.
- `app.json`: `owner` actualizado a `instaj`, nuevo `projectId: e77b81ed-087c-4f3f-8f52-8523ed24b9cc`.

---

## [2026-05-12] — Fixes admin y documentos

### Fix
- `get_processed_documents_for_admin`: Calificaciones de columna `id` y nombre de columna incorrectos.
- `AdminDocumentsScreen`: Crash por `selectedDoc` nulo.
- Perfil de usuario: campo `is_admin` incluido al cargar el perfil en el store.
- Permisos admin: usar `is_admin` en lugar de `role='support'`.

---

## Sistema de colores (Design Tokens)

| Nombre | Valor | Uso |
|--------|-------|-----|
| Gradiente oscuro | `['#0E2699','#1230B8','#1A3FCC']` | Botones primarios, íconos activos |
| Gradiente pronunciado | `['#D6E0FF','#BDCEFF','#A8BBFF']` | Fondos de énfasis |
| Gradiente suave | `['#F8F9FF','#EEF2FF','#E4EBFF']` | Info cards, fondos secundarios |
| Fondo pantalla | `#F4F6FF` | `backgroundColor` en SafeAreaView |
| Sombra | `#0E2699` | `shadowColor` en cards y botones |
| Borde card | `#E9EBF2` | `borderColor` en cards |
| Borde sección | `#D6E0FF` | Separadores, bordes de input |
