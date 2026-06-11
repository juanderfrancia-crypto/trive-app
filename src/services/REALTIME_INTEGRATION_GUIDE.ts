/**
 * 🔄 FASE 6: LISTENERS REALTIME - GUÍA DE INTEGRACIÓN
 * 
 * Este archivo muestra cómo usar las subscripciones realtime en componentes React.
 * 
 * Beneficios:
 * ✅ Actualizaciones automáticas sin recargar
 * ✅ UI siempre sincronizada con la base de datos
 * ✅ Mejor experiencia del usuario
 * ✅ Menor carga de red (solo cambios transmitidos)
 */

import React, { useEffect, useCallback } from 'react'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { useFocusEffect } from '@react-navigation/native'

/**
 * ─── EJEMPLO 1: Escuchar cambios en solicitudes del pasajero ────────────────
 * 
 * En ActiveTripsScreen.tsx o CompletedTripsScreen.tsx
 */
function ExamplePassengerRequests() {
  const { requests, loadPassengerRequests, subscribeTripRatings } = useAirportNegotiation()
  const userId = 'user-id' // desde useAppStore

  // Cargar solicitudes y configurar listener cuando pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      loadPassengerRequests(userId)
      // El hook ya maneja la suscripción realtime automáticamente
      // Los cambios en airport_requests se reflejarán en tiempo real
      
      return () => {
        // Cleanup manual si lo necesitas
        // el hook ya lo maneja en cleanupChannels()
      }
    }, [userId, loadPassengerRequests])
  )

  return (
    // Tu UI aquí - requests se actualizarán automáticamente
    null
  )
}

/**
 * ─── EJEMPLO 2: Escuchar cambios en ofertas de una solicitud ────────────────
 * 
 * En AirportRequestDetailsScreen.tsx
 */
function ExampleOffersListener() {
  const { offers, loadOffersForRequest } = useAirportNegotiation()
  const requestId = 'request-id' // desde route.params

  useEffect(() => {
    loadOffersForRequest(requestId)
    // El hook configura listener automáticamente
    // Nuevas ofertas aparecerán en tiempo real
  }, [requestId, loadOffersForRequest])

  return null
}

/**
 * ─── EJEMPLO 3: Escuchar calificaciones en tiempo real ──────────────────────
 * 
 * En CompletedTripsScreen.tsx o en un modal de detalles
 */
function ExampleRatingsListener() {
  const { loadTripRatings, subscribeTripRatings } = useAirportNegotiation()
  const requestId = 'request-id'

  useEffect(() => {
    // Cargar calificaciones existentes
    loadTripRatings(requestId)

    // Suscribirse a nuevas calificaciones
    subscribeTripRatings(requestId, (newRating) => {
      console.log('💫 Nueva calificación:', newRating)
      // Aquí puedes:
      // - Mostrar animación de entrada
      // - Actualizar el perfil del conductor
      // - Mostrar notificación local
    })
  }, [requestId, loadTripRatings, subscribeTripRatings])

  return null
}

/**
 * ─── IMPLEMENTACIÓN RECOMENDADA EN CompletedTripsScreen.tsx ────────────────
 * 
 * Reemplaza el componente existente con esta estructura:
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'

export function CompletedTripsScreenWithRealtime() {
  const { 
    requests, 
    loading, 
    rateTrip, 
    loadTripRatings,
    subscribeTripRatings,
  } = useAirportNegotiation()
  
  const user = null // useAppStore((s) => s.user)
  const [ratings, setRatings] = React.useState<Record<string, any>>({})

  // Al montar o cambiar trip
  useEffect(() => {
    completedTrips.forEach(trip => {
      // Cargar ratings existentes
      loadTripRatings(trip.id)

      // Suscribirse a nuevas ratings
      subscribeTripRatings(trip.id, (newRating) => {
        setRatings(prev => ({
          ...prev,
          [trip.id]: newRating,
        }))
      })
    })
  }, []) // Agregar dependencias según sea necesario

  // El resto del componente...
  return null
}

/**
 * ─── PATRÓN DE SUSCRIPCIÓN AUTOMÁTICA ──────────────────────────────────────
 * 
 * El hook useAirportNegotiation ya configura listeners automáticamente para:
 * 
 * ✅ loadPassengerRequests()
 *    → Escucha cambios en solicitudes del pasajero
 *    → Actualiza automáticamente estado del viaje (accepted, in_progress, completed)
 * 
 * ✅ loadDriverFeed()
 *    → Escucha nuevas solicitudes pendientes
 *    → Nuevos viajes aparecen sin recargar
 * 
 * ✅ loadOffersForRequest()
 *    → Escucha nuevas ofertas en tiempo real
 *    → Cambios de estado de ofertas (aceptada, rechazada)
 * 
 * ✅ subscribeTripRatings() (Nueva)
 *    → Escucha nuevas calificaciones en tiempo real
 *    → Perfil se actualiza automáticamente
 */

/**
 * ─── DEBUGGING & MONITORING ───────────────────────────────────────────────
 */

// Habilitar logs en desarrollo
if (__DEV__) {
  // El hook ya tiene console.log con prefijos:
  // 🟡 [HOOK] - Operaciones en progreso
  // ✅ [HOOK] - Éxito
  // ❌ [HOOK] - Error
  // 🟡 [DB] - Notificaciones de Supabase
  
  console.log('✅ Listeners realtime inicializados')
}

/**
 * ─── OPTIMIZACIONES POSIBLES ──────────────────────────────────────────────
 */

/**
 * 1. Debouncing de actualizaciones múltiples
 *    Si el hook recibe múltiples cambios rápido, podrías
 *    agruparlos en un solo re-render
 */

/**
 * 2. Sincronización selectiva
 *    Únicamente escuchar cambios relevantes (ej: solo solicitudes activas)
 */

/**
 * 3. Indicadores visuales
 *    Mostrar "sincronizando..." cuando hay cambios
 *    Animaciones suaves al actualizar datos
 */

/**
 * ─── RESUMEN FUNCIONES DISPONIBLES ──────────────────────────────────────
 */

export const REALTIME_FUNCTIONS = {
  // Datos
  requests: 'Array de solicitudes del usuario',
  offers: 'Array de ofertas de una solicitud',
  loading: 'Estado de carga',
  error: 'Mensaje de error si ocurre',

  // Carga + Subscribe (automático)
  loadPassengerRequests: 'Carga solicitudes del pasajero + listener',
  loadDriverFeed: 'Carga feed de conductor + listener',
  loadOffersForRequest: 'Carga ofertas de solicitud + listener',
  loadSingleRequest: 'Carga solicitud individual',

  // Nuevas funciones (FASE 6)
  loadTripRatings: 'Carga calificaciones existentes',
  subscribeTripRatings: 'Suscribe a nuevas calificaciones en tiempo real',

  // Control
  cleanupChannels: 'Limpia todas las suscripciones',
}
