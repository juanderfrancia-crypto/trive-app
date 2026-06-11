import React, { useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../services/queryClient'

/**
 * React Query Provider Wrapper
 * 
 * Envuelve tu App con esto para activar todas las features de React Query:
 * - Automatic caching
 * - Background sync
 * - Offline-first with AsyncStorage
 * - Deduplication
 * 
 * Uso en App.tsx:
 * ```
 * import { ReactQueryProvider } from './providers/ReactQueryProvider'
 * 
 * export default function App() {
 *   return (
 *     <ReactQueryProvider>
 *       <YourAppNavigator />
 *     </ReactQueryProvider>
 *   )
 * }
 * ```
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Memoize queryClient para evitar recrear en cada render
  const memoizedQueryClient = useMemo(() => queryClient, [])

  return (
    <QueryClientProvider client={memoizedQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
