/**
 * realtimeSubscriptions.ts
 * 
 * Gestiona todas las suscripciones realtime de Supabase para cambios en
 * airport_requests y airport_offers.
 * 
 * Proporciona funciones para:
 * - Escuchar cambios en solicitudes del pasajero
 * - Escuchar cambios en feed de conductores
 * - Escuchar cambios en ofertas de una solicitud
 * - Escuchar cambios en ofertas del conductor
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface RealtimeSubscriptionHandlers {
  onInsert?: (data: any) => void
  onUpdate?: (data: any) => void
  onDelete?: (data: any) => void
  onError?: (error: Error) => void
}

/**
 * Suscribirse a cambios en solicitudes del pasajero
 */
export function subscribeToPassengerRequests(
  passengerId: string,
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(`passenger_requests_${passengerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'airport_requests',
        filter: `passenger_id=eq.${passengerId}`,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handlers.onUpdate?.(payload.new)
          } else if (payload.eventType === 'DELETE') {
            handlers.onDelete?.(payload.old)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a cambios en el feed de conductores (solicitudes pendientes)
 */
export function subscribeToDriverFeed(
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel('driver_feed_pending')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'airport_requests',
        filter: 'status=eq.pending',
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handlers.onUpdate?.(payload.new)
          } else if (payload.eventType === 'DELETE') {
            handlers.onDelete?.(payload.old)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a cambios en ofertas de una solicitud específica
 */
export function subscribeToRequestOffers(
  requestId: string,
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(`request_offers_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'airport_offers',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handlers.onUpdate?.(payload.new)
          } else if (payload.eventType === 'DELETE') {
            handlers.onDelete?.(payload.old)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a cambios en ofertas del conductor
 */
export function subscribeToDriverOffers(
  driverId: string,
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(`driver_offers_${driverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'airport_offers',
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handlers.onUpdate?.(payload.new)
          } else if (payload.eventType === 'DELETE') {
            handlers.onDelete?.(payload.old)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a cambios en solicitudes activas del conductor
 * (solicitudes que acepta - status != 'pending')
 */
export function subscribeToDriverActiveRequests(
  driverId: string,
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(`driver_active_requests_${driverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'airport_requests',
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handlers.onUpdate?.(payload.new)
          } else if (payload.eventType === 'DELETE') {
            handlers.onDelete?.(payload.old)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Suscribirse a cambios en calificaciones de un viaje
 */
export function subscribeToTripRatings(
  requestId: string,
  handlers: RealtimeSubscriptionHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(`trip_ratings_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_ratings',
        filter: `trip_id=eq.${requestId}`,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            handlers.onInsert?.(payload.new)
          }
        } catch (error: any) {
          handlers.onError?.(error)
        }
      }
    )
    .subscribe()

  return channel
}
