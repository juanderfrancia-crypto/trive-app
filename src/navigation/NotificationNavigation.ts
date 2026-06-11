/**
 * NotificationNavigation.ts
 * 
 * Maneja la navegación desde notificaciones directamente a las pantallas relevantes.
 * Permite que el usuario toque una notificación y vaya directamente al contexto adecuado.
 */

import type { Notification } from '../hooks/useNotifications'

export interface NotificationRoute {
  screenName: string
  params: Record<string, any>
}

/**
 * Convierte una notificación en una ruta de navegación
 * @param notification - La notificación que el usuario tocó
 * @returns Objeto con screenName y params para navegar
 */
export function getNotificationRoute(notification: Notification): NotificationRoute | null {
  const data = notification.data || {}

  switch (notification.type) {
    // 📍 Viaje publicado - Ir a solicitudes activas
    case 'trip_published':
      return {
        screenName: 'AirportRequestDetails',
        params: { requestId: data.request_id },
      }

    // 💬 Oferta recibida - Ir a detalles de solicitud para ver ofertas
    case 'offer_received':
      return {
        screenName: 'AirportRequestDetails',
        params: { requestId: data.request_id },
      }

    // ✅ Oferta aceptada - Ir a viajes activos
    case 'offer_accepted':
      return {
        screenName: 'ActiveTrips',
        params: { requestId: data.request_id },
      }

    // ✅ Viaje confirmado - Ir a viajes activos
    case 'trip_confirmed':
      return {
        screenName: 'ActiveTrips',
        params: { requestId: data.request_id },
      }

    // 🚗 Viaje iniciado - Ir a viajes activos (mapa/seguimiento)
    case 'trip_started':
      return {
        screenName: 'ActiveTrips',
        params: { requestId: data.request_id },
      }

    // ✔️ Viaje completado - Ir a pantalla de calificación
    case 'trip_completed':
      return {
        screenName: 'TripRating',
        params: { 
          requestId: data.request_id,
          driverName: data.driver_name,
          driverId: data.driver_id,
        },
      }

    // ⭐ Viaje calificado - Ir a historial
    case 'trip_rated':
      return {
        screenName: 'CompletedTrips',
        params: { requestId: data.request_id },
      }

    // Legacy types - Mantener compatibilidad
    case 'trip_update':
      return {
        screenName: 'AirportRequestDetails',
        params: { requestId: data.request_id },
      }

    case 'booking':
      return {
        screenName: 'AirportRequestDetails',
        params: { requestId: data.request_id || data.booking_id },
      }

    case 'message':
      return {
        screenName: 'Chat',
        params: { conversationId: data.conversation_id },
      }

    default:
      return null
  }
}

/**
 * Obtiene un icono/emoji apropiado para cada tipo de notificación
 */
export function getNotificationIcon(notificationType: Notification['type']): string {
  const icons: Record<Notification['type'], string> = {
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
    trip_completed: '✔️',
    review_pending: '⭐',
    message: '💬',
  }
  return icons[notificationType] || '🔔'
}

/**
 * Obtiene un color para cada tipo de notificación
 */
export function getNotificationColor(notificationType: Notification['type']): string {
  const colors: Record<Notification['type'], string> = {
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
    trip_completed: '#8B5CF6',
    review_pending: '#EC4899',
    message: '#6366F1',
  }
  return colors[notificationType] || '#6B7280'
}
