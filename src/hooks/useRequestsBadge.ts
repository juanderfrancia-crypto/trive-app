import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * Cuenta mensajes de negociación sin leer, más -- solo para conductores --
 * solicitudes de ruta personalizada nuevas (pendientes, del municipio del
 * conductor, sin descartar). Antes solo contaba mensajes: un conductor podía
 * publicar/recibir una ruta personalizada nueva y el ícono "Solicitudes" del
 * navbar se quedaba en 0, aunque la pestaña "Nuevas" sí la mostrara.
 * Mismo filtro que usa esa pestaña (AvailableOffersTab) y la card de
 * "Rutas personalizadas" en DriverHomeScreen, para que los tres cuenten lo mismo.
 */
export function useRequestsBadgeCount(userId?: string, isDriver?: boolean) {
  const [messagesCount, setMessagesCount] = useState(0)
  const [airportCount, setAirportCount] = useState(0)

  const loadMessages = useCallback(async () => {
    if (!userId) {
      setMessagesCount(0)
      return
    }
    const { count: unread } = await supabase
      .from('negotiation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sent_by_user_id', userId)
      .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)

    setMessagesCount(unread ?? 0)
  }, [userId])

  // Filtro y conteo hechos en la base (get_pending_airport_request_count) en vez
  // de traer todas las solicitudes pendientes del país al teléfono para filtrarlas ahí.
  const loadAirportRequests = useCallback(async () => {
    if (!userId || !isDriver) {
      setAirportCount(0)
      return
    }

    const { data, error } = await supabase.rpc('get_pending_airport_request_count', { p_driver_id: userId })
    setAirportCount(error ? 0 : (data ?? 0))
  }, [userId, isDriver])

  useEffect(() => {
    loadMessages()
    if (!userId) return

    const topic = `realtime:requests_badge_${userId}`
    // Defensa contra un canal del mismo nombre que haya quedado de un montaje
    // anterior sin limpiar (p. ej. Fast Refresh en desarrollo): si ya existe,
    // quitarlo antes de crear otro — si no, el .on() de abajo revienta con
    // "cannot add `postgres_changes` callbacks ... after `subscribe()`".
    const stale = supabase.getChannels().find((c) => c.topic === topic)
    if (stale) supabase.removeChannel(stale)

    // Filtrado por driver_id/passenger_id (dos suscripciones, porque el filtro de
    // postgres_changes no soporta un OR entre columnas) -- antes escuchaba TODA la
    // tabla sin filtro, así que un mensaje de cualquier otro usuario en toda la app
    // disparaba un refetch en este dispositivo.
    const channel = supabase
      .channel(`requests_badge_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'negotiation_messages', filter: `driver_id=eq.${userId}` },
        () => loadMessages()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'negotiation_messages', filter: `passenger_id=eq.${userId}` },
        () => loadMessages()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadMessages])

  useEffect(() => {
    loadAirportRequests()
    if (!userId || !isDriver) return

    const topic = `realtime:requests_badge_airport_${userId}`
    const stale = supabase.getChannels().find((c) => c.topic === topic)
    if (stale) supabase.removeChannel(stale)

    const channel = supabase
      .channel(`requests_badge_airport_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'airport_requests' },
        () => loadAirportRequests()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'airport_request_dismissals', filter: `driver_id=eq.${userId}` },
        () => loadAirportRequests()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isDriver, loadAirportRequests])

  return messagesCount + airportCount
}
