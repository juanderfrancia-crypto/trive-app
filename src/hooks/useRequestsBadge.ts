import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * Cuenta mensajes de negociación sin leer para el usuario, dirigidos al ícono
 * "Solicitudes" del navbar. Es la señal más simple y confiable de "esto necesita tu atención".
 */
export function useRequestsBadgeCount(userId?: string) {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    const { count: unread } = await supabase
      .from('negotiation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sent_by_user_id', userId)
      .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)

    setCount(unread ?? 0)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return

    const channel = supabase
      .channel(`requests_badge_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'negotiation_messages' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  return count
}
