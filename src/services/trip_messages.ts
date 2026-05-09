import { supabase } from './supabase'
import { sendPushNotificationToUser } from './pushNotifications'

export interface TripMessage {
  id: string
  trip_id: string
  from_user_id: string
  to_user_id: string
  message: string
  created_at: string
  is_read: boolean
  read_at?: string
}

// ============================================
// GET TRIP MESSAGES
// ============================================

/**
 * Obtiene los mensajes de una conversación específica dentro de un viaje.
 * Solo devuelve mensajes entre userId y otherUserId — nunca mezcla conversaciones
 * de distintos pasajeros del mismo viaje.
 */
export const getTripMessages = async (
  tripId: string,
  userId: string,
  otherUserId: string
): Promise<TripMessage[]> => {
  try {
    if (!tripId || !userId || !otherUserId) throw new Error('tripId, userId and otherUserId are required')

    const { data, error } = await supabase
      .from('trip_messages')
      .select('*')
      .eq('trip_id', tripId)
      .or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),` +
        `and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })

    if (error) throw error

    return data || []
  } catch (err: any) {
    if (__DEV__) console.error('Error fetching trip messages:', err)
    throw err
  }
}

// ============================================
// SEND TRIP MESSAGE
// ============================================

/**
 * Envía un mensaje en un viaje
 * @param tripId - ID del viaje
 * @param fromUserId - ID del remitente
 * @param toUserId - ID del destinatario
 * @param message - Texto del mensaje (máx 500 caracteres)
 * @returns Mensaje creado
 */
export const sendTripMessage = async (
  tripId: string,
  fromUserId: string,
  toUserId: string,
  message: string
): Promise<TripMessage> => {
  try {
    // Validaciones básicas
    if (!tripId || !fromUserId || !toUserId) {
      throw new Error('Missing required fields: tripId, fromUserId, toUserId')
    }

    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty')
    }

    if (message.length > 500) {
      throw new Error('Message cannot exceed 500 characters')
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot send message to yourself')
    }

    // Insertar mensaje
    const { data, error } = await supabase
      .from('trip_messages')
      .insert({
        trip_id: tripId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message: message.trim(),
      })
      .select()
      .single()

    if (error) throw error

    // Enviar notificación push en background (no bloquear)
    try {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', toUserId)
        .single()

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', fromUserId)
        .single()

      if (recipientProfile?.push_token) {
        await sendPushNotificationToUser(
          recipientProfile.push_token,
          `Mensaje de ${senderProfile?.name || 'Usuario'}`,
          message.substring(0, 100),
          {
            type: 'trip_message',
            trip_id: tripId,
            from_user_id: fromUserId,
            message_id: data.id,
          }
        )
      }
    } catch (pushErr) {
      console.error('Error sending push notification:', pushErr)
      // No fallar el mensaje si la notificación falla
    }

    return data
  } catch (err: any) {
    console.error('Error sending trip message:', err)
    throw err
  }
}

// ============================================
// MARK MESSAGE AS READ
// ============================================

/**
 * Marca un mensaje como leído
 * @param messageId - ID del mensaje
 */
export const markTripMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    if (!messageId) throw new Error('messageId is required')

    const { error } = await supabase
      .from('trip_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    if (error) throw error
  } catch (err: any) {
    console.error('Error marking trip message as read:', err)
    throw err
  }
}

// ============================================
// MARK ALL MESSAGES IN TRIP AS READ
// ============================================

/**
 * Marca todos los mensajes de un viaje como leídos
 * @param tripId - ID del viaje
 * @param userId - ID del usuario que está leyendo
 */
export const markTripMessagesAsRead = async (tripId: string, userId: string): Promise<void> => {
  try {
    if (!tripId || !userId) throw new Error('tripId and userId are required')

    const { error } = await supabase
      .from('trip_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('trip_id', tripId)
      .eq('to_user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  } catch (err: any) {
    console.error('Error marking trip messages as read:', err)
    throw err
  }
}

// ============================================
// REALTIME: SUBSCRIBE TO TRIP MESSAGES
// ============================================

/**
 * Suscribirse a nuevos mensajes dentro de un viaje.
 *
 * - Si se pasa `otherUserId`: solo dispara el callback para mensajes entre
 *   `userId` y `otherUserId` (chat 1-a-1, evita cruce de conversaciones).
 * - Si `otherUserId` es null: dispara el callback solo cuando `to_user_id === userId`
 *   (útil para badges en pantallas donde hay múltiples conversaciones, ej. driver).
 *
 * Nota: Supabase Realtime no soporta filtros OR en postgres_changes, por eso
 * el filtro de participantes se aplica en el callback JS.
 */
export const subscribeTripMessages = (
  tripId: string,
  userId: string,
  otherUserId: string | null,
  callback: (message: TripMessage) => void
) => {
  if (!tripId || !userId) {
    if (__DEV__) console.error('subscribeTripMessages: tripId and userId are required')
    return () => {}
  }

  const channelKey = otherUserId
    ? `trip:${tripId}:${userId}:${otherUserId}`
    : `trip:${tripId}:${userId}`

  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        const msg = payload.new as TripMessage
        if (!msg) return

        if (otherUserId) {
          // Chat 1-a-1: solo mensajes entre estos dos usuarios
          const isMine = msg.from_user_id === userId && msg.to_user_id === otherUserId
          const isTheirs = msg.from_user_id === otherUserId && msg.to_user_id === userId
          if (isMine || isTheirs) callback(msg)
        } else {
          // Badge: solo mensajes dirigidos a mí
          if (msg.to_user_id === userId) callback(msg)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// REALTIME: SUBSCRIBE TO MESSAGE UPDATES (read status)
// ============================================

/**
 * Suscribirse a actualizaciones de mensajes (ej: cuando se marcan como leídos)
 * @param tripId - ID del viaje
 * @param callback - Función a llamar cuando se actualiza un mensaje
 * @returns Función para desuscribirse
 */
export const subscribeTripMessageUpdates = (
  tripId: string,
  callback: (messageId: string, isRead: boolean) => void
) => {
  if (!tripId) {
    console.error('subscribeTripMessageUpdates: tripId is required')
    return () => {}
  }

  const channel = supabase
    .channel(`trip-updates:${tripId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        const updatedMessage = payload.new as TripMessage
        if (updatedMessage) callback(updatedMessage.id, updatedMessage.is_read)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// GET UNREAD COUNT FOR TRIP
// ============================================

/**
 * Obtiene el número de mensajes no leídos en un viaje
 * @param tripId - ID del viaje
 * @param userId - ID del usuario
 * @returns Número de mensajes no leídos
 */
export const getTripUnreadCount = async (tripId: string, userId: string): Promise<number> => {
  try {
    if (!tripId || !userId) throw new Error('tripId and userId are required')

    const { count, error } = await supabase
      .from('trip_messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('to_user_id', userId)
      .eq('is_read', false)

    if (error) throw error

    return count || 0
  } catch (err: any) {
    console.error('Error getting trip unread count:', err)
    return 0
  }
}

export const getTripUnreadCountFrom = async (
  tripId: string,
  toUserId: string,
  fromUserId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('trip_messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('to_user_id', toUserId)
      .eq('from_user_id', fromUserId)
      .eq('is_read', false)
    if (error) throw error
    return count ?? 0
  } catch {
    return 0
  }
}
