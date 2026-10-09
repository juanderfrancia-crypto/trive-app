import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'

export type DriverTodayRoute = {
  id: string
  origin: string
  destination: string
  departure_time: string
  total_seats: number
  available_seats: number
  status: 'scheduled' | 'in_progress'
}

const pad = (n: number) => String(n).padStart(2, '0')

// Mismo criterio que useTodayDepartures: "hoy" según la hora del servidor (Bogotá),
// no el reloj del celular.
const getTodayBoundsBogota = async (): Promise<{ start: string; end: string }> => {
  let datePart: string
  try {
    const { data, error } = await supabase.rpc('now_bogota')
    if (error || !data) throw error ?? new Error('now_bogota sin datos')
    datePart = String(data).slice(0, 10)
  } catch {
    const d = new Date()
    datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const [y, m, d] = datePart.split('-').map(Number)
  const tomorrow = new Date(y, m - 1, d + 1)
  const endPart = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
  return { start: `${datePart}T00:00:00`, end: `${endPart}T00:00:00` }
}

// Rutas del conductor que salen hoy (programadas o ya en curso), para mostrarlas
// de un vistazo en su Inicio sin tener que entrar a "Mi panel".
export const useDriverTodayRoutes = (driverId?: string) => {
  const [routes, setRoutes] = useState<DriverTodayRoute[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!driverId) {
      setRoutes([])
      setLoading(false)
      return
    }
    const { start, end } = await getTodayBoundsBogota()
    const { data, error } = await supabase
      .from('routes')
      .select('id, origin, destination, departure_time, total_seats, available_seats, status')
      .eq('driver_id', driverId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('departure_time', start)
      .lt('departure_time', end)
      .order('departure_time', { ascending: true })

    setRoutes(error ? [] : ((data as DriverTodayRoute[]) ?? []))
    setLoading(false)
  }, [driverId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return { routes, loading, reload: load }
}
