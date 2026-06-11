import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { insertNotificationForUser } from '../services/notificationInsert'
import { 
  subscribeToPassengerRequests, 
  subscribeToDriverFeed, 
  subscribeToRequestOffers,
  subscribeToDriverActiveRequests,
  subscribeToTripRatings,
} from '../services/realtimeSubscriptions'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface AirportRequest {
  id: string
  passenger_id: string
  driver_id: string | null
  origin: string
  destination: string
  departure_time: string
  passengers: number
  initial_price: number
  offered_price: number
  status: 'pending' | 'accepted' | 'completed' | 'cancelled'
  trip_type: 'airport' | 'city_destination' | 'custom'
  notes: string | null
  created_at: string
  accepted_at: string | null
  price_updated_at: string | null
  // enriched
  passenger_name?: string
  passenger_avatar_url?: string | null
  driver_name?: string
  driver_avatar_url?: string | null
  driver_rating?: number
}

export interface AirportOffer {
  id: string
  request_id: string
  driver_id: string
  proposed_price: number | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  responded_at: string | null
  // enriched
  driver_name?: string
  driver_avatar_url?: string | null
  driver_rating?: number
}

export interface TripRating {
  id: string
  trip_id: string
  rater_id: string
  rated_id: string
  rating: number
  comment?: string
  created_at: string
  updated_at: string
}

export interface CreateAirportRequestData {
  passenger_id: string
  origin: string
  destination?: string
  departure_time: string
  passengers: number
  offered_price: number
  trip_type: 'airport' | 'city_destination' | 'custom'
  notes?: string
}

const AIRPORT_COMMISSION = 5000

