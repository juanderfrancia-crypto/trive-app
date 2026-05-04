/**
 * Utilidades para calcular progreso de viajes basado en geolocalización
 */

export interface LocationPoint {
  latitude: number
  longitude: number
  name: string
}

/**
 * Base de ciudades/puntos principales en Colombia
 * Formato: { lat, lng, name }
 */
const KNOWN_LOCATIONS: LocationPoint[] = [
  // Cali y área metropolitana
  { latitude: 3.4372, longitude: -76.5197, name: 'Centro Cali' },
  { latitude: 3.3910, longitude: -76.5145, name: 'Jardin Plaza' },
  { latitude: 3.4200, longitude: -76.5500, name: 'Norte Cali' },
  { latitude: 3.3500, longitude: -76.5000, name: 'Sur Cali' },
  
  // Ruta Cali - Puerto Tejada
  { latitude: 3.3850, longitude: -76.4500, name: 'Buenaventura' },
  { latitude: 3.3200, longitude: -76.2500, name: 'Puerto Tejada' },
  { latitude: 3.3500, longitude: -76.3500, name: 'Palmira' },
  
  // Cali - Armenia
  { latitude: 3.5000, longitude: -76.0000, name: 'Armenia' },
  { latitude: 3.4500, longitude: -76.2500, name: 'Cartago' },
]

/**
 * Calcula la distancia en KM entre dos puntos GPS usando fórmula de Haversine
 * @param lat1 Latitud punto 1
 * @param lon1 Longitud punto 1
 * @param lat2 Latitud punto 2
 * @param lon2 Longitud punto 2
 * @returns Distancia en kilómetros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radio Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Encuentra la localidad más cercana a unas coordenadas GPS
 * @param latitude Latitud actual
 * @param longitude Longitud actual
 * @param maxDistanceKm Distancia máxima en km (default 5km)
 * @returns Nombre de la localidad o null
 */
export function getNearestLocation(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 5
): string | null {
  let nearest: LocationPoint | null = null
  let minDistance = maxDistanceKm

  for (const location of KNOWN_LOCATIONS) {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = location
    }
  }

  return nearest?.name ?? null
}

/**
 * Calcula el progreso del viaje como porcentaje (0-100)
 * @param currentLat Latitud actual del usuario
 * @param currentLng Longitud actual del usuario
 * @param originLat Latitud del origen
 * @param originLng Longitud del origen
 * @param destinationLat Latitud del destino
 * @param destinationLng Longitud del destino
 * @returns Objeto con progreso % y estado
 */
export function calculateTripProgress(
  currentLat: number,
  currentLng: number,
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): {
  progressPercent: number
  status: 'not_started' | 'in_progress' | 'arrived'
  distanceToDestination: number
  distanceFromOrigin: number
} {
  const distanceFromOrigin = calculateDistance(
    currentLat,
    currentLng,
    originLat,
    originLng
  )

  const distanceToDestination = calculateDistance(
    currentLat,
    currentLng,
    destinationLat,
    destinationLng
  )

  const totalDistance = calculateDistance(
    originLat,
    originLng,
    destinationLat,
    destinationLng
  )

  // Calcular progreso como porcentaje
  let progressPercent = 0
  
  if (totalDistance > 0) {
    progressPercent = Math.min(100, Math.max(0, (distanceFromOrigin / totalDistance) * 100))
  }

  // Determinar estado
  let status: 'not_started' | 'in_progress' | 'arrived' = 'not_started'
  
  if (distanceToDestination < 1) {
    // Menos de 1 km al destino = llegó
    status = 'arrived'
    progressPercent = 100
  } else if (distanceFromOrigin > 0.2) {
    // Más de 200m del origen = en viaje
    status = 'in_progress'
  }

  return {
    progressPercent,
    status,
    distanceToDestination,
    distanceFromOrigin,
  }
}

/**
 * Obtiene mensaje amigable basado en ubicación y progreso
 */
export function getTripStatusMessage(
  currentLat: number,
  currentLng: number,
  originName: string,
  destinationName: string,
  tripProgress: ReturnType<typeof calculateTripProgress>
): string {
  const nearestLocation = getNearestLocation(currentLat, currentLng)

  if (tripProgress.status === 'arrived') {
    return `¡Llegamos a ${destinationName}! 🎉`
  }

  if (tripProgress.status === 'in_progress') {
    if (nearestLocation) {
      return `Estamos en ${nearestLocation} (${tripProgress.progressPercent.toFixed(0)}%)`
    }
    return `En camino a ${destinationName}... ${tripProgress.progressPercent.toFixed(0)}%`
  }

  return `Partiendo de ${originName}...`
}

/**
 * Funcion para obtener coordenadas aproximadas de un nombre de ciudad
 * (útil si los datos del route solo tienen nombre_text de origen/destino)
 */
export function getCoordinatesFromLocationName(locationName: string): LocationPoint | null {
  const normalized = locationName.toLowerCase().trim()

  for (const location of KNOWN_LOCATIONS) {
    if (location.name.toLowerCase().includes(normalized) || normalized.includes(location.name.toLowerCase())) {
      return location
    }
  }

  return null
}
