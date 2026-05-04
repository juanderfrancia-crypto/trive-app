import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import {
  getPushNotificationToken,
  registerPushToken,
  loadNotificationPreferences,
  saveNotificationPreferences,
  setupNotificationListeners,
} from '../services/pushNotifications'

export interface NotificationPreferences {
  push: boolean
  email: boolean
  sms: boolean
}

const isPushAvailableOnPlatform = Platform.OS === 'ios' || Platform.OS === 'android'

export const usePushNotifications = (userId?: string) => {
  const [isDeviceSupported, setIsDeviceSupported] = useState(false)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushAvailableOnPlatform) {
      setIsDeviceSupported(false)
      return
    }

    if (!Device.isDevice && Platform.OS !== 'android') {
      setIsDeviceSupported(false)
      return
    }

    if (Device.isDevice || Platform.OS === 'android') {
      setIsDeviceSupported(true)
    }

    const initNotifications = async () => {
      try {
        setLoading(true)
        const savedPreferences = await loadNotificationPreferences()
        setPreferences(savedPreferences)

        if (savedPreferences.push && userId) {
          const token = await getPushNotificationToken()
          if (token) {
            setPushToken(token)
            await registerPushToken(userId, token)
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al configurar notificaciones')
      } finally {
        setLoading(false)
      }
    }

    initNotifications()

    const cleanupListeners = setupNotificationListeners()
    return () => { cleanupListeners?.() }
  }, [userId])

  const togglePushNotifications = async (enabled: boolean) => {
    try {
      const newPreferences = { ...preferences, push: enabled }
      setPreferences(newPreferences)
      await saveNotificationPreferences(newPreferences)

      if (enabled && userId && !pushToken) {
        const token = await getPushNotificationToken()
        if (token) {
          setPushToken(token)
          await registerPushToken(userId, token)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar preferencia')
    }
  }

  const toggleEmailNotifications = async (enabled: boolean) => {
    try {
      const newPreferences = { ...preferences, email: enabled }
      setPreferences(newPreferences)
      await saveNotificationPreferences(newPreferences)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar preferencia')
    }
  }

  const toggleSmsNotifications = async (enabled: boolean) => {
    try {
      const newPreferences = { ...preferences, sms: enabled }
      setPreferences(newPreferences)
      await saveNotificationPreferences(newPreferences)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar preferencia')
    }
  }

  return {
    pushToken,
    preferences,
    isDeviceSupported,
    loading,
    error,
    togglePushNotifications,
    toggleEmailNotifications,
    toggleSmsNotifications,
  }
}
