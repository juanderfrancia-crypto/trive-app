import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Crypto from 'expo-crypto'
import { supabase } from './supabase'
import { getItem, removeItem, setItem } from '../utils/storage'

const SESSION_KEY = 'trive_user_session_key'
const DEVICE_ID_KEY = 'trive_device_id'

const createSessionKey = (): string => Crypto.randomUUID()

// Si dos llamadas a getSessionKey()/getDeviceId() corren casi al mismo tiempo la PRIMERA
// vez (antes de que exista un valor guardado), ambas leerían "nada guardado todavía" y
// cada una generaría un UUID distinto -- la segunda en escribir ganaría en SecureStore,
// pero la primera ya se había quedado con el UUID viejo en su variable local. Con 17
// pantallas distintas llamando useAuth() (y por lo tanto registerUserSession()), esto
// pasaba de verdad (encontrado el 12-nov-2026: dos UUID de dispositivo distintos para el
// MISMO teléfono en el mismo instante, cada uno pensando que el otro era "otro
// dispositivo" y revocándose la sesión mutuamente). Esta promesa compartida por módulo
// asegura que todas las llamadas concurrentes esperen la MISMA lectura-o-creación.
let _sessionKeyPromise: Promise<string> | null = null
const getSessionKey = (): Promise<string> => {
  if (!_sessionKeyPromise) {
    _sessionKeyPromise = (async () => {
      let sessionKey = await getItem(SESSION_KEY)
      if (!sessionKey) {
        sessionKey = createSessionKey()
        await setItem(SESSION_KEY, sessionKey)
      }
      return sessionKey
    })()
  }
  return _sessionKeyPromise
}

// Identidad del dispositivo para la verificación de "dispositivo nuevo" (punto 3 de
// seguridad). A diferencia de SESSION_KEY, esta NUNCA se borra al cerrar sesión -- tiene
// que sobrevivir logout/login en el mismo teléfono, o todo el mundo sería "dispositivo
// nuevo" cada vez que cierra sesión.
let _deviceIdPromise: Promise<string> | null = null
export const getDeviceId = (): Promise<string> => {
  if (!_deviceIdPromise) {
    _deviceIdPromise = (async () => {
      let deviceId = await getItem(DEVICE_ID_KEY)
      if (!deviceId) {
        deviceId = Crypto.randomUUID()
        await setItem(DEVICE_ID_KEY, deviceId)
      }
      return deviceId
    })()
  }
  return _deviceIdPromise
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

export type RevokedSession = { session_key: string; push_token: string | null }

export const registerUserSession = async (userId: string): Promise<{ sessionKey: string; revoked: RevokedSession[] }> => {
  const sessionKey = await getSessionKey()
  const deviceId = await getDeviceId()
  const deviceName = getDeviceLabel()
  const deviceType = Platform.OS
  const osVersion = getOsVersion()
  const location = 'Ubicación no disponible'

  const { error } = await supabase
    .from('user_sessions')
    .upsert(
      {
        session_key: sessionKey,
        device_id: deviceId,
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

  if (error) throw error

  // Limpiar sesiones antiguas del mismo dispositivo (mismo device_name + user)
  // que NO sean la sesión actual — eliminan los duplicados acumulados
  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('device_name', deviceName)
    .neq('session_key', sessionKey)

  // Sesión única por cuenta (punto 4 de seguridad): cualquier OTRO dispositivo (device_id
  // distinto) que seguía activo se cierra. Se guarda su push_token antes de desactivarlo,
  // para poder avisarle -- useAuth.ts es quien manda el push, aquí solo se marca y se
  // devuelve la lista de sesiones cerradas.
  const { data: otherSessions } = await supabase
    .from('user_sessions')
    .select('session_key, push_token')
    .eq('user_id', userId)
    .eq('is_current', true)
    .neq('device_id', deviceId)

  const revoked = (otherSessions ?? []) as RevokedSession[]

  if (revoked.length > 0) {
    await supabase
      .from('user_sessions')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_current', true)
      .neq('device_id', deviceId)
  }

  return { sessionKey, revoked }
}

// Guarda el push token de ESTA sesión (no solo profiles.push_token, que un segundo
// dispositivo sobrescribe) -- así se puede avisar a un dispositivo específico aunque
// profiles.push_token ya apunte a otro.
export const updateSessionPushToken = async (pushToken: string): Promise<void> => {
  const sessionKey = await getItem(SESSION_KEY)
  if (!sessionKey) return
  await supabase.from('user_sessions').update({ push_token: pushToken }).eq('session_key', sessionKey)
}

export const getUserSessions = async (userId: string): Promise<UserSessionRecord[]> => {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('last_active_at', { ascending: false })

  if (error) throw error

  // Deduplicar por device_name — si hay varios registros del mismo dispositivo
  // solo mostramos el más reciente (el primero por orden descendente)
  const seen = new Set<string>()
  return (data || []).filter((s) => {
    const key = s.device_name || s.session_key
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  // Si no se limpia también la promesa cacheada, getSessionKey() seguiría devolviendo
  // para siempre el valor ya borrado de SecureStore en vez de generar uno nuevo real.
  _sessionKeyPromise = null
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
