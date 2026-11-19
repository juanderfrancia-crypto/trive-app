import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { getStoredBiometricEnabled, isBiometricEnrolled, authenticateBiometric } from '../services/biometricAuth'

// Bloqueo de pantalla completa estilo WhatsApp/Telegram: se dispara al abrir la
// app desde cero y al volver de segundo plano, nunca por transacción puntual
// (eso es el modelo bancario, no aplica aquí porque Trive no mueve dinero
// directo entre usuarios).
export function useBiometricLock() {
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const enabledRef = useRef(false)
  const appState = useRef(AppState.currentState)

  const unlock = useCallback(async () => {
    setAuthenticating(true)
    const success = await authenticateBiometric()
    setAuthenticating(false)
    if (success) setLocked(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const enabled = await getStoredBiometricEnabled()
      const enrolled = enabled ? await isBiometricEnrolled() : false
      enabledRef.current = enabled && enrolled
      setLocked(enabledRef.current)
      setReady(true)
    })()
  }, [])

  // Intenta autenticar automáticamente apenas se bloquea, tanto en el arranque
  // en frío como al volver de segundo plano.
  useEffect(() => {
    if (ready && locked) unlock()
  }, [ready, locked, unlock])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current
      appState.current = next
      if (enabledRef.current && prev === 'active' && next !== 'active') {
        setLocked(true)
      }
    })
    return () => sub.remove()
  }, [])

  return { ready, locked, authenticating, retryUnlock: unlock }
}
