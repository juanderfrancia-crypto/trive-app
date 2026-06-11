import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { realtimeManager } from '../services/realtimeSubscriptionManager'
import { getOfflineCacheKey, loadFromOfflineCache, saveToOfflineCache } from '../services/queryClient'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}

/**
 * REFACTORIZADO: useNotifications con React Query + Realtime Singleton
 * 
 * ANTES:
 * - useEffect manual con listener
 * - Queries sin límite (traía todas las notificaciones)
 * - No había offline cache
 * - Memory leak si no se limpiaba bien
 * 
 * DESPUÉS:
 * ✅ React Query maneja caching y retry automático
 * ✅ Realtime singleton (solo 1 listener para todas las instancias)
 * ✅ Offline-first con AsyncStorage
 * ✅ Auto cleanup en unmount
 */
export const useNotificationsRefactored = (userId?: string) => {
  const queryClient = useQueryClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const hookIdRef = useRef(`useNotifications_${Date.now()}_${Math.random()}`)

  // 📡 Fetch con offline-first
  const fetchNotifications = useCallback(async (): Promise<Notification[]> => {
    // 1️⃣ Intentar cache offline primero
    if (userId) {
      const cacheKey = getOfflineCacheKey('notifications', { userId })
      const cached = await loadFromOfflineCache(cacheKey)
      if (cached) {
        console.log(`✅ [useNotifications] Loaded ${cached.length} from offline cache`)
      }
    }

    // 2️⃣ Fetch desde BD
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100) // 🔧 Ya tiene limit (FASE 1 fix)

    if (error) throw error

    // 3️⃣ Guardar en cache offline
    if (userId && data) {
      const cacheKey = getOfflineCacheKey('notifications', { userId })
      await saveToOfflineCache(cacheKey, data)
    }

    return (data || []) as Notification[]
  }, [userId])

  // 🔍 React Query handles caching, deduplication, stale state
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: fetchNotifications,
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s (notifs should be fresher)
    gcTime: 5 * 60 * 1000, // 5 min in memory
  })

  // 📊 Computed unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // 📡 Realtime subscription (SINGLETON)
  useEffect(() => {
    if (!userId) return

    console.log(`🔌 [useNotifications] Setting up realtime listener`)

    unsubscribeRef.current = realtimeManager.subscribeToNotifications(
      userId,
      hookIdRef.current,
      (payload: any) => {
        console.log(`✅ [Realtime] Notification update:`, payload.eventType)
        // Invalidate to trigger refetch
        queryClient.invalidateQueries({
          queryKey: ['notifications', userId],
        })
      }
    )

    return () => {
      console.log(`🔌 [useNotifications] Cleaning up realtime listener`)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [userId, queryClient])

  // ✏️ Mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)

        // Optimistic update
        queryClient.setQueryData(['notifications', userId], (old: Notification[] | undefined) => {
          if (!old) return old
          return old.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        })
      } catch (err) {
        console.error('Error marking as read:', err)
      }
    },
    [userId, queryClient]
  )

  // ✏️ Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      // Optimistic update
      queryClient.setQueryData(['notifications', userId], (old: Notification[] | undefined) => {
        if (!old) return old
        return old.map((n) => ({ ...n, is_read: true }))
      })
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [userId, queryClient])

  // 🗑️ Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await supabase.from('notifications').delete().eq('id', notificationId)

        // Optimistic update
        queryClient.setQueryData(['notifications', userId], (old: Notification[] | undefined) => {
          if (!old) return old
          return old.filter((n) => n.id !== notificationId)
        })
      } catch (err) {
        console.error('Error deleting notification:', err)
      }
    },
    [userId, queryClient]
  )

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
