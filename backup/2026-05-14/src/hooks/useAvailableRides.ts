import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

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
  // Driver info
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
  const [rides, setRides] = useState<AvailableRide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null)

  // Fetch initial data
  const fetchAvailableRides = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('available_rides')
        .select('*')
        .order('departure_time', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setRides((data as AvailableRide[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Subscriptions only active while screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAvailableRides()

      const bookingChannel = supabase
        .channel('available-rides-bookings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => { setTimeout(() => fetchAvailableRides(), 500) },
        )
        .subscribe()

      const routeChannel = supabase
        .channel('available-rides-routes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'routes', filter: `status=eq.scheduled` },
          () => { fetchAvailableRides() },
        )
        .subscribe()

      setSubscription(bookingChannel)

      return () => {
        supabase.removeChannel(bookingChannel)
        supabase.removeChannel(routeChannel)
      }
    }, [fetchAvailableRides]),
  )

  const refetch = useCallback(() => {
    fetchAvailableRides()
  }, [fetchAvailableRides])

  return {
    rides,
    loading,
    error,
    refetch,
  }
}
