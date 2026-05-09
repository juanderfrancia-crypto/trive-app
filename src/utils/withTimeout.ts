/**
 * Wraps a promise with a timeout. Rejects with 'TIMEOUT' if the promise
 * doesn't resolve within `ms` milliseconds.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error('La operación tardó demasiado. Verifica tu conexión e intenta de nuevo.'), { code: 'TIMEOUT' }))
    }, ms)
  })
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeout,
  ])
}
