import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../services/supabase'

export interface UpcomingTrip {
  bookingId: string
  routeId: string
  origin: string
  destination: string
  departureTime: string
  driverName: string
  driverRating: number
  seatNumber: number
  minutesUntil: number
  routeObj: any
}

export const useUpcomingTrip = (passengerId?: string) => {
  const [trip, setTrip]     = useState<UpcomingTrip | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!passengerId) { setTrip(null); return }

    setLoading(true)
    try {
      // Paso 1: obtener reservas activas del pasajero
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, route_id, seat_number')
        .eq('passenger_id', passengerId)
        .in('booking_status', ['confirmed', 'pending'])

      if (!bookings?.length) { setTrip(null); return }

      // Paso 2: buscar la ruta más próxima (departure_time está en routes, no en bookings)
      const routeIds = bookings.map((b: any) => b.route_id)
      const { data: routes } = await supabase
        .from('routes')
        .select('id, origin, destination, departure_time, driver_id, total_seats, available_seats, price_per_seat, vehicle_make, vehicle_color, vehicle_plate, status')
        .in('id', routeIds)
        .not('status', 'eq', 'cancelled')
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(1)

      if (!routes?.length) { setTrip(null); return }

      const route   = routes[0]
      const booking = bookings.find((b: any) => b.route_id === route.id)
      if (!booking) { setTrip(null); return }

      const { data: driver } = await supabase
        .from('profiles')
        .select('name, rating')
        .eq('id', route.driver_id)
        .maybeSingle()

      const depTime      = new Date(route.departure_time)
      const minutesUntil = Math.max(0, Math.round((depTime.getTime() - Date.now()) / 60000))

      setTrip({
        bookingId:     booking.id,
        routeId:       route.id,
        origin:        route.origin,
        destination:   route.destination,
        departureTime: route.departure_time,
        driverName:    driver?.name  ?? 'Conductor',
        driverRating:  driver?.rating ?? 0,
        seatNumber:    booking.seat_number,
        minutesUntil,
        routeObj:      route,
      })
    } catch {
      setTrip(null)
    } finally {
      setLoading(false)
    }
  }, [passengerId])

  useEffect(() => { load() }, [load])

  return { trip, loading, refetch: load }
}

export const formatCountdown = (minutes: number): string => {
  if (minutes <= 0)  return 'En camino'
  if (minutes < 60)  return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
