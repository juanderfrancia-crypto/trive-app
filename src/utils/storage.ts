import * as SecureStore from 'expo-secure-store'

// Claves que contienen datos sensibles, o que deben sobrevivir a cerrar la
// app → siempre en SecureStore cifrado, nunca en el fallback en memoria.
// 'trive_biometric_enabled' va por prefijo porque lleva el id de la cuenta
// pegado al final (ver biometricAuth.ts) — cada cuenta en el dispositivo
// tiene su propia clave, no una sola compartida entre todas.
const SECURE_KEYS = new Set(['trive_user_session_key', 'trive_device_id'])
const SECURE_KEY_PREFIXES = ['trive_biometric_enabled']

const isSecureKey = (key: string): boolean =>
  SECURE_KEYS.has(key) || SECURE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))

// Fallback en memoria para web/entornos sin SecureStore
const inMemory = new Map<string, string>()

const isSecureStoreAvailable = (): boolean => {
  try {
    return typeof SecureStore.getItemAsync === 'function'
  } catch {
    return false
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isSecureKey(key) && isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(key)
  }
  return inMemory.get(key) ?? null
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isSecureKey(key) && isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  inMemory.set(key, value)
}

export async function removeItem(key: string): Promise<void> {
  if (isSecureKey(key) && isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key)
    return
  }
  inMemory.delete(key)
}
