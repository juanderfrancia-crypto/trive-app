import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../services/supabase'

export interface RecentRoute {
  origin: string
  destination: string
}

export const useRecentRoutes = (passengerId?: string) => {
  const [routes, setRoutes] = useState<RecentRoute[]>([])

  const load = useCallback(async () => {
    if (!passengerId) { setRoutes([]); return }

    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('route_id')
        .eq('passenger_id', passengerId)
        .eq('booking_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(12)

      if (!bookings?.length) { setRoutes([]); return }

      const routeIds = [...new Set(bookings.map((b) => b.route_id))]

      const { data: routeData } = await supabase
        .from('routes')
        .select('id, origin, destination')
        .in('id', routeIds)

      if (!routeData?.length) { setRoutes([]); return }

      const seen    = new Set<string>()
      const unique: RecentRoute[] = []

      for (const b of bookings) {
        const r = routeData.find((rd) => rd.id === b.route_id)
        if (!r) continue
        const key = `${r.origin}|${r.destination}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({ origin: r.origin, destination: r.destination })
          if (unique.length === 3) break
        }
      }

      setRoutes(unique)
    } catch {
      setRoutes([])
    }
  }, [passengerId])

  useEffect(() => { load() }, [load])

  return { routes }
}
