import { useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { insertNotificationForUser } from '../services/notificationInsert'

export interface AirportRequest {
  id: string
  passenger_id: string
  driver_id: string | null
  origin: string
  destination: string
  departure_time: string
  passengers: number
  offered_price: number
  status: 'pending' | 'accepted' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  accepted_at: string | null
  cancelled_at: string | null
  // enriched
  passenger_name?: string
  passenger_avatar_url?: string | null
  driver_name?: string
  driver_avatar_url?: string | null
  driver_rating?: number
}

export interface CreateAirportRequestData {
  passenger_id: string
  origin: string
  destination?: string
  departure_time: string
  passengers: number
  offered_price: number
  notes?: string
}


export const useAirportRequests = () => {
  const [requests, setRequests] = useState<AirportRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRequest = async (data: CreateAirportRequestData): Promise<AirportRequest> => {
    try {
      setError(null)

      const { data: inserted, error: insertError } = await supabase
        .from('airport_requests')
        .insert([{
          passenger_id: data.passenger_id,
          origin: data.origin,
          destination: data.destination ?? 'Aeropuerto',
          departure_time: data.departure_time,
          passengers: data.passengers,
          offered_price: data.offered_price,
          notes: data.notes ?? null,
          status: 'pending',
        }])
        .select()
        .single()

      if (insertError) throw insertError
      return inserted as AirportRequest
    } catch (err: any) {
      const message = err.message || 'Error al publicar solicitud'
      setError(message)
      throw err
    }
  }

  const loadPassengerRequests = useCallback(async (passengerId: string): Promise<AirportRequest[]> => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      const result = (data || []) as AirportRequest[]

      // Enrich with driver info for accepted requests
      const acceptedWithDriver = result.filter(r => r.driver_id)
      if (acceptedWithDriver.length > 0) {
        const driverIds = Array.from(new Set(acceptedWithDriver.map(r => r.driver_id!)))
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, rating')
          .in('id', driverIds)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        result.forEach(r => {
          if (r.driver_id) {
            const p = profileMap.get(r.driver_id)
            if (p) {
              r.driver_name = p.name
              r.driver_avatar_url = p.avatar_url ?? null
              r.driver_rating = p.rating ?? 0
            }
          }
        })
      }

      setRequests(result)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar solicitudes'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDriverFeed = useCallback(async (): Promise<AirportRequest[]> => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('status', 'pending')
        .order('departure_time', { ascending: true })

      if (fetchError) throw fetchError

      const result = (data || []) as AirportRequest[]

      // Enrich with passenger info
      if (result.length > 0) {
        const passengerIds = Array.from(new Set(result.map(r => r.passenger_id)))
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', passengerIds)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        result.forEach(r => {
          const p = profileMap.get(r.passenger_id)
          if (p) {
            r.passenger_name = p.name
            r.passenger_avatar_url = p.avatar_url ?? null
          }
        })
      }

      setRequests(result)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar feed'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // El cobro de $5.000 y la aceptación ocurren en una sola transacción del servidor.
  const acceptRequest = async (requestId: string, driverId: string): Promise<void> => {
    try {
      setError(null)

      const { error: acceptError } = await supabase.rpc('accept_request_direct', {
        p_request_id: requestId,
      })
      if (acceptError) throw acceptError

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', driverId)
        .single()

      const { data: reqData } = await supabase
        .from('airport_requests')
        .select('passenger_id, origin, destination, departure_time, passengers, offered_price')
        .eq('id', requestId)
        .single()

      if (!reqData) return

      // Notificar al pasajero con los datos del viaje
      const driverName = profile?.name || 'Tu conductor'
      insertNotificationForUser(reqData.passenger_id, {
        user_id: reqData.passenger_id,
        type: 'trip_update',
        title: '✈️ ¡Tienes conductor para tu viaje!',
        message: `${driverName} aceptó tu solicitud de aeropuerto.`,
        data: {
          request_id: requestId,
          driver_name: driverName,
          driver_id: driverId,
          origin: reqData?.origin,
          destination: reqData?.destination,
          trip_date: reqData?.departure_time,
          price: reqData?.offered_price,
          passengers: reqData?.passengers,
        },
        is_read: false,
      }).catch(() => {})

      // Update local state
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err: any) {
      const message = err.message || 'Error al aceptar solicitud'
      setError(message)
      throw err
    }
  }

  const cancelRequest = async (requestId: string, passengerId: string): Promise<void> => {
    try {
      setError(null)

      const { data: current, error: fetchError } = await supabase
        .from('airport_requests')
        .select('status, driver_id')
        .eq('id', requestId)
        .eq('passenger_id', passengerId)
        .single()

      if (fetchError) throw fetchError
      if (!current) throw new Error('Solicitud no encontrada')
      if (current.status === 'cancelled') throw new Error('La solicitud ya está cancelada')
      if (current.status === 'completed') throw new Error('No puedes cancelar un viaje completado')

      // El servidor devuelve la comisión al conductor si ya la había pagado
      const { error: updateError } = await supabase.rpc('cancel_airport_request', {
        p_request_id: requestId,
      })

      if (updateError) throw updateError

      // Notify driver if there was one
      if (current.driver_id) {
        const { data: reqInfo } = await supabase
          .from('airport_requests')
          .select('origin, destination, departure_time, offered_price')
          .eq('id', requestId)
          .single()

        insertNotificationForUser(current.driver_id, {
          user_id: current.driver_id,
          type: 'trip_update',
          title: '❌ Viaje cancelado',
          message: 'El pasajero canceló el viaje al aeropuerto.',
          data: {
            request_id: requestId,
            origin: reqInfo?.origin,
            destination: reqInfo?.destination,
            trip_date: reqInfo?.departure_time,
            price: reqInfo?.offered_price,
          },
          is_read: false,
        }).catch(() => {})
      }

      setRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? { ...r, status: 'cancelled', cancelled_at: new Date().toISOString() }
            : r
        )
      )
    } catch (err: any) {
      const message = err.message || 'Error al cancelar solicitud'
      setError(message)
      throw err
    }
  }

  return {
    requests,
    loading,
    error,
    createRequest,
    loadPassengerRequests,
    loadDriverFeed,
    acceptRequest,
    cancelRequest,
  }
}
