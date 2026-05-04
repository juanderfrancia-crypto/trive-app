import AsyncStorage from '@react-native-async-storage/async-storage'

type StorageAdapter = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const inMemoryStorage = new Map<string, string>()

const createFallbackStorage = (): StorageAdapter => {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
    const browserStorage = (globalThis as any).localStorage as Storage
    return {
      getItem: (key: string) => browserStorage.getItem(key),
      setItem: (key: string, value: string) => browserStorage.setItem(key, value),
      removeItem: (key: string) => browserStorage.removeItem(key),
    }
  }

  return {
    getItem: (key: string) => inMemoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      inMemoryStorage.set(key, value)
    },
    removeItem: (key: string) => {
      inMemoryStorage.delete(key)
    },
  }
}

const fallbackStorage = createFallbackStorage()
let useFallback = false

const isAsyncStorageUsable = () => {
  return (
    !useFallback &&
    AsyncStorage != null &&
    typeof AsyncStorage.getItem === 'function' &&
    typeof AsyncStorage.setItem === 'function' &&
    typeof AsyncStorage.removeItem === 'function'
  )
}

const handleAsyncError = (error: unknown) => {
  useFallback = true
  return error
}

export async function getItem(key: string): Promise<string | null> {
  if (!isAsyncStorageUsable()) {
    return fallbackStorage.getItem(key)
  }

  try {
    return await AsyncStorage.getItem(key)
  } catch (error) {
    handleAsyncError(error)
    return fallbackStorage.getItem(key)
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (!isAsyncStorageUsable()) {
    fallbackStorage.setItem(key, value)
    return
  }

  try {
    await AsyncStorage.setItem(key, value)
  } catch (error) {
    handleAsyncError(error)
    fallbackStorage.setItem(key, value)
  }
}

export async function removeItem(key: string): Promise<void> {
  if (!isAsyncStorageUsable()) {
    fallbackStorage.removeItem(key)
    return
  }

  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    handleAsyncError(error)
    fallbackStorage.removeItem(key)
  }
}
