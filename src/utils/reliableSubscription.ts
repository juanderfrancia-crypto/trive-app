import { supabase } from '../services/supabase'

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface ReliableChannelOptions {
  channelName: string
  table: string
  event: PostgresEvent
  filter?: string
  schema?: string
  maxRetries?: number
  onData: (payload: any) => void
  onStatusChange?: (status: string) => void
}

/**
 * Crea un canal Supabase realtime con retry automático.
 * Si la suscripción falla o se cae, reintenta hasta maxRetries veces
 * con backoff exponencial (2s → 4s → 8s).
 * Retorna una función de limpieza que cancela todo.
 */
export const createReliableChannel = (options: ReliableChannelOptions): (() => void) => {
  const {
    channelName,
    table,
    event,
    filter,
    schema = 'public',
    maxRetries = 3,
    onData,
    onStatusChange,
  } = options

  let retryCount = 0
  let destroyed = false
  let currentChannel: ReturnType<typeof supabase.channel> | null = null
  let retryAttempt = 0

  const connect = () => {
    if (destroyed) return

    const config: any = { event, schema, table }
    if (filter) config.filter = filter

    // Nombre único por intento para evitar conflictos con canales previos aún cerrándose
    const name = retryAttempt === 0 ? channelName : `${channelName}-r${retryAttempt}`
    retryAttempt++

    currentChannel = supabase
      .channel(name)
      .on('postgres_changes', config, onData)
      .subscribe((status, err) => {
        onStatusChange?.(status)

        if (status === 'SUBSCRIBED') {
          retryCount = 0
          if (__DEV__) console.log(`[ReliableChannel] ✅ ${channelName}`)
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (__DEV__) console.warn(`[ReliableChannel] ⚠️ ${channelName} - estado: ${status}`, err)

          if (retryCount < maxRetries) {
            retryCount++
            const delay = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
            if (__DEV__) console.warn(`[ReliableChannel] 🔄 ${channelName} reintento ${retryCount}/${maxRetries} en ${delay}ms`)

            if (currentChannel) {
              supabase.removeChannel(currentChannel)
              currentChannel = null
            }
            setTimeout(connect, delay)
          } else {
            console.error(`[ReliableChannel] ❌ ${channelName} falló tras ${maxRetries} intentos`)
          }
        }
      })
  }

  connect()

  return () => {
    destroyed = true
    if (currentChannel) {
      supabase.removeChannel(currentChannel)
      currentChannel = null
    }
  }
}
