/**
 * Wraps a promise with a timeout. Rejects with code 'TIMEOUT' if the promise
 * doesn't resolve within `ms` milliseconds.
 *
 * Uses .then()/.catch() instead of .finally() for compatibility with Supabase
 * query builders, which are thenables but do not implement Promise.prototype.finally.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error('La operación tardó demasiado. Verifica tu conexión e intenta de nuevo.'), { code: 'TIMEOUT' }))
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).then(
    (result) => {
      clearTimeout(timeoutId)
      return result
    },
    (error) => {
      clearTimeout(timeoutId)
      throw error
    }
  )
}
