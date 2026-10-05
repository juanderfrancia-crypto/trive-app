import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

const PAYABLE_STATUSES = ['confirmed', 'awaiting_confirmation', 'completed', 'disputed']

export interface PendingPayment {
  reservationCode: string
  passengerName: string
  seats: number
  total: number
  origin: string
  destination: string
  departureTime: string
  markedAt: string | null
}

// Compras de los viajes del conductor que aún no tienen pago confirmado, agrupadas por código.
// Las que el pasajero ya marcó como pagadas van primero.
export const useDriverPayments = (driverId?: string) => {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!driverId) { setPayments([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('reservation_code, seat_number, price, payment_marked_at, routes:route_id!inner(driver_id, origin, destination, departure_time), passenger:profiles!passenger_id(name)')
        .eq('routes.driver_id', driverId)
        .not('reservation_code', 'is', null)
        .in('booking_status', PAYABLE_STATUSES)
        .is('payment_confirmed_at', null)

      if (error || !data) { setPayments([]); return }

      const grupos = new Map<string, { filas: any[] }>()
      for (const fila of data as any[]) {
        const grupo = grupos.get(fila.reservation_code) ?? { filas: [] }
        grupo.filas.push(fila)
        grupos.set(fila.reservation_code, grupo)
      }

      const lista: PendingPayment[] = Array.from(grupos.entries()).map(([codigo, { filas }]) => {
        const primera = filas[0]
        return {
          reservationCode: codigo,
          passengerName: primera.passenger?.name ?? 'Pasajero',
          seats: filas.length,
          total: filas.reduce((suma, f) => suma + Number(f.price ?? 0), 0),
          origin: primera.routes.origin,
          destination: primera.routes.destination,
          departureTime: primera.routes.departure_time,
          markedAt: filas.find((f) => f.payment_marked_at)?.payment_marked_at ?? null,
        }
      })

      lista.sort((a, b) => {
        const marcadoA = a.markedAt ? 0 : 1
        const marcadoB = b.markedAt ? 0 : 1
        if (marcadoA !== marcadoB) return marcadoA - marcadoB
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      })

      setPayments(lista)
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [driverId])

  useEffect(() => { load() }, [load])

  const confirm = useCallback(async (reservationCode: string, received: boolean) => {
    setBusyCode(reservationCode)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('driver_confirm_payment', {
        p_reservation_code: reservationCode,
        p_received: received,
      })
      if (error) throw error
      const resultado = data as { ok: boolean; message: string }
      setFeedback(resultado.message)
      await load()
    } catch {
      setFeedback('No pudimos registrar tu respuesta. Intenta de nuevo.')
    } finally {
      setBusyCode(null)
    }
  }, [load])

  return { payments, loading, busyCode, feedback, confirm, reload: load }
}
