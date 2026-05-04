import { useCallback, useState } from 'react'
import { supabase } from '../services/supabase'

export const useContactRequests = (userId?: string) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Enviar solicitud de contacto
  const sendContactRequest = useCallback(
    async (receiverId: string, routeId: string) => {
      if (!userId) throw new Error('User not authenticated')

      try {
        setError(null)
        setLoading(true)

        // Verificar que ambos están en el mismo viaje
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('passenger_id')
          .eq('route_id', routeId)
          .eq('booking_status', 'confirmed')
          .in('passenger_id', [userId, receiverId])

        if (bookingError) throw bookingError

        if (!bookings || bookings.length !== 2) {
          throw new Error('Ambos usuarios deben estar en el mismo viaje')
        }

        // Crear solicitud
        const { data, error: insertError } = await supabase
          .from('contact_requests')
          .insert([
            {
              sender_id: userId,
              receiver_id: receiverId,
              route_id: routeId,
              status: 'pending',
            },
          ])
          .select()

        if (insertError) {
          // Si es un error de unicidad, significa que ya existe
          if (insertError.code === '23505') {
            throw new Error('Ya existe una solicitud con este usuario')
          }
          throw insertError
        }

        return data?.[0]
      } catch (err: any) {
        const message = err.message || 'Error al enviar solicitud'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  // Obtener solicitudes pendientes recibidas
  const getPendingRequests = useCallback(async () => {
    if (!userId) throw new Error('User not authenticated')

    try {
      setError(null)
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('contact_requests')
        .select(`
          id,
          sender_id,
          route_id,
          created_at,
          profiles:sender_id(id, name),
          routes:route_id(id, origin, destination, departure_time)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Aceptar solicitud
  const acceptRequest = useCallback(
    async (requestId: string) => {
      try {
        setError(null)
        setLoading(true)

        const { data, error: updateError } = await supabase
          .from('contact_requests')
          .update({ status: 'accepted', updated_at: new Date() })
          .eq('id', requestId)
          .eq('receiver_id', userId)
          .select()

        if (updateError) throw updateError

        return data?.[0]
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  // Rechazar solicitud
  const rejectRequest = useCallback(
    async (requestId: string) => {
      try {
        setError(null)
        setLoading(true)

        const { data, error: updateError } = await supabase
          .from('contact_requests')
          .update({ status: 'rejected', updated_at: new Date() })
          .eq('id', requestId)
          .eq('receiver_id', userId)
          .select()

        if (updateError) throw updateError

        return data?.[0]
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  // Verificar si hay contacto aceptado entre dos usuarios
  const isContactAccepted = useCallback(
    async (otherUserId: string) => {
      try {
        const { data, error: fetchError } = await supabase
          .from('contact_requests')
          .select('id')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
          )
          .eq('status', 'accepted')
          .limit(1)

        if (fetchError) throw fetchError

        return data && data.length > 0
      } catch (err) {
        console.error('Error checking contact:', err)
        return false
      }
    },
    [userId]
  )

  return {
    loading,
    error,
    sendContactRequest,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    isContactAccepted,
  }
}
