import { useState } from 'react'
import { View, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { showSuccess, showError } from '../utils/showError'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { createReview } from '../services/reviews'
import { supabase } from '../services/supabase'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'

interface RouteParams {
  /** Reserva de ruta normal (bookings) — usa rate_booking. */
  bookingId?: string
  /** Ruta personalizada (airport_requests) — usa rate_trip, sin "recomendarías". */
  tripId?: string
  otherUserName: string
  /** false cuando quien se califica es el pasajero (conductor calificando). */
  ratedIsDriver?: boolean
  /** Si viene de una notificación, se borra al calificar con éxito. */
  notifId?: string
}

// Convertido de modal a pantalla normal: un <Modal> nativo de RN no se lleva
// bien con el teclado en Android (mismo problema ya resuelto así en Datos
// personales, Agregar método digital y el chat de negociación).
export default function RatingScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { bookingId, tripId, otherUserName, ratedIsDriver = true, notifId } = (route.params ?? {}) as RouteParams
  const { rateTrip } = useAirportNegotiation()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [recommend, setRecommend] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      showError('Por favor selecciona una calificación')
      return
    }
    try {
      setLoading(true)
      if (bookingId) {
        const saved = await createReview(bookingId, rating, comment || undefined, recommend)
        if (!saved) throw new Error('No se pudo guardar la calificación')
      } else if (tripId) {
        await rateTrip(tripId, rating, comment || undefined)
      } else {
        throw new Error('Falta identificar el viaje a calificar')
      }
      if (notifId) {
        await supabase.from('notifications').delete().eq('id', notifId)
      }
      showSuccess('Calificación enviada')
      navigation.goBack()
    } catch (error: any) {
      showError(error.message || 'Error al enviar calificación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[s.safeContainer, { paddingTop: insets.top }]}>
      <KeyboardAvoidingScreen measureKeyboard style={s.flex}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="ChevronLeft" size={26} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={s.title}>Calificar {ratedIsDriver ? 'conductor' : 'pasajero'}</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={s.userSection}>
            <View style={s.userInitial}>
              <Text style={s.userInitialText}>{(otherUserName || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.userName}>{otherUserName}</Text>
          </View>

          <View style={s.ratingContainer}>
            <Text style={s.ratingLabel}>¿Cómo fue tu experiencia?</Text>
            <View style={s.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={loading} activeOpacity={0.8}>
                  <Icon name="Star" size={44} color={star <= rating ? COLORS.accent : '#ddd'} style={s.star} />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={s.ratingText}>
                {rating === 1 && 'Muy mala'}
                {rating === 2 && 'Mala'}
                {rating === 3 && 'Normal'}
                {rating === 4 && 'Buena'}
                {rating === 5 && '¡Excelente!'}
              </Text>
            )}
          </View>

          <View style={s.commentSection}>
            <Text style={s.commentLabel}>Agregar comentario (opcional)</Text>
            <TextInput
              style={s.commentInput}
              placeholder="Comparte tu experiencia..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {!!bookingId && (
            <View style={s.recommendSection}>
              <Text style={s.recommendLabel}>¿Lo recomendarías?</Text>
              <View style={s.toggleContainer}>
                <TouchableOpacity
                  style={[s.toggleButton, !recommend && s.toggleButtonActiveNo]}
                  onPress={() => setRecommend(false)}
                  disabled={loading}
                >
                  <Icon name="CircleX" size={20} color={!recommend ? 'white' : '#999'} />
                  <Text style={[s.toggleButtonText, !recommend && s.toggleButtonTextActive]}>No</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.toggleButton, recommend && s.toggleButtonActiveYes]}
                  onPress={() => setRecommend(true)}
                  disabled={loading}
                >
                  <Icon name="CircleCheck" size={20} color={recommend ? 'white' : '#999'} />
                  <Text style={[s.toggleButtonText, recommend && s.toggleButtonTextActive]}>Sí</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.buttonContainer}>
            <TouchableOpacity style={[s.button, s.cancelButton]} onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={s.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.button, s.submitButton, rating === 0 && s.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || rating === 0}
            >
              {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={s.submitButtonText}>Enviar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingScreen>
    </View>
  )
}

const s = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  container: { padding: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  userSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  userInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userInitialText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  star: {
    marginHorizontal: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  commentSection: {
    marginBottom: SPACING.lg,
  },
  commentLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 80,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  recommendSection: {
    marginBottom: SPACING.lg,
  },
  recommendLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: COLORS.background,
  },
  toggleButtonActiveNo: {
    backgroundColor: COLORS.error,
    borderWidth: 0,
  },
  toggleButtonActiveYes: {
    backgroundColor: COLORS.success,
    borderWidth: 0,
  },
  toggleButtonText: {
    ...TYPOGRAPHY.body,
    color: '#999',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceHover,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
})
