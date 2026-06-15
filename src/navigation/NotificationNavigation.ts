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

  if (airportActiveTypes.has(notification.type)) {
    if (isDriver) {
      return {
        screenName: 'AirportFeed',
        params: requestId ? { requestId } : {},
      }
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
    trip_published: '#0E2699',
    offer_received: '#F59E0B',
    offer_accepted: '#10B981',
    trip_confirmed: '#10B981',
    trip_started: '#3B82F6',
    trip_completed: '#8B5CF6',
    trip_rated: '#EC4899',
    trip_update: '#0E2699',
    booking: '#0E2699',
    driver_arrived: '#3B82F6',
    review_pending: '#EC4899',
    message: '#6366F1',
  }
  return colors[notificationType] || '#6B7280'
}
