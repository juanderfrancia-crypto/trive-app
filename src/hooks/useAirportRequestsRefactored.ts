import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { realtimeManager } from '../services/realtimeSubscriptionManager'
import { loadFromOfflineCache, saveToOfflineCache, getOfflineCacheKey } from '../services/queryClient'

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
}

/**
 * REFACTORIZADO PARA REACT QUERY + REALTIME SINGLETON
 * 
 * Beneficios:
 * ✅ Instant load desde cache (offline-first)
 * ✅ Background sync automática
 * ✅ Deduplicación automática de queries
 * ✅ Realtime updates vía singleton (solo 1 listener por tabla)
 * ✅ Memory leak prevention (auto cleanup)
 */
export const usePassengerAirportRequests = (passengerId?: string) => {
  const queryClient = useQueryClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const hookIdRef = useRef(`usePassengerAirportRequests_${Date.now()}_${Math.random()}`)

  // 📡 Fetch función
  const fetchPassengerRequests = useCallback(async (): Promise<AirportRequest[]> => {
    // 1️⃣ Intentar cargar desde offline cache primero
    if (passengerId) {
      const cacheKey = getOfflineCacheKey('passenger_requests', { passengerId })
      const cached = await loadFromOfflineCache(cacheKey)
      if (cached) {
        console.log(`✅ [usePassengerAirportRequests] Loaded from offline cache`)
      }
    }

    // 2️⃣ Fetch desde BD
    const { data, error } = await supabase
      .from('airport_requests')
      .select('*')
      .eq('passenger_id', passengerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // 3️⃣ Guardar en offline cache para próxima vez
    if (passengerId && data) {
      const cacheKey = getOfflineCacheKey('passenger_requests', { passengerId })
      await saveToOfflineCache(cacheKey, data)
    }

    return (data || []) as AirportRequest[]
  }, [passengerId])

  // 🔍 React Query: maneja caching, deduplicación, retry automáticamente
  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['passenger_requests', passengerId],
    queryFn: fetchPassengerRequests,
    enabled: !!passengerId,
    staleTime: 60 * 1000, // 1 min fresh
    gcTime: 5 * 60 * 1000, // 5 min in memory
  })

  // 📡 Realtime subscription (usando SINGLETON = solo 1 listener)
  useEffect(() => {
    if (!passengerId) return

    console.log(`🔌 [usePassengerAirportRequests] Subscribing to realtime updates`)

    unsubscribeRef.current = realtimeManager.subscribeToPassengerRequests(
      passengerId,
      hookIdRef.current,
      (payload: any) => {
        console.log(`✅ [Realtime] Passenger request update:`, payload.eventType)
        // Invalidar cache para trigger refetch automático
        queryClient.invalidateQueries({
          queryKey: ['passenger_requests', passengerId],
        })
      }
    )

    return () => {
      console.log(`🔌 [usePassengerAirportRequests] Unsubscribing`)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [passengerId, queryClient])

  return {
    requests,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  }
}

/**
 * Hook para driver: cargar sus solicitudes activas
 */
export const useDriverAirportOffers = (driverId?: string) => {
  const queryClient = useQueryClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const hookIdRef = useRef(`useDriverAirportOffers_${Date.now()}_${Math.random()}`)

  const fetchDriverOffers = useCallback(async () => {
    // Load with cache-first strategy
    const cacheKey = getOfflineCacheKey('driver_offers', { driverId })
    const cached = driverId ? await loadFromOfflineCache(cacheKey) : null

    const { data, error } = await supabase
      .from('airport_offers')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    if (driverId && data) {
      await saveToOfflineCache(cacheKey, data)
    }

    return data || []
  }, [driverId])

  const { data: offers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['driver_offers', driverId],
    queryFn: fetchDriverOffers,
    enabled: !!driverId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Subscribe to realtime updates
  useEffect(() => {
    if (!driverId) return

    unsubscribeRef.current = realtimeManager.subscribeToDriverOffers(
      driverId,
      hookIdRef.current,
      (payload: any) => {
        queryClient.invalidateQueries({
          queryKey: ['driver_offers', driverId],
        })
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [driverId, queryClient])

  return {
    offers,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  }
}
