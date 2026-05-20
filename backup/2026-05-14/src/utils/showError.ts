/**
 * User-friendly error display utility
 * Uses Toast notifications for non-blocking error display
 */

import Toast from 'react-native-toast-message'

/**
 * Show a user-friendly error toast
 * Call this instead of Alert.alert('Error', ...)
 */
export const showError = (message: string, duration = 3000) => {
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message,
    visibilityTime: duration,
  })
}

/**
 * Show a success toast
 */
export const showSuccess = (message: string, duration = 2500) => {
  Toast.show({
    type: 'success',
    text1: 'Listo',
    text2: message,
    visibilityTime: duration,
  })
}

/**
 * Show an info toast
 */
export const showInfo = (message: string, duration = 3000) => {
  Toast.show({
    type: 'info',
    text1: 'Info',
    text2: message,
    visibilityTime: duration,
  })
}

/**
 * Show a warning toast
 */
export const showWarning = (message: string, duration = 3500) => {
  Toast.show({
    type: 'error',
    text1: 'Atencion',
    text2: message,
    visibilityTime: duration,
  })
}