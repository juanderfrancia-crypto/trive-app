import { useState, useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'

export interface AvailableRide {
  id: string
  driver_id: string
  origin: string
  destination: string
  departure_time: string
  arrival_time: string
  price_per_seat: number
  total_seats: number
  available_seats: number
  seats_available_count: number
  vehicle_type: string
  vehicle_color: string
  vehicle_plate: string
  status: string
  description: string | null
  driver_user_id: string
  driver_name: string
  driver_phone: string
  driver_photo: string | null
  driver_rating: number
  driver_review_count: number
  created_at: string
  updated_at: string
}

export const useAvailableRides = () => {
  const [rides, setRides]   = useState<AvailableRide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Refs para canales — evitan re-renders y garantizan limpieza correcta
  const bookingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const routeChannelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAvailableRides = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('available_rides')
        .select('*')
        .order('departure_time', { ascending: true })
      if (fetchError) { setError(fetchError.message); return }
      setRides((data as AvailableRide[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchAvailableRides(), 500)
  }, [fetchAvailableRides])

  useFocusEffect(
    useCallback(() => {
      fetchAvailableRides()

      // Nombres únicos por sesión para evitar conflictos en Supabase
      const sessionId = Date.now()

      bookingChannelRef.current = supabase
        .channel(`rides-bookings-${sessionId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, debouncedFetch)
        .subscribe()

      routeChannelRef.current = supabase
        .channel(`rides-routes-${sessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'routes', filter: 'status=eq.scheduled' }, fetchAvailableRides)
        .subscribe()

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (bookingChannelRef.current) { supabase.removeChannel(bookingChannelRef.current); bookingChannelRef.current = null }
        if (routeChannelRef.current)   { supabase.removeChannel(routeChannelRef.current);   routeChannelRef.current = null }
      }
    }, [fetchAvailableRides, debouncedFetch]),
  )

  const refetch = useCallback(() => fetchAvailableRides(), [fetchAvailableRides])

  return { rides, loading, error, refetch }
}
