import * as LocalAuthentication from 'expo-local-authentication'
import { getItem, removeItem, setItem } from '../utils/storage'

// Una clave por cuenta (SecureStore es del dispositivo, no de la cuenta) —
// sin esto, activar el bloqueo en una cuenta "se hereda" en cualquier otra
// que inicie sesión después en el mismo teléfono. SecureStore solo acepta
// alfanuméricos, '.', '-' y '_' en la clave, por eso '_' como separador y no ':'.
const biometricKey = (userId: string) => `trive_biometric_enabled_${userId}`

export const isBiometricSupported = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
    return hasHardware && supportedTypes.length > 0
  } catch (error) {
    console.error('Error checking biometric support:', error)
    return false
  }
}

export const isBiometricEnrolled = async (): Promise<boolean> => {
  try {
    return await LocalAuthentication.isEnrolledAsync()
  } catch (error) {
    console.error('Error checking biometric enrollment:', error)
    return false
  }
}

export const authenticateBiometric = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verifica tu identidad',
      fallbackLabel: 'Usar PIN',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    })
    return result.success
  } catch (error) {
    console.error('Biometric authentication error:', error)
    return false
  }
}

export const getStoredBiometricEnabled = async (userId: string): Promise<boolean> => {
  const value = await getItem(biometricKey(userId))
  return value === 'true'
}

export const setStoredBiometricEnabled = async (userId: string, enabled: boolean): Promise<void> => {
  if (enabled) {
    await setItem(biometricKey(userId), 'true')
  } else {
    await removeItem(biometricKey(userId))
  }
}
