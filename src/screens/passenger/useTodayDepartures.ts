import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import type { AvailableRide } from '../../hooks/useAvailableRides'

const SALIDAS_MOSTRADAS = 2

// Primeras salidas de hoy con cupos libres, filtradas por el municipio de origen si lo hay.
export const useTodayDepartures = (municipality: string | null) => {
  const [rides, setRides] = useState<AvailableRide[]>([])

  const load = useCallback(async () => {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 1)

    let consulta = supabase
      .from('available_rides')
      .select('*')
      .gte('departure_time', inicio.toISOString())
      .lt('departure_time', fin.toISOString())
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(SALIDAS_MOSTRADAS)

    if (municipality) {
      consulta = consulta.or(`origin.ilike.%${municipality}%,destination.ilike.%${municipality}%`)
    }

    const { data, error } = await consulta
    setRides(error ? [] : ((data as AvailableRide[]) ?? []))
  }, [municipality])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return { rides }
}
