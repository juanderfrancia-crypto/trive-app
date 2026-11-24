import { supabase } from './supabase'
import { getDeviceId } from './userSessions'
import { useAppStore } from '../store/useAppStore'

// Punto 3 del plan de seguridad: ¿este dispositivo ya está reconocido para la cuenta
// autenticada? Sin cédula todavía no hay nada que verificar (el gate de cédula se
// encarga de pedirla antes que este).
//
// Si el RPC falla (red, o la migración de check_device aún no está aplicada), NO se
// toca el estado -- ni se otorga acceso ni se bloquea, simplemente se reintenta en la
// próxima oportunidad (reabrir la app, volver del background). Antes esto fallaba
// ABIERTO (forzaba 'recognized' en cualquier error), lo que significaba que un error
// de red podía saltarse por completo la verificación sin que el usuario confirmara
// nada -- bug real de seguridad encontrado el 24-nov-2026.
export const checkDeviceVerification = async (cedula: string | null): Promise<void> => {
  const { setDeviceVerificationStatus } = useAppStore.getState()
  if (!cedula) { setDeviceVerificationStatus('recognized'); return }
  try {
    const deviceId = await getDeviceId()
    const { data, error } = await supabase.rpc('check_device', { p_device_id: deviceId })
    if (error) return
    setDeviceVerificationStatus(data === 'needs_verification' ? 'needs_verification' : 'recognized')
  } catch {
    // no se pudo confirmar -- se deja el estado como estaba, nunca se otorga acceso por un error
  }
}
