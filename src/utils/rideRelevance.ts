import type { AvailableRide } from '../hooks/useAvailableRides'

// Ranking por relevancia: la hora de salida manda siempre (es lo que de verdad
// urge), y la calificación del conductor solo desempata entre rutas que salen
// en una ventana de tiempo parecida — nunca puede hacer que una ruta que sale
// mucho antes quede detrás de una que sale después, solo mejor por estrellas.
// Los conductores sin reseñas (nuevos) se tratan como calificación neutral, no
// como los peores, para no perjudicar a la oferta nueva de la plataforma.
const RELEVANCE_WINDOW_MIN = 15
const NEUTRAL_RATING = 4.5

const effectiveRating = (r: AvailableRide) =>
  r.driver_review_count && r.driver_review_count > 0 ? (r.driver_rating ?? 0) : NEUTRAL_RATING

export const sortByRelevance = (list: AvailableRide[]): AvailableRide[] => {
  return [...list].sort((a, b) => {
    const timeA = new Date(a.departure_time).getTime()
    const timeB = new Date(b.departure_time).getTime()
    const windowMs = RELEVANCE_WINDOW_MIN * 60000
    const bucketA = Math.floor(timeA / windowMs)
    const bucketB = Math.floor(timeB / windowMs)
    if (bucketA !== bucketB) return bucketA - bucketB

    const ratingDiff = effectiveRating(b) - effectiveRating(a)
    if (Math.abs(ratingDiff) > 0.01) return ratingDiff

    return timeA - timeB
  })
}
