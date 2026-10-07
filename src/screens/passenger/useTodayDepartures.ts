import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import type { AvailableRide } from '../../hooks/useAvailableRides'

const SALIDAS_MOSTRADAS = 2
const FETCH_CAP = 20

const pad = (n: number) => String(n).padStart(2, '0')

// Límites de "hoy" anclados a la hora del servidor (Bogotá), no al reloj del celular,
// para que un celular con la hora u horario mal configurado no muestre salidas que no aplican.
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

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Primeras salidas de hoy con cupos libres, filtradas por el municipio de origen si lo hay,
// sin repetir rutas que el pasajero ya reservó (la lista de reservas activas se recibe de
// afuera para no repetir la misma consulta que ya hace usePassengerBookings).
export const useTodayDepartures = (municipality: string | null, excludedRouteIds: string[] = []) => {
  const [rides, setRides] = useState<AvailableRide[]>([])
  const [hasMore, setHasMore] = useState(false)
  const excludedKey = excludedRouteIds.join(',')

  const load = useCallback(async () => {
    const { start, end } = await getTodayBoundsBogota()

    let consulta = supabase
      .from('available_rides')
      .select('*')
      .gte('departure_time', start)
      .lt('departure_time', end)
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(FETCH_CAP)

    if (excludedRouteIds.length > 0) {
      consulta = consulta.not('id', 'in', `(${excludedRouteIds.join(',')})`)
    }

    const { data, error } = await consulta
    if (error) {
      setRides([])
      setHasMore(false)
      return
    }

    let result = (data as AvailableRide[]) ?? []
    if (municipality) {
      // Coincidencia por palabra completa, en el teléfono (evita que "Cali" encuentre "Calima"
      // sin depender de la sintaxis de filtros del servidor, que no se puede probar en vivo desde aquí).
      const pattern = new RegExp(`\\b${escapeRegex(municipality)}\\b`, 'i')
      result = result.filter((r) => pattern.test(r.origin) || pattern.test(r.destination))
    }

    setRides(result.slice(0, SALIDAS_MOSTRADAS))
    setHasMore(result.length > SALIDAS_MOSTRADAS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality, excludedKey])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return { rides, reload: load, hasMore }
}
