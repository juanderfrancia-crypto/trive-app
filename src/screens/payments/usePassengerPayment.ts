import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

// Estados de reserva en los que el pago aplica (mismos que usan passenger_mark_paid).
const PAYABLE_STATUSES = ['confirmed', 'awaiting_confirmation', 'completed', 'disputed']

export interface PassengerPaymentSummary {
  reservationCode: string
  driverId: string
  driverName: string
  origin: string
  destination: string
  departureTime: string
  seats: number
  total: number
  paymentMethod: string | null
  markedAt: string | null
  confirmedAt: string | null
}

// Carga la compra completa (todos sus asientos) por código. Trive no procesa el pago:
// solo muestra los datos que el conductor registró y permite informar "Ya pagué".
export const usePassengerPayment = (reservationCode: string, passengerId?: string) => {
  const [summary, setSummary] = useState<PassengerPaymentSummary | null>(null)
  const [breBKey, setBreBKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!passengerId || !reservationCode) {
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('reservation_code, seat_number, price, payment_method, payment_marked_at, payment_confirmed_at, routes:route_id(origin, destination, departure_time, driver_id, profiles:driver_id(name))')
        .eq('passenger_id', passengerId)
        .eq('reservation_code', reservationCode)
        .in('booking_status', PAYABLE_STATUSES)

      const filas = (data ?? []) as any[]
      if (error || filas.length === 0 || !filas[0].routes) {
        setSummary(null)
        return
      }

      const primera = filas[0]
      setSummary({
        reservationCode,
        driverId: primera.routes.driver_id,
        driverName: primera.routes.profiles?.name ?? 'Conductor',
        origin: primera.routes.origin,
        destination: primera.routes.destination,
        departureTime: primera.routes.departure_time,
        seats: filas.length,
        total: filas.reduce((suma, f) => suma + Number(f.price ?? 0), 0),
        paymentMethod: primera.payment_method ?? null,
        markedAt: filas.find((f) => f.payment_marked_at)?.payment_marked_at ?? null,
        confirmedAt: filas.find((f) => f.payment_confirmed_at)?.payment_confirmed_at ?? null,
      })
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [passengerId, reservationCode])

  useEffect(() => { load() }, [load])

  // Llave Bre-B registrada por el conductor. Si la lectura falla, queda en null (estado vacío).
  useEffect(() => {
    if (!summary?.driverId) { setBreBKey(null); return }
    let activo = true
    supabase
      .from('driver_payment_methods')
      .select('phone_number')
      .eq('driver_id', summary.driverId)
      .eq('type', 'bre_b')
      .eq('is_active', true)
      .limit(1)
      .then(({ data, error }) => {
        if (!activo) return
        const fila = !error && data && data.length > 0 ? (data[0] as { phone_number: string }) : null
        setBreBKey(fila?.phone_number ?? null)
      })
    return () => { activo = false }
  }, [summary?.driverId])

  const markPaid = useCallback(async (): Promise<boolean> => {
    setMarking(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.rpc('passenger_mark_paid', { p_reservation_code: reservationCode })
      if (error) throw error
      const resultado = data as { ok: boolean; message: string }
      setMessage(resultado.message)
      if (resultado.ok) await load()
      return resultado.ok
    } catch {
      setMessage('No pudimos registrar tu pago. Intenta de nuevo.')
      return false
    } finally {
      setMarking(false)
    }
  }, [reservationCode, load])

  return { summary, breBKey, loading, marking, message, markPaid }
}
