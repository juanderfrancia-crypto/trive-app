import { useEffect, useState, useCallback, useRef } from 'react'
import * as Location from 'expo-location'

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number | null
  timestamp: number
}

/**
 * Hook que obtiene la ubicación del usuario cada N segundos
 * Usa expo-location (compatible con Expo managed workflow)
 * Fallback: coordenadas demo de Cali si no está disponible
 */
export const useUserLocation = (intervalSeconds: number = 30) => {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const permissionRef = useRef<Location.PermissionStatus | null>(null)

  const getCurrentLocation = useCallback(async () => {
    try {
      // Solicitar permisos la primera vez
      if (permissionRef.current === null) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        permissionRef.current = status
        
        if (status !== 'granted') {
          throw new Error('Permiso de ubicación denegado')
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: currentLocation.timestamp || Date.now(),
      })
      setError(null)
      setLoading(false)
    } catch (err: any) {
      // Fallback to demo coordinates (Cali, Colombia)
      setLocation({
        latitude: 3.4372,
        longitude: -76.5197,
        accuracy: null,
        timestamp: Date.now(),
      })
      setError(err?.message || 'No se pudo obtener ubicación')
      setLoading(false)
    }
  }, [])

  // Obtener ubicación inicial
  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  // Polling cada N segundos
  useEffect(() => {
    const interval = setInterval(() => {
      getCurrentLocation()
    }, intervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [intervalSeconds, getCurrentLocation])

  return {
    location,
    error,
    loading,
  }
}
