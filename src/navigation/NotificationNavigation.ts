import { COLORS } from '../theme/theme'
/**
 * NotificationNavigation.ts
 *
 * Convierte notificaciones en rutas de navegación según tipo y rol del usuario.
 */

import type { Notification } from '../hooks/useNotifications'

export interface NotificationRoute {
  screenName: string
  params: Record<string, any>
}

type UserRole = 'passenger' | 'driver' | 'support' | undefined

const airportDetailTypes = new Set([
  'trip_published',
  'offer_received',
  'trip_update',
])

const airportActiveTypes = new Set([
  'offer_accepted',
  'trip_confirmed',
])

export function getNotificationRoute(
  notification: Notification,
  userRole?: UserRole
): NotificationRoute | null {
  const data = notification.data || {}
  const requestId = data.request_id as string | undefined
  const isDriver = userRole === 'driver'

  if (airportDetailTypes.has(notification.type) && requestId) {
    return {
      screenName: 'AirportRequestDetails',
      params: { requestId },
    }
  }

  if (notification.type === 'trip_published') {
    if (isDriver) {
      return { screenName: 'DriverPanel', params: {} }
    }
    // Va directo a reservar esa ruta puntual (route_id ya viene en la notificación),
    // en vez de a la lista de "Viajes ahora": esa lista filtra por hoy en modo
    // búsqueda, y una ruta publicada para mañana quedaría invisible justo en el
    // camino más directo para reservarla.
    const routeId = data.route_id as string | undefined
    if (routeId) {
      return {
        screenName: 'SeatSelection',
        params: { routeId, origin: data.origin, destination: data.destination },
      }
    }
    return {
      screenName: 'AvailableRides',
      params: { origin: data.origin, destination: data.destination },
    }
  }

  if (airportActiveTypes.has(notification.type)) {
    if (isDriver) {
      return { screenName: 'Main', params: { screen: 'Requests' } }
    }
    if (requestId) {
      return {
        screenName: 'AirportRequestDetails',
        params: { requestId },
      }
    }
    return { screenName: 'Main', params: { screen: 'Requests' } }
  }

  switch (notification.type) {
    // Recordatorio de perfil incompleto (correo de recuperación, contacto de emergencia,
    // municipio) -- lleva directo a la pantalla donde se resuelve cada uno.
    case 'profile_incomplete': {
      const pendingKey = data.pending_key as string | undefined
      if (pendingKey === 'recovery_email') {
        return { screenName: 'RecoveryEmail', params: {} }
      }
      if (pendingKey === 'emergency_contact') {
        return { screenName: 'Settings', params: { openEmergencyContact: true } }
      }
      if (pendingKey === 'municipality') {
        return { screenName: 'Settings', params: { openMunicipality: true } }
      }
      return { screenName: 'Settings', params: {} }
    }

    // Confirmar el viaje: la tarjeta de confirmación está en Mis viajes.
    case 'trip_confirm':
      return { screenName: 'Main', params: { screen: 'Search' } }

    // El conductor inició el viaje normal (driver_set_route_status) -- solo existe
    // para rutas normales, nunca personalizadas, así que no hace falta distinguir
    // por request_id. La tarjeta "Tu próximo viaje" está en Mis viajes.
    case 'trip_started':
      return { screenName: 'Main', params: { screen: 'Search' } }

    // Viaje lleno (update_route_available_seats) o ruta publicada con autoconfirmación
    // (PublishRouteFlow/RecurringRoutesScreen) -- ninguno trae request_id, así que no
    // entran en airportDetailTypes. La tarjeta del viaje está en Mis viajes.
    case 'trip_update':
      return { screenName: 'Main', params: { screen: 'Search' } }

    case 'review_received':
      return { screenName: 'Reviews', params: {} }

    // Rating de ruta personalizada: vive en el historial del hub de Solicitudes.
    case 'trip_rated':
      return { screenName: 'Main', params: { screen: 'Requests' } }

    // trip_completed lo usan tanto rutas normales (complete_booking_internal) como
    // personalizadas (completeTrip) -- request_id solo viene en las personalizadas.
    // Para la ruta normal se deja caer al detalle (return null más abajo), que ya
    // tiene el botón "Calificar conductor" para ese caso.
    case 'trip_completed':
      if (requestId) {
        return { screenName: 'Main', params: { screen: 'Requests' } }
      }
      return null

    case 'booking':
      if (requestId) {
        return { screenName: 'AirportRequestDetails', params: { requestId } }
      }
      return null

    // Mensaje de un viaje normal: el chat vive en Mis viajes, no en Solicitudes
    // (eso es solo para la negociación de viajes al aeropuerto).
    case 'message':
      return {
        screenName: 'Main',
        params: { screen: 'Search' },
      }

    default:
      return null
  }
}

export function getNotificationIcon(notificationType: Notification['type']): string {
  const icons: Record<string, string> = {
    trip_published: '📍',
    offer_received: '💬',
    offer_accepted: '✅',
    trip_confirmed: '✅',
    trip_started: '🚗',
    trip_confirm: '🙋',
    review_received: '⭐',
    trip_completed: '✔️',
    trip_rated: '⭐',
    trip_update: '✈️',
    booking: '🔖',
    driver_arrived: '🚗',
    review_pending: '⭐',
    message: '💬',
    profile_incomplete: '📝',
  }
  return icons[notificationType] || '🔔'
}

export function getNotificationColor(notificationType: Notification['type']): string {
  const colors: Record<string, string> = {
    trip_published: COLORS.primaryDark,
    offer_received: COLORS.warning,
    offer_accepted: COLORS.primary,
    trip_confirmed: COLORS.primary,
    trip_started: COLORS.primary,
    trip_completed: COLORS.primary,
    trip_rated: COLORS.primary,
    trip_update: COLORS.primaryDark,
    booking: COLORS.primaryDark,
    driver_arrived: COLORS.primary,
    review_pending: COLORS.primary,
    message: COLORS.primary,
    profile_incomplete: COLORS.warning,
  }
  return colors[notificationType] || COLORS.textSecondary
}