export const useAirportNegotiation = () => {
  const [requests, setRequests] = useState<AirportRequest[]>([])
  const [offers, setOffers] = useState<AirportOffer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())

  // ─── Cleanup listeners ─────────────────────────────────────────────
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channelsRef.current.clear()
  }, [])

  useEffect(() => {
    return () => cleanupChannels()
  }, [cleanupChannels])

  // ─── Crear solicitud ──────────────────────────────────────────────
  const createRequest = async (data: CreateAirportRequestData): Promise<AirportRequest> => {
    try {
      setError(null)

      const { data: inserted, error: insertError } = await supabase
        .from('airport_requests')
        .insert([{
          passenger_id: data.passenger_id,
          origin: data.origin,
          destination: data.destination ?? 'Destino',
          departure_time: data.departure_time,
          passengers: data.passengers,
          initial_price: data.offered_price,
          offered_price: data.offered_price,
          trip_type: data.trip_type,
          notes: data.notes ?? null,
          status: 'pending',
        }])
        .select()
        .single()

      if (insertError) throw insertError
      
      const newRequest = inserted as AirportRequest
      // Actualizar estado local para que aparezca inmediatamente
      setRequests(prev => [newRequest, ...prev])

      // 🔔 Enviar notificación de viaje publicado al pasajero
      console.log('🟡 [HOOK] Enviando notificación de viaje publicado')
      insertNotificationForUser(data.passenger_id, {
        user_id: data.passenger_id,
        type: 'trip_published',
        title: '📍 ¡Viaje publicado!',
        message: `Tu solicitud de ${data.origin} a ${data.destination} está buscando conductores`,
        data: {
          request_id: newRequest.id,
          origin: data.origin,
          destination: data.destination,
          price: data.offered_price,
        },
        is_read: false,
      }).catch((notifErr) => {
        console.error('⚠️ [HOOK] Error enviando notificación de publicación:', notifErr)
      })
      console.log('✅ [HOOK] Notificación de viaje publicado enviada')
      
      return newRequest
    } catch (err: any) {
      const message = err.message || 'Error al publicar solicitud'
      setError(message)
      throw err
    }
  }

  // ─── Cargar solicitudes del pasajero ────────────────────────────────
  const loadPassengerRequests = useCallback(async (passengerId: string): Promise<AirportRequest[]> => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const result = (data || []) as AirportRequest[]

      // Enrich with driver info
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

      // Setup realtime listener
      const channel = supabase
        .channel(`passenger_requests_${passengerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'airport_requests', filter: `passenger_id=eq.${passengerId}` },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setRequests(prev =>
                prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)
              )
            } else if (payload.eventType === 'INSERT') {
              setRequests(prev => [payload.new as AirportRequest, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => prev.filter(r => r.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      channelsRef.current.set(`passenger_requests_${passengerId}`, channel)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar solicitudes'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Cargar viajes activos del conductor (accepted e in_progress) ──────────
  const loadDriverActiveTrips = useCallback(async (driverId: string): Promise<AirportRequest[]> => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'in_progress'])
        .order('departure_time', { ascending: true })

      if (fetchError) throw fetchError

      const result = (data || []) as AirportRequest[]

      // Enrich with passenger info
      const passengerIds = Array.from(new Set(result.map(r => r.passenger_id)))
      if (passengerIds.length > 0) {
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

      // Setup realtime listener for driver's active trips
      const channel = supabase
        .channel(`driver_active_trips_${driverId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'airport_requests', 
            filter: `driver_id=eq.${driverId}` 
          },
          (payload) => {
            // Only update if status is accepted or in_progress
            if (payload.eventType === 'UPDATE') {
              const newData = payload.new as AirportRequest
              if (newData.status === 'accepted' || newData.status === 'in_progress') {
                setRequests(prev =>
                  prev.map(r => r.id === newData.id ? { ...r, ...newData } : r)
                )
              } else {
                // Remove if status changed to something else
                setRequests(prev => prev.filter(r => r.id !== newData.id))
              }
            } else if (payload.eventType === 'INSERT') {
              const newData = payload.new as AirportRequest
              if (newData.status === 'accepted' || newData.status === 'in_progress') {
                setRequests(prev => [newData, ...prev])
              }
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => prev.filter(r => r.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      channelsRef.current.set(`driver_active_trips_${driverId}`, channel)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar viajes activos'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Cargar viajes activos del pasajero (accepted e in_progress) ─────────────
  const loadPassengerActiveTrips = useCallback(async (passengerId: string): Promise<AirportRequest[]> => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('passenger_id', passengerId)
        .in('status', ['accepted', 'in_progress'])
        .order('departure_time', { ascending: true })

      if (fetchError) throw fetchError

      const result = (data || []) as AirportRequest[]

      // Enrich with driver info
      const driverIds = Array.from(new Set(result.filter(r => r.driver_id).map(r => r.driver_id!)))
      if (driverIds.length > 0) {
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

      // Setup realtime listener for passenger's active trips
      const channel = supabase
        .channel(`passenger_active_trips_${passengerId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'airport_requests', 
            filter: `passenger_id=eq.${passengerId}` 
          },
          (payload) => {
            // Only update if status is accepted or in_progress
            if (payload.eventType === 'UPDATE') {
              const newData = payload.new as AirportRequest
              if (newData.status === 'accepted' || newData.status === 'in_progress') {
                setRequests(prev =>
                  prev.map(r => r.id === newData.id ? { ...r, ...newData } : r)
                )
              } else {
                // Remove if status changed to something else
                setRequests(prev => prev.filter(r => r.id !== newData.id))
              }
            } else if (payload.eventType === 'INSERT') {
              const newData = payload.new as AirportRequest
              if (newData.status === 'accepted' || newData.status === 'in_progress') {
                setRequests(prev => [newData, ...prev])
              }
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => prev.filter(r => r.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      channelsRef.current.set(`passenger_active_trips_${passengerId}`, channel)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar viajes activos'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Cargar feed para conductor ────────────────────────────────────
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

      // Setup realtime listener para pending requests
      const channel = supabase
        .channel('driver_feed_pending')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'airport_requests', filter: 'status=eq.pending' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setRequests(prev =>
                prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)
              )
            } else if (payload.eventType === 'INSERT') {
              setRequests(prev => [payload.new as AirportRequest, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => prev.filter(r => r.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      channelsRef.current.set('driver_feed_pending', channel)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar feed'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Cargar ofertas de una solicitud ───────────────────────────────
  const loadOffersForRequest = useCallback(async (requestId: string): Promise<AirportOffer[]> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('airport_offers')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const result = (data || []) as AirportOffer[]

      // Enrich with driver info
      if (result.length > 0) {
        const driverIds = Array.from(new Set(result.map(r => r.driver_id)))
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, rating')
          .in('id', driverIds)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        result.forEach(r => {
          const p = profileMap.get(r.driver_id)
          if (p) {
            r.driver_name = p.name
            r.driver_avatar_url = p.avatar_url ?? null
            r.driver_rating = p.rating ?? 0
          }
        })
      }

      setOffers(result)

      // Setup realtime listener
      const channel = supabase
        .channel(`request_offers_${requestId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'airport_offers', filter: `request_id=eq.${requestId}` },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setOffers(prev =>
                prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
              )
            } else if (payload.eventType === 'INSERT') {
              setOffers(prev => [payload.new as AirportOffer, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setOffers(prev => prev.filter(o => o.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      channelsRef.current.set(`request_offers_${requestId}`, channel)
      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar ofertas'
      setError(message)
      return []
    }
  }, [])

  // ─── Crear oferta (conductor propone precio o acepta) ───────────────
  const createOffer = async (requestId: string, driverId: string, proposedPrice?: number): Promise<AirportOffer> => {
    try {
      setError(null)

      // Buscar si existe una oferta pendiente anterior del mismo conductor
      const { data: existingOffers } = await supabase
        .from('airport_offers')
        .select('id')
        .eq('request_id', requestId)
        .eq('driver_id', driverId)
        .eq('status', 'pending')

      // Si existe una oferta anterior, rechazarla primero
      if (existingOffers && existingOffers.length > 0) {
        // Rechazar todas las ofertas anteriores pendientes
        await Promise.all(
          existingOffers.map(offer =>
            supabase
              .from('airport_offers')
              .update({ 
                status: 'rejected', 
                responded_at: new Date().toISOString() 
              })
              .eq('id', offer.id)
          )
        )
      }

      // Crear la nueva oferta
      const { data: inserted, error: insertError } = await supabase
        .from('airport_offers')
        .insert([{
          request_id: requestId,
          driver_id: driverId,
          proposed_price: proposedPrice ?? null,
          status: 'pending',
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Obtener info del conductor
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, rating')
        .eq('id', driverId)
        .single()

      const offer = inserted as AirportOffer
      if (profile) {
        offer.driver_name = profile.name
        offer.driver_avatar_url = profile.avatar_url ?? null
        offer.driver_rating = profile.rating ?? 0
      }

      // Notificar al pasajero
      const { data: reqData } = await supabase
        .from('airport_requests')
        .select('passenger_id, origin, destination, departure_time, offered_price')
        .eq('id', requestId)
        .single()

      if (reqData && profile) {
        const driverName = profile.name || 'Un conductor'
        const displayPrice = proposedPrice ?? reqData.offered_price
        insertNotificationForUser(reqData.passenger_id, {
          user_id: reqData.passenger_id,
          type: 'trip_update',
          title: '✈️ Nueva oferta de conductor',
          message: `${driverName} propone $${displayPrice.toLocaleString('es-CO')}`,
          data: {
            request_id: requestId,
            driver_id: driverId,
            driver_name: driverName,
            proposed_price: displayPrice,
            origin: reqData.origin,
            destination: reqData.destination,
          },
          is_read: false,
        }).catch(() => {})
      }

      return offer
    } catch (err: any) {
      const message = err.message || 'Error al crear oferta'
      setError(message)
      throw err
    }
  }

  // ─── Aceptar oferta (conductor) ────────────────────────────────────────
  // Esta función es para cuando un CONDUCTOR acepta una solicitud de pasajero
  const acceptOffer = async (offerId: string, requestId: string): Promise<void> => {
    try {
      setError(null)

      // ⭐ SOLO verificar balance, NO deducir aquí (la RPC se encarga)
      const { data: profile, error: balanceError } = await supabase
        .from('profiles')
        .select('balance, name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (balanceError) throw balanceError

      const currentBalance = profile?.balance ?? 0
      if (currentBalance < AIRPORT_COMMISSION) {
        const err = new Error(
          `Necesitas $${AIRPORT_COMMISSION.toLocaleString('es-CO')} para aceptar este viaje.\nTu saldo actual es $${currentBalance.toLocaleString('es-CO')}.`
        )
        ;(err as any).code = 'INSUFFICIENT_BALANCE'
        throw err
      }

      // 🚀 Llamar función RPC que se encarga de:
      // 1. Deducir comisión del balance
      // 2. Crear registro de pago
      // 3. Aceptar oferta
      // 4. Actualizar solicitud
      const { error: rpcError } = await supabase
        .rpc('accept_airport_offer', { offer_id: offerId })

      if (rpcError) {
        // No hay rollback necesario - la RPC es atómica
        throw rpcError
      }

      console.log('✅[HOOK] Oferta aceptada exitosamente - La RPC dedujo el pago');

      // Obtener detalles finales para notificación
      const { data: reqData } = await supabase
        .from('airport_requests')
        .select('passenger_id, origin, destination, offered_price, driver_id')
        .eq('id', requestId)
        .single()

      if (reqData && profile) {
        insertNotificationForUser(reqData.passenger_id, {
          user_id: reqData.passenger_id,
          type: 'trip_update',
          title: '✈️ ¡Tienes conductor!',
          message: `${profile.name} aceptó tu solicitud`,
          data: {
            request_id: requestId,
            driver_id: reqData.driver_id,
            driver_name: profile.name,
            price: reqData.offered_price,
          },
          is_read: false,
        }).catch(() => {})
      }
    } catch (err: any) {
      const message = err.message || 'Error al aceptar oferta'
      setError(message)
      throw err
    }
  }

  // ─── Pasajero acepta contrapropuesta de conductor ──────────────────────
  // Esta función es para cuando un PASAJERO acepta una oferta de un conductor
  const acceptPassengerOffer = async (offerId: string, requestId: string): Promise<void> => {
    try {
      setError(null)
      console.log('🟡 [HOOK] acceptPassengerOffer iniciado:', { offerId, requestId })

      // Solo aceptar la oferta sin verificar balance (pasajeros no pagan comisión)
      console.log('🟡 [HOOK] Llamando RPC accept_airport_offer...')
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('accept_airport_offer', { offer_id: offerId })

      console.log('🟡 [HOOK] Respuesta RPC:', { rpcData, rpcError })
      if (rpcError) {
        console.error('❌ [HOOK] Error en RPC:', rpcError)
        throw rpcError
      }
      console.log('✅ [HOOK] RPC ejecutado exitosamente')

      // Obtener detalles del conductor, viaje y pasajero para notificaciones
      console.log('🟡 [HOOK] Obteniendo detalles de oferta, conductor y solicitud...')
      const { data: offer, error: offerError } = await supabase
        .from('airport_offers')
        .select('driver_id')
        .eq('id', offerId)
        .single()

      if (offerError) {
        console.error('⚠️ [HOOK] Error obteniendo oferta:', offerError)
      }

      if (offer) {
        console.log('🟡 [HOOK] Oferta encontrada, driver_id:', offer.driver_id)
        
        // Obtener datos del viaje
        const { data: tripData, error: tripError } = await supabase
          .from('airport_requests')
          .select('passenger_id, origin, destination, offered_price, driver_id')
          .eq('id', requestId)
          .single()

        if (tripError) {
          console.error('⚠️ [HOOK] Error obteniendo datos del viaje:', tripError)
        }

        if (tripData) {
          // Obtener detalles del conductor
          const { data: driverProfile, error: profileError } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', offer.driver_id)
            .single()

          // Obtener detalles del pasajero
          const { data: passengerProfile, error: passengerError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', tripData.passenger_id)
            .single()

          if (!profileError && driverProfile && !passengerError && passengerProfile) {
            console.log('🟡 [HOOK] Enviando notificaciones al conductor y pasajero')

            // 🔔 Notificación al CONDUCTOR: Viaje confirmado
            insertNotificationForUser(offer.driver_id, {
              user_id: offer.driver_id,
              type: 'trip_confirmed',
              title: '✅ ¡Viaje confirmado!',
              message: `${passengerProfile.name} aceptó tu oferta en ${tripData.origin}`,
              data: {
                request_id: requestId,
                offer_id: offerId,
                passenger_id: tripData.passenger_id,
                passenger_name: passengerProfile.name,
                origin: tripData.origin,
                destination: tripData.destination,
                price: tripData.offered_price,
              },
              is_read: false,
            }).catch((notifErr) => {
              console.error('⚠️ [HOOK] Error enviando notificación al conductor:', notifErr)
            })

            // 🔔 Notificación al PASAJERO: Conductor confirmado
            insertNotificationForUser(tripData.passenger_id, {
              user_id: tripData.passenger_id,
              type: 'trip_confirmed',
              title: '✅ ¡Conductor confirmado!',
              message: `${driverProfile.name} está listo para tu viaje`,
              data: {
                request_id: requestId,
                offer_id: offerId,
                driver_id: offer.driver_id,
                driver_name: driverProfile.name,
                driver_avatar_url: driverProfile.avatar_url,
                origin: tripData.origin,
                destination: tripData.destination,
                price: tripData.offered_price,
              },
              is_read: false,
            }).catch((notifErr) => {
              console.error('⚠️ [HOOK] Error enviando notificación al pasajero:', notifErr)
            })

            console.log('✅ [HOOK] Notificaciones enviadas')
          }
        }
      }
      console.log('✅ [HOOK] acceptPassengerOffer completado exitosamente')
    } catch (err: any) {
      const message = err.message || 'Error al aceptar oferta'
      console.error('❌ [HOOK] Excepción en acceptPassengerOffer:', message, err)
      setError(message)
      throw err
    }
  }

  // ─── Actualizar precio de solicitud ────────────────────────────────
  const updateRequestPrice = async (requestId: string, newPrice: number): Promise<void> => {
    try {
      setError(null)

      if (newPrice <= 0) {
        throw new Error('El precio debe ser mayor a 0')
      }

      const { error: updateError } = await supabase
        .rpc('update_airport_request_price', {
          request_id: requestId,
          new_price: newPrice,
        })

      if (updateError) throw updateError

      // Actualizar estado local
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, offered_price: newPrice, price_updated_at: new Date().toISOString() } : r)
      )

      // Notificar a conductores (mediante broadcast)
      const channel = supabase.channel(`price_update_${requestId}`)
      await channel.send({
        type: 'broadcast',
        event: 'price_changed',
        payload: { request_id: requestId, new_price: newPrice },
      })
    } catch (err: any) {
      const message = err.message || 'Error al actualizar precio'
      setError(message)
      throw err
    }
  }

  // ─── Rechazar/cancelar solicitud ───────────────────────────────────
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

      const { error: updateError } = await supabase
        .from('airport_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('passenger_id', passengerId)

      if (updateError) throw updateError

      // Notificar a conductores con ofertas pendientes
      if (current.driver_id) {
        insertNotificationForUser(current.driver_id, {
          user_id: current.driver_id,
          type: 'trip_update',
          title: '❌ Solicitud cancelada',
          message: 'El pasajero canceló la solicitud de aeropuerto',
          data: { request_id: requestId },
          is_read: false,
        }).catch(() => {})
      }

      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err: any) {
      const message = err.message || 'Error al cancelar solicitud'
      setError(message)
      throw err
    }
  }

  // ─── Cargar una solicitud individual por ID ──────────────────────────
  const loadSingleRequest = useCallback(async (requestId: string): Promise<AirportRequest | null> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('airport_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError
      if (!data) return null

      const result = data as AirportRequest

      // Enrich with driver info if accepted
      if (result.driver_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, rating')
          .eq('id', result.driver_id)
          .single()

        if (profile) {
          result.driver_name = profile.name
          result.driver_avatar_url = profile.avatar_url ?? null
          result.driver_rating = profile.rating ?? 0
        }
      }

      // Actualizar en el array si ya existe, sino agregarlo
      setRequests(prev => {
        const exists = prev.some(r => r.id === requestId)
        if (exists) {
          return prev.map(r => r.id === requestId ? result : r)
        } else {
          return [result, ...prev]
        }
      })

      return result
    } catch (err: any) {
      const message = err.message || 'Error al cargar solicitud'
      setError(message)
      return null
    }
  }, [])

  // ─── Iniciar viaje (conductor marca como "En Ruta") ────────────────────
  const startTrip = async (requestId: string): Promise<void> => {
    try {
      setError(null)
      console.log('🟡 [HOOK] Iniciando startTrip para requestId:', requestId)

      const { error: rpcError } = await supabase
        .rpc('start_trip', { v_request_id: requestId })

      if (rpcError) {
        console.error('❌ [HOOK] Error en startTrip RPC:', rpcError)
        throw rpcError
      }

      console.log('✅ [HOOK] Viaje iniciado exitosamente')

      // Actualizar el estado local
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'in_progress' as any } : r)
      )

      // Obtener detalles para notificación
      const { data: tripData } = await supabase
        .from('airport_requests')
        .select('passenger_id, driver_id, origin, destination, offered_price')
        .eq('id', requestId)
        .single()

      if (tripData && tripData.passenger_id) {
        // Notificar al pasajero que el viaje comenzó
        insertNotificationForUser(tripData.passenger_id, {
          user_id: tripData.passenger_id,
          type: 'trip_started',
          title: '🚗 ¡Tu viaje comenzó!',
          message: 'El conductor está en camino',
          data: {
            request_id: requestId,
            driver_id: tripData.driver_id,
          },
          is_read: false,
        }).catch(() => {})
      }
    } catch (err: any) {
      const message = err.message || 'Error al iniciar viaje'
      console.error('❌ [HOOK] Error en startTrip:', message)
      setError(message)
      throw err
    }
  }

  // ─── Completar viaje (conductor marca como "Completado") ─────────────────
  const completeTrip = async (requestId: string, notes?: string): Promise<void> => {
    try {
      setError(null)
      console.log('🟡 [HOOK] Iniciando completeTrip para requestId:', requestId)

      const { error: rpcError } = await supabase
        .rpc('complete_trip', { v_request_id: requestId, v_trip_notes: notes })

      if (rpcError) {
        console.error('❌ [HOOK] Error en completeTrip RPC:', rpcError)
        throw rpcError
      }

      console.log('✅ [HOOK] Viaje completado exitosamente')

      // Actualizar el estado local
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'completed' as any } : r)
      )

      // Obtener detalles para notificación
      const { data: tripData } = await supabase
        .from('airport_requests')
        .select('passenger_id, driver_id, origin, destination, offered_price')
        .eq('id', requestId)
        .single()

      if (tripData && tripData.passenger_id) {
        // Notificar al pasajero que el viaje terminó
        insertNotificationForUser(tripData.passenger_id, {
          user_id: tripData.passenger_id,
          type: 'trip_completed',
          title: '✔️ ¡Viaje completado!',
          message: 'Ya puedes calificar al conductor',
          data: {
            request_id: requestId,
            driver_id: tripData.driver_id,
          },
          is_read: false,
        }).catch(() => {})
      }
    } catch (err: any) {
      const message = err.message || 'Error al completar viaje'
      console.error('❌ [HOOK] Error en completeTrip:', message)
      setError(message)
      throw err
    }
  }

  // ─── Calificar viaje ──────────────────────────────────────────────────────
  const rateTrip = async (tripId: string, rating: number, comment?: string): Promise<void> => {
    try {
      setError(null)
      console.log('🟡 [HOOK] Iniciando rateTrip para tripId:', tripId, 'rating:', rating)

      if (rating < 1 || rating > 5) {
        throw new Error('La calificación debe estar entre 1 y 5')
      }

      const { error: rpcError } = await supabase
        .rpc('rate_trip', {
          v_trip_id: tripId,
          v_rating: rating,
          v_comment: comment,
        })

      if (rpcError) {
        console.error('❌ [HOOK] Error en rateTrip RPC:', rpcError)
        throw rpcError
      }

      console.log('✅ [HOOK] Viaje calificado exitosamente')

      // Obtener detalles del viaje para saber a quién notificar
      const { data: tripData } = await supabase
        .from('airport_requests')
        .select('passenger_id, driver_id')
        .eq('id', tripId)
        .single()

      if (tripData) {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id
        const recipientId = currentUserId === tripData.passenger_id ? tripData.driver_id : tripData.passenger_id

        if (recipientId) {
          // Notificar que fueron calificados
          insertNotificationForUser(recipientId, {
            user_id: recipientId,
            type: 'trip_rated',
            title: '⭐ Te han calificado',
            message: `Recibiste una calificación de ${rating} estrellas`,
            data: {
              request_id: tripId,
              rating,
            },
            is_read: false,
          }).catch(() => {})
        }
      }
    } catch (err: any) {
      const message = err.message || 'Error al calificar viaje'
      console.error('❌ [HOOK] Error en rateTrip:', message)
      setError(message)
      throw err
    }
  }

  // ─── Cargar calificaciones de un viaje ──────────────────────────────────
  const loadTripRatings = useCallback(async (requestId: string): Promise<TripRating[]> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('trip_ratings')
        .select('*')
        .eq('trip_id', requestId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return (data || []) as TripRating[]
    } catch (err: any) {
      const message = err.message || 'Error al cargar calificaciones'
      setError(message)
      return []
    }
  }, [])

  // ─── Suscribirse a cambios en calificaciones de un viaje ──────────────────
  const subscribeTripRatings = useCallback((requestId: string, onRatingAdded?: (rating: TripRating) => void) => {
    const channel = subscribeToTripRatings(requestId, {
      onInsert: (rating) => {
        console.log('🟡 [HOOK] Nueva calificación recibida:', rating)
        onRatingAdded?.(rating as TripRating)
      },
      onError: (error) => {
        console.error('❌ [HOOK] Error en suscripción de ratings:', error)
      },
    })

    channelsRef.current.set(`trip_ratings_${requestId}`, channel)
    return channel
  }, [])

  return {
    requests,
    offers,
    loading,
    error,
    createRequest,
    loadPassengerRequests,
    loadPassengerActiveTrips,
    loadDriverFeed,
    loadDriverActiveTrips,
    loadOffersForRequest,
    loadSingleRequest,
    createOffer,
    acceptOffer,
    acceptPassengerOffer,
    updateRequestPrice,
    cancelRequest,
    startTrip,
    completeTrip,
    rateTrip,
    loadTripRatings,
    subscribeTripRatings,
    cleanupChannels,
  }
}
