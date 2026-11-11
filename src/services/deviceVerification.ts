import { supabase } from './supabase'
import { getDeviceId } from './userSessions'
import { useAppStore } from '../store/useAppStore'

// Punto 3 del plan de seguridad: ¿este dispositivo ya está reconocido para la cuenta
// autenticada? Sin cédula todavía no hay nada que verificar (el gate de cédula se
// encarga de pedirla antes que este). Falla abierto (deja pasar) si el RPC no responde --
// esto es una capa extra sobre el OTP, no el único candado; además así el login no se
// rompe si la migración de la BD (check_device) todavía no está aplicada.
export const checkDeviceVerification = async (cedula: string | null): Promise<void> => {
  const { setDeviceVerificationStatus } = useAppStore.getState()
  if (!cedula) { setDeviceVerificationStatus('recognized'); return }
  try {
    const deviceId = await getDeviceId()
    const { data, error } = await supabase.rpc('check_device', { p_device_id: deviceId })
    if (error) { setDeviceVerificationStatus('recognized'); return }
    setDeviceVerificationStatus(data === 'needs_verification' ? 'needs_verification' : 'recognized')
  } catch {
    setDeviceVerificationStatus('recognized')
  }
}
