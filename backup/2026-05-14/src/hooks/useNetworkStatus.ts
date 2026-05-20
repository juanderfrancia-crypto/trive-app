import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'none' | 'unknown'>('unknown')

  useEffect(() => {
    const subscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true
      setIsOnline(online)

      // Detectar tipo de conexión
      if (state.type === 'wifi') {
        setConnectionType('wifi')
      } else if (state.type === 'cellular') {
        setConnectionType('cellular')
      } else if (state.isConnected === false) {
        setConnectionType('none')
      } else {
        setConnectionType('unknown')
      }
    })

    return () => {
      subscribe()
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isWifi: connectionType === 'wifi',
    isCellular: connectionType === 'cellular',
  }
}
