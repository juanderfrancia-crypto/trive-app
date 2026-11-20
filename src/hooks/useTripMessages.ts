import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getTripMessages,
  sendTripMessage,
  subscribeTripMessages,
  subscribeTripMessageUpdates,
  markTripMessagesAsRead,
  markTripMessageAsRead,
  TripMessage,
} from '../services/trip_messages'
import { supabase } from '../services/supabase'

interface UseTripMessagesOptions {
  autoMarkAsRead?: boolean
}

export const useTripMessages = (tripId?: string, userId?: string, otherUserId?: string, options?: UseTripMessagesOptions) => {
  const [messages, setMessages] = useState<TripMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesChannelRef = useRef<(() => void) | null>(null)
  const updatesChannelRef = useRef<(() => void) | null>(null)
  const autoMarkAsRead = options?.autoMarkAsRead !== false

  // ============================================
  // CARGAR MENSAJES DEL VIAJE
  // ============================================

  useEffect(() => {
    if (!tripId || !userId || !otherUserId) return

    const loadMessages = async () => {
      try {
        setError(null)
        setLoading(true)

        // Cargar mensajes de esta conversación específica -- la única llamada
        // que de verdad hace falta esperar para poder mostrar algo en pantalla.
        const data = await getTripMessages(tripId, userId, otherUserId)
        setMessages(data)

        // El conteo de no leídos ya se puede sacar de los mensajes recién
        // cargados, sin una segunda vuelta al servidor solo para eso.
        const unread = data.filter((m) => m.to_user_id === userId && !m.is_read).length
        setUnreadCount(unread)

        // Marcar como leídos es un efecto secundario -- no bloquea mostrar
        // los mensajes, así que no se espera (antes sí, sumando una tercera
        // vuelta al servidor antes de que se viera nada).
        if (autoMarkAsRead && unread > 0) {
          markTripMessagesAsRead(tripId, userId)
            .then(() => setUnreadCount(0))
            .catch(() => {})
        }
      } catch (err: any) {
        setError(err.message)
        console.error('Error loading trip messages:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [tripId, userId, otherUserId, autoMarkAsRead])

  // ============================================
  // SUSCRIBIRSE A NUEVOS MENSAJES
  // ============================================

  useEffect(() => {
    if (!tripId || !userId || !otherUserId) return

    // Limpiar suscripciones previas
    if (messagesChannelRef.current) {
      messagesChannelRef.current()
      messagesChannelRef.current = null
    }

    // Suscribirse a nuevos mensajes de esta conversación específica
    messagesChannelRef.current = subscribeTripMessages(tripId, userId, otherUserId ?? null, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev
        return [...prev, newMessage]
      })

      if (autoMarkAsRead && newMessage.to_user_id === userId && !newMessage.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
        // El chat está abierto y se está viendo en vivo -- sin esto, is_read se
        // queda en false en la base (nunca se marcó, solo se restó al contador
        // local en memoria), y el badge de "no leídos" vuelve a aparecer en
        // cuanto se sale de esta pantalla, aunque el mensaje sí se vio.
        markTripMessageAsRead(newMessage.id).catch(() => {})
      }
    })

    return () => {
      if (messagesChannelRef.current) {
        messagesChannelRef.current()
        messagesChannelRef.current = null
      }
    }
  }, [tripId, userId, otherUserId, autoMarkAsRead])

  // ============================================
  // SUSCRIBIRSE A CAMBIOS DE ESTADO (read status)
  // ============================================

  useEffect(() => {
    if (!tripId) return

    // Limpiar suscripción previa
    if (updatesChannelRef.current) {
      updatesChannelRef.current()
      updatesChannelRef.current = null
    }

    // Suscribirse a actualizaciones
    updatesChannelRef.current = subscribeTripMessageUpdates(tripId, (messageId, isRead) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: isRead } : m))
      )
    })

    return () => {
      if (updatesChannelRef.current) {
        updatesChannelRef.current()
        updatesChannelRef.current = null
      }
    }
  }, [tripId])

  // ============================================
  // LIMPIAR SUSCRIPCIONES AL DESMONTAR
  // ============================================

  useEffect(() => {
    return () => {
      if (messagesChannelRef.current) {
        messagesChannelRef.current()
        messagesChannelRef.current = null
      }
      if (updatesChannelRef.current) {
        updatesChannelRef.current()
        updatesChannelRef.current = null
      }
    }
  }, [])

  // ============================================
  // ENVIAR MENSAJE
  // ============================================

  const send = useCallback(
    async (message: string) => {
      if (!tripId || !userId || !otherUserId) {
        setError('Missing required parameters')
        return
      }

      if (!message || !message.trim()) {
        setError('Message cannot be empty')
        return
      }

      const tempId = `temp-${Date.now()}`
      const tempMessage: TripMessage = {
        id: tempId,
        trip_id: tripId,
        from_user_id: userId,
        to_user_id: otherUserId,
        message: message.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
      }

      setMessages((prev) => [...prev, tempMessage])

      try {
        setError(null)
        const sent = await sendTripMessage(tripId, userId, otherUserId, message)
        // Reemplazar temp con el mensaje real del servidor
        setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)))

        // Vía RPC (SECURITY DEFINER), no insert directo -- insertar para OTRO usuario
        // desde el cliente chocaba con RLS de la tabla notifications.
        supabase
          .rpc('notify_trip_message', { p_trip_id: tripId, p_to_user_id: otherUserId, p_message: message.trim() })
          .then(({ error: notifyError }) => {
            if (notifyError) console.error('No se pudo insertar la notificación de mensaje:', notifyError)
          })
      } catch (err: any) {
        // Revertir optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setError(err.message)
      }
    },
    [tripId, userId, otherUserId]
  )

  return {
    messages,
    loading,
    error,
    unreadCount,
    send,
  }
}
