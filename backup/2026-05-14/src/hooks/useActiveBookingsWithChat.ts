import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../services/supabase'

export interface ActiveBookingChat {
  bookingId: string
  routeId: string
  origin: string
  destination: string
  departureTime: string
  driverName: string
  driverId: string
  seatNumber: number
  routeStatus: string
}

export const useActiveBookingsWithChat = (passengerId?: string) => {
  const [bookings, setBookings] = useState<ActiveBookingChat[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!passengerId) { setBookings([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, route_id, seat_number, routes:route_id(id, origin, destination, departure_time, driver_id, status, profiles:driver_id(name))')
        .eq('passenger_id', passengerId)
        .in('booking_status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false })

      if (error || !data) { setBookings([]); return }

      const result: ActiveBookingChat[] = (data as any[])
        .filter((b) => b.routes && ['scheduled', 'in_progress'].includes(b.routes.status))
        .map((b) => ({
          bookingId:     b.id,
          routeId:       b.routes.id,
          origin:        b.routes.origin,
          destination:   b.routes.destination,
          departureTime: b.routes.departure_time,
          driverName:    b.routes.profiles?.name ?? 'Conductor',
          driverId:      b.routes.driver_id,
          seatNumber:    b.seat_number,
          routeStatus:   b.routes.status,
        }))

      setBookings(result)
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [passengerId])

  useEffect(() => { load() }, [load])

  return { bookings, loading, refetch: load }
}
