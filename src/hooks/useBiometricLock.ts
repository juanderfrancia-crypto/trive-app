import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { getStoredBiometricEnabled, isBiometricEnrolled, authenticateBiometric } from '../services/biometricAuth'
import { getSessionOnce } from '../services/supabase'

// Bloqueo de pantalla completa estilo WhatsApp/Telegram: se dispara al abrir la
// app desde cero y al volver de segundo plano, nunca por transacción puntual
// (eso es el modelo bancario, no aplica aquí porque Trive no mueve dinero
// directo entre usuarios).
export function useBiometricLock() {
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const enabledRef = useRef(false)
  const lockedRef = useRef(false)
  const authenticatingRef = useRef(false)
  const appState = useRef(AppState.currentState)

  const setLockedBoth = (value: boolean) => {
    lockedRef.current = value
    setLocked(value)
  }

  // El prompt de huella/rostro solo tiene sentido con la app visible en
  // primer plano -- dispararlo justo cuando se va a fondo (que es cuando
  // "locked" se pone en true) deja el intento colgado, porque el sistema no
  // muestra el diálogo con la app en segundo plano. Por eso esta función se
  // llama solo desde el arranque en frío y desde la transición a "active",
  // nunca como reacción directa a que "locked" cambie.
  const unlock = useCallback(async () => {
    if (authenticatingRef.current) return
    authenticatingRef.current = true
    setAuthenticating(true)
    const success = await authenticateBiometric()
    authenticatingRef.current = false
    setAuthenticating(false)
    if (success) setLockedBoth(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      // El bloqueo es por cuenta, no por dispositivo — sin esto, activarlo
      // en una cuenta "se hereda" en cualquier otra que inicie sesión
      // después en el mismo teléfono (ver biometricAuth.ts).
      const { data: { session } } = await getSessionOnce()
      const userId = session?.user?.id
      const enabled = userId ? await getStoredBiometricEnabled(userId) : false
      const enrolled = enabled ? await isBiometricEnrolled() : false
      enabledRef.current = enabled && enrolled
      setLockedBoth(enabledRef.current)
      setReady(true)
      // Arranque en frío: el JS solo corre con la app ya en primer plano,
      // así que aquí sí es seguro intentar de una vez.
      if (enabledRef.current) unlock()
    })()
  }, [unlock])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current
      appState.current = next
      if (!enabledRef.current) return
      if (prev === 'active' && next !== 'active') {
        setLockedBoth(true)
      } else if (next === 'active' && prev !== 'active' && lockedRef.current) {
        unlock()
      }
    })
    return () => sub.remove()
  }, [unlock])

  return { ready, locked, authenticating, retryUnlock: unlock }
}
