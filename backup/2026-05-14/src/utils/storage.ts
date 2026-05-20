import * as SecureStore from 'expo-secure-store'

// Claves que contienen datos sensibles → siempre en SecureStore cifrado
const SECURE_KEYS = new Set(['trive_user_session_key'])

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
  if (SECURE_KEYS.has(key) && isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(key)
  }
  return inMemory.get(key) ?? null
}

export async function setItem(key: string, value: string): Promise<void> {
  if (SECURE_KEYS.has(key) && isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  inMemory.set(key, value)
}

export async function removeItem(key: string): Promise<void> {
  if (SECURE_KEYS.has(key) && isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key)
    return
  }
  inMemory.delete(key)
}
