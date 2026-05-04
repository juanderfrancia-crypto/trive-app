import { Platform } from 'react-native'
import * as Device from 'expo-device'
import { supabase } from './supabase'
import { getItem, removeItem, setItem } from '../utils/storage'

const SESSION_KEY = 'trive_user_session_key'

const createSessionKey = (): string => {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function') {
    return (globalThis as any).crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const getSessionKey = async (): Promise<string> => {
  let sessionKey = await getItem(SESSION_KEY)
  if (!sessionKey) {
    sessionKey = createSessionKey()
    await setItem(SESSION_KEY, sessionKey)
  }
  return sessionKey
}

const getDeviceLabel = (): string => {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined') {
      return `Web · ${navigator.userAgent.split(' ').slice(0, 3).join(' ')}`
    }
    return 'Web'
  }

  const parts = [Device.manufacturer, Device.modelName || Device.deviceName]
    .filter(Boolean)
    .join(' ')

  return parts || 'Dispositivo'
}

const getOsVersion = (): string => {
  if (Platform.OS === 'web') {
    return 'Web'
  }

  const name = Device.osName || Platform.OS
  const version = Device.osVersion ? `${Device.osVersion}` : ''
  return [name, version].filter(Boolean).join(' ')
}

export type UserSessionRecord = {
  id: string
  user_id: string
  session_key: string
  device_name: string | null
  device_type: string | null
  os_version: string | null
  location: string | null
  is_current: boolean
  last_active_at: string | null
  created_at: string | null
  updated_at: string | null
}

export const registerUserSession = async (userId: string): Promise<string> => {
  const sessionKey = await getSessionKey()
  const deviceName = getDeviceLabel()
  const deviceType = Platform.OS
  const osVersion = getOsVersion()
  const location = 'Ubicación no disponible'

  const { error } = await supabase
    .from('user_sessions')
    .upsert(
      {
        session_key: sessionKey,
        user_id: userId,
        device_name: deviceName,
        device_type: deviceType,
        os_version: osVersion,
        location,
        is_current: true,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_key' }
    )

  if (error) {
    throw error
  }

  return sessionKey
}

export const getUserSessions = async (userId: string): Promise<UserSessionRecord[]> => {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('last_active_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export const deactivateCurrentSession = async (): Promise<void> => {
  const sessionKey = await getItem(SESSION_KEY)
  if (!sessionKey) return

  const { error } = await supabase
    .from('user_sessions')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('session_key', sessionKey)

  if (error) {
    throw error
  }
}

export const clearLocalSessionKey = async (): Promise<void> => {
  await removeItem(SESSION_KEY)
}

export const endUserSession = async (sessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('user_sessions')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    throw error
  }
}
