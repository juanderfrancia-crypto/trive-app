import Toast from 'react-native-toast-message'

export const showSuccess = (message: string, duration = 2500) => {
  Toast.show({ type: 'success', text1: message, visibilityTime: duration })
}

export const showError = (message: string, duration = 3500) => {
  Toast.show({ type: 'error', text1: message, visibilityTime: duration })
}

export const showInfo = (message: string, duration = 3000) => {
  Toast.show({ type: 'info', text1: message, visibilityTime: duration })
}

export const showWarning = (message: string, duration = 3500) => {
  Toast.show({ type: 'warning', text1: message, visibilityTime: duration })
}
