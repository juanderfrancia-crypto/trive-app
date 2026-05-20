import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getTripMessages,
  sendTripMessage,
  subscribeTripMessages,
  subscribeTripMessageUpdates,
  markTripMessagesAsRead,
  getTripUnreadCount,
  TripMessage,
} from '../services/trip_messages'
import { insertNotificationForUser } from '../services/notificationInsert'
import { useAppStore } from '../store/useAppStore'

interface UseTripMessagesOptions {
  autoMarkAsRead?: boolean
}

export const useTripMessages = (tripId?: string, userId?: string, otherUserId?: string, options?: UseTripMessagesOptions) => {
  const [messages, setMessages] = useState<TripMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const currentUser = useAppStore((s) => s.user)

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

        // Cargar mensajes de esta conversación específica
        const data = await getTripMessages(tripId, userId, otherUserId)
        setMessages(data)

        // Cargar unread count
        const unread = await getTripUnreadCount(tripId, userId)
        setUnreadCount(unread)

        // Marcar como leídos si está habilitado
        if (autoMarkAsRead && unread > 0) {
          await markTripMessagesAsRead(tripId, userId)
          setUnreadCount(0)
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

        // Insertar notificación en la tabla para que aparezca en Alertas → Chat
        const senderName = currentUser?.name || 'Usuario'
        insertNotificationForUser(otherUserId, {
          user_id: otherUserId,
          type: 'message' as const,
          title: `Mensaje de ${senderName}`,
          message: message.trim(),
          is_read: false,
          data: { sender_id: userId, sender_name: senderName, trip_id: tripId },
        }).catch(() => {})
      } catch (err: any) {
        // Revertir optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setError(err.message)
      }
    },
    [tripId, userId, otherUserId, currentUser]
  )

  return {
    messages,
    loading,
    error,
    unreadCount,
    send,
  }
}
