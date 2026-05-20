import Toast from 'react-native-toast-message'

export const showSuccess = (message: string, title = 'Listo', duration = 2500) => {
  Toast.show({ type: 'success', text1: title, text2: message, visibilityTime: duration })
}

export const showError = (message: string, title = 'Error', duration = 3500) => {
  Toast.show({ type: 'error', text1: title, text2: message, visibilityTime: duration })
}

export const showInfo = (message: string, title = 'Info', duration = 3000) => {
  Toast.show({ type: 'info', text1: title, text2: message, visibilityTime: duration })
}

export const showWarning = (message: string, title = 'Atención', duration = 3500) => {
  Toast.show({ type: 'warning', text1: title, text2: message, visibilityTime: duration })
}
