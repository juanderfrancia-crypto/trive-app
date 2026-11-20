import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { getTodayBoundsBogota } from '../../utils/todayBoundsBogota'

export type DriverTodayRoute = {
  id: string
  origin: string
  destination: string
  departure_time: string
  total_seats: number
  available_seats: number
  status: 'scheduled' | 'in_progress'
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
