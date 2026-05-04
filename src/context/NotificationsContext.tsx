import { createContext, useContext, type ReactNode } from 'react'
import { useNotifications } from '../hooks/useNotifications'

type NotificationCenterApi = ReturnType<typeof useNotifications>

const NotificationsContext = createContext<NotificationCenterApi | null>(null)

export function NotificationsProvider({
  userId,
  children,
}: {
  userId?: string
  children: ReactNode
}) {
  const api = useNotifications(userId)
  return <NotificationsContext.Provider value={api}>{children}</NotificationsContext.Provider>
}

export function useNotificationCenter(): NotificationCenterApi {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotificationCenter debe usarse dentro de NotificationsProvider')
  }
  return ctx
}
