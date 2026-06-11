import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { useAppStore } from '../store/useAppStore'
import Button from '../components/Button'
import { showSuccess, showError } from '../utils/showError'

export default function CompletedTripsScreen() {
  const navigation = useNavigation<any>()
  const { requests, loading, rateTrip } = useAirportNegotiation()
  const user = useAppStore((s) => s.user)
  const [ratingModal, setRatingModal] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratedTrips, setRatedTrips] = useState<string[]>([])

  // Filtrar viajes completados
  const completedTrips = requests.filter(
    r => (r.passenger_id === user?.id || r.driver_id === user?.id) && r.status === 'completed'
  )

  const handleRateTrip = async () => {
    if (!ratingModal) return

    try {
      setSubmittingRating(true)
      await rateTrip(ratingModal, rating, comment || undefined)
      showSuccess('¡Gracias por tu calificación!')
      setRatedTrips(prev => [...prev, ratingModal])
      setRating(5)
      setComment('')
      setRatingModal(null)
    } catch (err: any) {
      showError(err.message)
    } finally {
      setSubmittingRating(false)
    }
  }

  const renderStars = (value: number) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={36}
            color={star <= value ? '#FBBF24' : '#D1D5DB'}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderTripCard = (trip: any) => {
    const otherParty = trip.passenger_id === user?.id ? trip.driver_name : 'Pasajero'
    const isRated = ratedTrips.includes(trip.id)
    const canRate = !isRated && (trip.passenger_id === user?.id || trip.driver_id === user?.id)

    return (
      <View key={trip.id} style={styles.tripCard}>
        <View style={styles.cardHeader}>
          <View style={styles.routeInfo}>
            <View>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.origin}>{trip.origin}</Text>
              <Text style={styles.destination}>{trip.destination}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.statusText}>Completado</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              {new Date(trip.departure_time).toLocaleString('es-CO')}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.detailText, { color: COLORS.primary, fontWeight: '600' }]}>
              ${trip.offered_price.toLocaleString('es-CO')}
            </Text>
          </View>

          {trip.driver_id === user?.id ? (
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{trip.passengers} pasajeros</Text>
            </View>
          ) : null}

          {trip.driver_name && (
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{otherParty}</Text>
            </View>
          )}
        </View>

        {canRate && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.cardActions}>
              <Button
                title="⭐ Calificar viaje"
                onPress={() => setRatingModal(trip.id)}
                style={styles.rateBtn}
                textStyle={styles.rateBtnText}
              />
            </View>
          </>
        )}

        {isRated && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.ratedBadge}>
              <Ionicons name="checkmark" size={14} color="#10B981" />
              <Text style={styles.ratedText}>Ya calificado</Text>
            </View>
          </>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#0E2699', '#1230B8', '#1A3FCC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Viajes completados</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : completedTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay viajes completados aún</Text>
          </View>
        ) : (
          completedTrips.map(trip => renderTripCard(trip))
        )}
      </ScrollView>

      {/* Modal de calificación */}
      <Modal
        visible={ratingModal !== null}
        transparent
        animationType="slide"
      >
        <View style={styles.modal}>
          <View style={styles.modalOverlay} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setRatingModal(null)
                  setRating(5)
                  setComment('')
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Calificar viaje</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>¿Cómo fue tu experiencia?</Text>

              {renderStars(rating)}

              <Text style={styles.ratingLabel}>
                {rating === 1 && '😞 Muy malo'}
                {rating === 2 && '😕 Malo'}
                {rating === 3 && '😐 Regular'}
                {rating === 4 && '🙂 Bueno'}
                {rating === 5 && '😃 Excelente'}
              </Text>

              <TextInput
                placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                style={styles.commentInput}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => {
                    setRatingModal(null)
                    setRating(5)
                    setComment('')
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.submitBtn]}
                  onPress={handleRateTrip}
                  disabled={submittingRating}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitBtnText}>
                    {submittingRating ? 'Enviando...' : 'Enviar calificación'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: SPACING.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: '#999',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  origin: {
    fontSize: 13,
    color: '#666',
    marginBottom: SPACING.xs,
  },
  destination: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    marginLeft: SPACING.xs,
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: SPACING.md,
  },
  cardDetails: {
    paddingHorizontal: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailText: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: '#666',
  },
  cardActions: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rateBtn: {
    backgroundColor: '#FBBF24',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  ratedBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  ratedText: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#F9FAFB',
    fontSize: 13,
    color: '#000',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
})
