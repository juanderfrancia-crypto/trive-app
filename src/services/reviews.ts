import { supabase } from './supabase'
import { insertNotificationForUser } from './notificationInsert'

export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  recommend?: boolean
  created_at: string
}

// Calificar un viaje completado. El servidor valida participantes y estado,
// y calcula el promedio del evaluado.
export const createReview = async (
  bookingId: string,
  rating: number,
  comment?: string,
  recommend?: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('rate_booking', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment ?? undefined,
      p_recommend: recommend ?? false,
    })
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error creating review:', error)
    return false
  }
}

// Obtener el rating promedio de un usuario
export const getUserAverageRating = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId)

    if (error) throw error

    if (!data || data.length === 0) return 0

    const sum = data.reduce((acc, review) => acc + review.rating, 0)
    return Math.round((sum / data.length) * 10) / 10 // Redondear a 1 decimal
  } catch (error) {
    console.error('Error getting average rating:', error)
    return 0
  }
}

// Obtener todos los reviews de un usuario
export const getUserReviews = async (userId: string): Promise<Review[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data as Review[]) || []
  } catch (error) {
    console.error('Error getting reviews:', error)
    return []
  }
}

// Verificar si un usuario ya calificó a otro en una reserva
export const hasUserRated = async (
  bookingId: string,
  reviewerId: string,
  revieweeId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', reviewerId)
      .eq('reviewee_id', revieweeId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No row found
      return false
    }

    if (error) throw error

    return !!data
  } catch (error) {
    console.error('Error checking if user rated:', error)
    return false
  }
}

// Actualizar el promedio de rating en el perfil del usuario

// Obtener detalles de un booking con información del viaje
export const getBookingDetails = async (bookingId: string) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        passenger_id,
        seat_number,
        price,
        booking_status,
        created_at,
        routes!inner(
          id,
          driver_id,
          origin,
          destination,
          departure_time,
          arrival_time
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error getting booking details:', error)
    return null
  }
}
