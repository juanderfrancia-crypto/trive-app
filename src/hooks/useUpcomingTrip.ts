import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { withTimeout } from '../utils/withTimeout'

export interface UpcomingTrip {
  bookingId: string
  routeId: string
  origin: string
  destination: string
  departureTime: string
  driverName: string
  driverRating: number
  driverPhotoUrl: string | null
  vehiclePhotoUrl: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleColor: string | null
  vehiclePlate: string | null
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
      // Una sola consulta con las relaciones ya embebidas (mismo patrón ya
      // probado en usePassengerBookings) en vez de 3 viajes de red seguidos
      // (reservas -> rutas -> conductor) — eso es lo que hacía sentir lenta
      // la tarjeta "Tu próximo viaje" cada vez que se volvía a Inicio.
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('bookings')
            .select(
              'id, route_id, seat_number, routes:route_id(id, origin, destination, departure_time, status, driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, profiles:driver_id(name, rating, avatar_url, vehicle_photo_url))'
            )
            .eq('passenger_id', passengerId)
            .in('booking_status', ['confirmed', 'pending'])
        )
      )

      // Falla transitoria (red/timeout): se deja el último viaje conocido en
      // pantalla en vez de hacerlo desaparecer — se reintenta en el próximo
      // refetch sin que el usuario note nada.
      if (error || !data) return

      const now = Date.now()
      const candidatas = (data as any[])
        .filter((b) => {
          const r = b.routes
          return r && r.status !== 'cancelled' && r.status !== 'completed' && new Date(r.departure_time).getTime() >= now
        })
        .sort((a, b) => new Date(a.routes.departure_time).getTime() - new Date(b.routes.departure_time).getTime())

      if (candidatas.length === 0) { setTrip(null); return }

      const booking = candidatas[0]
      const route   = booking.routes
      const depTime      = new Date(route.departure_time)
      const minutesUntil = Math.max(0, Math.round((depTime.getTime() - Date.now()) / 60000))

      setTrip({
        bookingId:     booking.id,
        routeId:       route.id,
        origin:        route.origin,
        destination:   route.destination,
        departureTime: route.departure_time,
        driverName:    route.profiles?.name  ?? 'Conductor',
        driverRating:  route.profiles?.rating ?? 0,
        driverPhotoUrl: route.profiles?.avatar_url ?? null,
        vehiclePhotoUrl: route.profiles?.vehicle_photo_url ?? null,
        vehicleMake:   route.vehicle_make ?? null,
        vehicleModel:  route.vehicle_model ?? null,
        vehicleColor:  route.vehicle_color ?? null,
        vehiclePlate:  route.vehicle_plate ?? null,
        seatNumber:    booking.seat_number,
        minutesUntil,
        routeObj:      route,
      })
    } catch {
      // Igual que arriba: no borrar lo que ya había en pantalla por un error pasajero.
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
