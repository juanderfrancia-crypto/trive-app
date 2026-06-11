import { QueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * React Query Configuration with Offline Cache
 * 
 * Benefits:
 * - Automatic caching of queries
 * - Background synchronization
 * - Offline-first: show cached data while syncing
 * - Smart cache invalidation
 * 
 * Cache Strategy:
 * - staleTime: 60s (data is fresh for 60s)
 * - cacheTime: 5min (keep in memory for 5min)
 * - gcTime: 10min (keep in AsyncStorage for 10min)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⏱️ Time before data is considered stale (refetch triggers)
      staleTime: 60 * 1000, // 1 minute
      
      // 💾 Time to keep cached data in memory after component unmounts
      gcTime: 5 * 60 * 1000, // 5 minutes
      
      // 🔄 Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // 📱 Refetch when network comes online
      networkMode: 'online',
      
      // ⚡ Don't refetch on window focus
      refetchOnWindowFocus: false,
      
      // 🔙 Refetch when component remounts
      refetchOnMount: 'stale',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
})

/**
 * Custom hook to get persisted cache key for offline storage
 * Usage: const cacheKey = getOfflineCacheKey('routes', { origin: 'Cali', dest: 'Bogota' })
 */
export const getOfflineCacheKey = (
  queryKey: string,
  params?: Record<string, any>
): string => {
  if (params) {
    return `rq_cache_${queryKey}_${JSON.stringify(params)}`
  }
  return `rq_cache_${queryKey}`
}

/**
 * Save query result to offline cache
 */
export const saveToOfflineCache = async (key: string, data: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data))
    console.log(`✅ [Cache] Saved to AsyncStorage: ${key}`)
  } catch (err) {
    console.warn(`⚠️ [Cache] Failed to save: ${key}`, err)
  }
}

/**
 * Load query result from offline cache
 */
export const loadFromOfflineCache = async (key: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(key)
    if (cached) {
      console.log(`✅ [Cache] Loaded from AsyncStorage: ${key}`)
      return JSON.parse(cached)
    }
    return null
  } catch (err) {
    console.warn(`⚠️ [Cache] Failed to load: ${key}`, err)
    return null
  }
}

/**
 * Clear all offline cache
 */
export const clearOfflineCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter((key) => key.startsWith('rq_cache_'))
    await AsyncStorage.multiRemove(cacheKeys)
    console.log(`🗑️ [Cache] Cleared ${cacheKeys.length} cached items`)
  } catch (err) {
    console.warn(`⚠️ [Cache] Failed to clear cache`, err)
  }
}

/**
 * Get cache size (for debugging)
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter((key) => key.startsWith('rq_cache_'))
    let totalSize = 0
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key)
      if (value) {
        totalSize += value.length
      }
    }
    return Math.round(totalSize / 1024) // KB
  } catch (err) {
    console.warn(`⚠️ [Cache] Failed to get cache size`, err)
    return 0
  }
}
