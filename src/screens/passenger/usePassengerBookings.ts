import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { notifyTripCancellation } from '../../services/pushNotifications'
import { withTimeout } from '../../utils/withTimeout'

export type PassengerBookingStatus = 'pending' | 'confirmed' | 'awaiting_confirmation'

export interface PassengerBooking {
  bookingId: string
  routeId: string
  bookingStatus: PassengerBookingStatus
  seatNumber: number
  origin: string
  destination: string
  departureTime: string
  driverId: string
  driverName: string
  driverRating: number
  driverPhotoUrl: string | null
  vehiclePhotoUrl: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleColor: string | null
  vehiclePlate: string | null
  reservationCode: string | null
  paymentMethod: string | null
  paymentMarkedAt: string | null
  paymentConfirmedAt: string | null
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'awaiting_confirmation']

// Reservas próximas del pasajero. Las que esperan confirmación van primero.
export const usePassengerBookings = (passengerId?: string) => {
  const [bookings, setBookings] = useState<PassengerBooking[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!passengerId) { setBookings([]); return }
    setLoading(true)
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('bookings')
            .select('id, booking_status, seat_number, reservation_code, payment_method, payment_marked_at, payment_confirmed_at, routes:route_id(id, origin, destination, departure_time, status, driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, profiles:driver_id(name, rating, avatar_url, vehicle_photo_url))')
            .eq('passenger_id', passengerId)
            .in('booking_status', ACTIVE_STATUSES)
        )
      )

      // Falla transitoria: se deja la lista anterior en pantalla en vez de
      // vaciarla — evita el parpadeo de "sin reservas" cada vez que se
      // reintenta por una red lenta.
      if (error || !data) return

      const lista: PassengerBooking[] = (data as any[])
        .filter((b) => b.routes && (b.booking_status === 'awaiting_confirmation' || !['completed', 'cancelled'].includes(b.routes.status)))
        .map((b) => ({
          bookingId: b.id,
          routeId: b.routes.id,
          bookingStatus: b.booking_status,
          seatNumber: b.seat_number,
          origin: b.routes.origin,
          destination: b.routes.destination,
          departureTime: b.routes.departure_time,
          driverId: b.routes.driver_id,
          driverName: b.routes.profiles?.name ?? 'Conductor',
          driverRating: Number(b.routes.profiles?.rating ?? 0),
          driverPhotoUrl: b.routes.profiles?.avatar_url ?? null,
          vehiclePhotoUrl: b.routes.profiles?.vehicle_photo_url ?? null,
          vehicleMake: b.routes.vehicle_make ?? null,
          vehicleModel: b.routes.vehicle_model ?? null,
          vehicleColor: b.routes.vehicle_color ?? null,
          vehiclePlate: b.routes.vehicle_plate ?? null,
          reservationCode: b.reservation_code ?? null,
          paymentMethod: b.payment_method ?? null,
          paymentMarkedAt: b.payment_marked_at ?? null,
          paymentConfirmedAt: b.payment_confirmed_at ?? null,
        }))
        .sort((a, b) => {
          const prioridadA = a.bookingStatus === 'awaiting_confirmation' ? 0 : 1
          const prioridadB = b.bookingStatus === 'awaiting_confirmation' ? 0 : 1
          if (prioridadA !== prioridadB) return prioridadA - prioridadB
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
        })

      setBookings(lista)
    } catch {
      // Igual que arriba: no borrar lo que ya había en pantalla por un error pasajero.
    } finally {
      setLoading(false)
    }
  }, [passengerId])

  useEffect(() => { load() }, [load])

  return { bookings, loading, refetch: load }
}

// El pasajero confirma que llegó. Si no responde en 24 h, el sistema confirma solo.
export const confirmPassengerTrip = async (bookingId: string): Promise<void> => {
  const { error } = await supabase.rpc('passenger_confirm_trip', {
    p_booking_id: bookingId,
    p_arrived: true,
  })
  if (error) throw error
}

export const cancelPassengerBooking = async (booking: PassengerBooking, passengerId: string): Promise<void> => {
  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: booking.bookingId,
    p_reason: 'Cancelado por el pasajero',
  })
  if (error) throw error

  notifyTripCancellation(booking.bookingId, passengerId, 'Cancelado por pasajero').catch((err) => {
    console.warn('Error sending cancellation notification:', err)
  })
}
