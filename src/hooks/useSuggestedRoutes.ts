import { useState, useCallback } from 'react'
import { supabase } from '../services/supabase'

export interface FrequentRoute {
  origin: string
  destination: string
  frequency: number
  lastUsed: string
  avgPrice?: number
}

export const useSuggestedRoutes = (userId: string | undefined) => {
  const [suggestedRoutes, setSuggestedRoutes] = useState<FrequentRoute[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestedRoutes = useCallback(async () => {
    if (!userId) {
      setSuggestedRoutes([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obtener todos los bookings completados del usuario con información de rutas
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
          id,
          price,
          created_at,
          routes(
            origin,
            destination,
            departure_time,
            price_per_seat
          )
        `
        )
        .eq('passenger_id', userId)
        .eq('booking_status', 'confirmed')
        .not('routes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100) // Limitar a últimos 100 viajes

      if (bookingsError) throw bookingsError

      if (!bookings || bookings.length === 0) {
        setSuggestedRoutes([])
        return
      }

      // Agrupar por origen-destino y calcular frecuencias
      const routeMap = new Map<string, FrequentRoute>()

      ;(bookings as any[]).forEach((booking) => {
        const route = booking.routes
        if (!route || !route.origin || !route.destination) return

        const key = `${route.origin}|${route.destination}`
        const existing = routeMap.get(key)

        if (existing) {
          existing.frequency += 1
          existing.lastUsed = new Date(booking.created_at).toISOString()
          if (!existing.avgPrice) {
            existing.avgPrice = booking.price
          } else {
            // Actualizar promedio
            existing.avgPrice = (existing.avgPrice + booking.price) / 2
          }
        } else {
          routeMap.set(key, {
            origin: route.origin,
            destination: route.destination,
            frequency: 1,
            lastUsed: new Date(booking.created_at).toISOString(),
            avgPrice: booking.price || route.price_per_seat,
          })
        }
      })

      // Convertir a array y ordenar por frecuencia (descendente)
      const suggested = Array.from(routeMap.values())
        .filter((route) => route.frequency >= 2) // Solo rutas usadas 2+ veces
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10) // Top 10

      setSuggestedRoutes(suggested)
    } catch (err: any) {
      console.error('Error fetching suggested routes:', err)
      setError(err.message || 'Error al obtener rutas sugeridas')
      setSuggestedRoutes([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  return {
    suggestedRoutes,
    loading,
    error,
    fetchSuggestedRoutes,
  }
}
