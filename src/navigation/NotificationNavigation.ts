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
  'trip_started',
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
    // Confirmar el viaje: la tarjeta de confirmación está en Viajes Activos.
    case 'trip_confirm':
      return { screenName: 'ActiveTrips', params: {} }

    case 'review_received':
      return { screenName: 'Reviews', params: {} }

    case 'trip_completed':
    case 'trip_rated':
      return {
        screenName: 'CompletedTrips',
        params: requestId ? { requestId } : {},
      }

    case 'booking':
      if (requestId) {
        return { screenName: 'AirportRequestDetails', params: { requestId } }
      }
      return null

    case 'message':
      return {
        screenName: 'Main',
        params: { screen: 'Requests' },
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
  }
  return icons[notificationType] || '🔔'
}

export function getNotificationColor(notificationType: Notification['type']): string {
  const colors: Record<string, string> = {
    trip_published: COLORS.primaryDark,
    offer_received: COLORS.warning,
    offer_accepted: COLORS.success,
    trip_confirmed: COLORS.success,
    trip_started: COLORS.primary,
    trip_completed: COLORS.primary,
    trip_rated: COLORS.primary,
    trip_update: COLORS.primaryDark,
    booking: COLORS.primaryDark,
    driver_arrived: COLORS.primary,
    review_pending: COLORS.primary,
    message: COLORS.primary,
  }
  return colors[notificationType] || COLORS.textSecondary
}
