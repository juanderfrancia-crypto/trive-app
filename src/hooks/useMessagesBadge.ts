import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * Cuenta mensajes de viaje sin leer para el usuario, dirigidos al ícono
 * "Viajes" del navbar — así se nota un mensaje nuevo aunque el usuario
 * esté en otra pantalla, sin tener que entrar al panel/chat para verlo.
 * Mismo patrón que useRequestsBadgeCount.
 */
export function useMessagesBadgeCount(userId?: string) {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    const { count: unread } = await supabase
      .from('trip_messages')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', userId)
      .eq('is_read', false)

    setCount(unread ?? 0)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return

    const topic = `realtime:messages_badge_${userId}`
    const stale = supabase.getChannels().find((c) => c.topic === topic)
    if (stale) supabase.removeChannel(stale)

    const channel = supabase
      .channel(`messages_badge_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_messages' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  return count
}
