import * as LocalAuthentication from 'expo-local-authentication'
import { getItem, removeItem, setItem } from '../utils/storage'

const BIOMETRIC_KEY = 'trive_biometric_enabled'

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

export const getStoredBiometricEnabled = async (): Promise<boolean> => {
  const value = await getItem(BIOMETRIC_KEY)
  return value === 'true'
}

export const setStoredBiometricEnabled = async (enabled: boolean): Promise<void> => {
  if (enabled) {
    await setItem(BIOMETRIC_KEY, 'true')
  } else {
    await removeItem(BIOMETRIC_KEY)
  }
}
