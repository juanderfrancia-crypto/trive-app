import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { notifyTripCancellation } from '../services/pushNotifications'
import { showSuccess, showError } from '../utils/showError'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { getTripUnreadCount, subscribeTripMessages } from '../services/trip_messages'

export default function TripStatusScreen() {
  const navigation = useNavigation<any>()
  const selectedRoute  = useAppStore((s) => s.selectedRoute)
  const bookingData    = useAppStore((s) => s.bookingData)
  const user           = useAppStore((s) => s.user)
  const setBookingData = useAppStore((s) => s.setBookingData)
  const { getRouteBookings, loading, cancelBooking } = useBookings()
  const [bookings, setBookings] = useState<any[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [userBooking, setUserBooking] = useState<any>(null)
  const [selectedTripForChat, setSelectedTripForChat] = useState<any>(null)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const chatChannelRef = useRef<(() => void) | null>(null)

  const loadBookings = useCallback(async () => {
    if (!selectedRoute) return
    try {
      const routeBookings = await getRouteBookings(selectedRoute.id)
      setBookings(routeBookings)
    } catch (error) {
      if (__DEV__) console.error('Error loading bookings:', error)
    }
  }, [getRouteBookings, selectedRoute])

  useFocusEffect(
    useCallback(() => {
      if (!selectedRoute) {
        navigation.goBack()
        return
      }

      setBookingData(null)
      loadBookings()

      // Cargar unread count y suscribir mensajes del viaje
      if (user?.id && selectedRoute.id) {
        getTripUnreadCount(selectedRoute.id, user.id).then(setChatUnreadCount)
        chatChannelRef.current = subscribeTripMessages(selectedRoute.id, user.id, null, () => {
          setChatUnreadCount((prev) => prev + 1)
        })
      }

      return () => {
        if (chatChannelRef.current) {
          chatChannelRef.current()
          chatChannelRef.current = null
        }
      }
    }, [selectedRoute, setBookingData, loadBookings, navigation, user?.id])
  )

  if (!selectedRoute) return null

  const occupiedSeats = bookings.length
  const totalSeats = selectedRoute.total_seats || 5
  const availableSeats = totalSeats - occupiedSeats

  const departureTime = new Date(selectedRoute.departure_time).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const departureDate = new Date(selectedRoute.departure_time).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const driverInitial = selectedRoute.driver_name?.charAt(0).toUpperCase() || 'C'

  const handleCancelBooking = () => {
    if (!user) {
      showError('Debes iniciar sesión primero')
      return
    }

    // Find user's booking
    const booking = bookings.find(b => b.passenger_id === user.id)
    if (!booking) {
      showError('No se encontró tu reserva')
      return
    }

    setUserBooking(booking)
    setShowConfirmModal(true)
  }

  const confirmCancel = async () => {
    if (!userBooking) return

    try {
      setCancelLoading(true)
      setShowConfirmModal(false)
      await cancelBooking(userBooking.id)

      // Enviar notificación al conductor (sin esperar respuesta)
      if (user?.id) {
        notifyTripCancellation(userBooking.id, user.id, 'Cancelado por pasajero').catch(err => {
          console.warn('Error sending cancellation notification:', err)
        })
      }

      showSuccess('Reserva cancelada exitosamente')
      setTimeout(() => {
        navigation.navigate('Main' as never, { screen: 'Home' } as never)
      }, 2000)
    } catch (error) {
      showError('Error al cancelar. Intenta más tarde.')
      if (__DEV__) console.error('Cancel error:', error)
    } finally {
      setCancelLoading(false)
    }
  }

  // Generate all seat statuses
  const userSeatNumbers = new Set<number>([
    ...(bookingData?.seat_numbers || []),
    ...bookings.filter((b: any) => b.passenger_id === user?.id).map((b: any) => Number(b.seat_number)),
  ])

  const occupiedSeatNumbers = new Set(bookings.map((b: any) => b.seat_number))
  const allSeats = Array.from({ length: totalSeats }, (_, i) => ({
    id: i + 1,
    status: userSeatNumbers.has(i + 1)
      ? 'selected'
      : occupiedSeatNumbers.has(i + 1)
      ? 'occupied'
      : 'available',
  }))

  const occupiedPercentage = (occupiedSeats / totalSeats) * 100

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Estado del Viaje</Text>
            <Text style={styles.subtitle}>Viaje programado</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Main' as never, { screen: 'Home' } as never)}
          >
            <Ionicons name="home" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Status Card */}
            <LinearGradient
              colors={['#0E2699', '#1230B8', '#1A3FCC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusCardGradient}
            >
              <View style={styles.statusHeader}>
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="time" size={14} color="#fff" />
                  <Text style={[styles.statusBadgeText, { color: '#fff' }]}>En espera</Text>
                </View>
                <Text style={[styles.tripTime, { color: 'rgba(255,255,255,0.8)' }]}>Salida en 15 min</Text>
              </View>

              <View style={styles.routeDisplay}>
                      <View style={[styles.routePoint, styles.routePointColumn]}>
                  <View style={[styles.routeDotLarge, { backgroundColor: '#fff' }]} />
                  <Text style={[styles.routeCity, styles.routeCityWhite]} numberOfLines={2}>{selectedRoute.origin}</Text>
                </View>
                <View style={styles.routeArrow}>
                  <View style={[styles.routeLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                  <Ionicons name="car" size={16} color="#fff" />
                  <View style={[styles.routeLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                </View>
                <View style={[styles.routePoint, styles.routePointColumn]}>
                  <View style={[styles.routeDotLarge, styles.routeDotEnd, { backgroundColor: '#fff' }]} />
                  <Text style={[styles.routeCity, styles.routeCityWhite]} numberOfLines={2}>{selectedRoute.destination}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Seats Card */}
            <LinearGradient
              colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.seatsCardGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cupos del vehículo</Text>
                <Text style={styles.seatsSubtitle}>
                  {availableSeats} de {totalSeats} disponibles
                </Text>
              </View>

              <View style={styles.seatsGrid}>
                {allSeats.map((seat) => (
                  <View key={seat.id} style={styles.seatItem}>
                    <View
                      style={[
                        styles.seatCircle,
                        seat.status === 'occupied' && styles.seatOccupied,
                        seat.status === 'available' && styles.seatAvailable,
                        seat.status === 'selected' && styles.seatSelected,
                      ]}
                    >
                      {seat.status === 'occupied' ? (
                        <Ionicons name="person" size={14} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.seatNumber,
                            seat.status === 'selected' && styles.seatNumberSelected,
                          ]}
                        >
                          {seat.id}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.seatLabel}>
                      {seat.status === 'occupied'
                        ? 'Ocupado'
                        : seat.status === 'selected'
                        ? 'Tu asiento'
                        : 'Libre'}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${occupiedPercentage}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>{occupiedSeats} ocupados</Text>
                  <Text style={styles.progressText}>{availableSeats} disponibles</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Vehicle Card */}
            <LinearGradient
              colors={['#D6E0FF', '#BDCEFF', '#A8BBFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vehicleCardGradient}
            >
              <View style={[styles.vehicleHeader, { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>{selectedRoute.vehicle_model || 'Vehículo'}</Text>
                  <Text style={styles.vehicleDetails}>
                    {selectedRoute.license_plate} · {selectedRoute.vehicle_color}
                  </Text>
                </View>

                <View style={styles.vehicleRightSection}>
                  <View style={styles.vehicleBadge}>
                    <Ionicons name="car" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.actionButtonsColumn}>
                    <TouchableOpacity
                      style={styles.messageBtn}
                      onPress={() => {
                        if (!selectedRoute?.driver_id) {
                          showError('No está disponible el chat con el conductor')
                          return
                        }
                        setSelectedTripForChat({
                          id: selectedRoute.id,
                          driverId: selectedRoute.driver_id,
                          driverName: selectedRoute.driver_name,
                        })
                      }}
                    >
                      <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverInitial}>{driverInitial}</Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{selectedRoute.driver_name || 'Conductor'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color={COLORS.accent} />
                    <Text style={styles.ratingText}>{selectedRoute.driver_rating || '0'}</Text>
                    <Text style={styles.ratingLabel}> · conductor verificado</Text>
                  </View>
                </View>
              </View>

              <LinearGradient
                colors={['#0E2699', '#1230B8', '#1A3FCC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickChatBtn}
              >
                <TouchableOpacity
                  style={styles.quickChatBtnInner}
                  onPress={() => {
                    setChatUnreadCount(0)
                    setSelectedTripForChat({
                      id: selectedRoute.id,
                      driverId: selectedRoute.driver_id,
                      driverName: selectedRoute.driver_name,
                    })
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                  <Text style={styles.quickChatBtnText}>Contactar conductor</Text>
                  {chatUnreadCount > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </LinearGradient>

            {/* Trip Info Card */}
            <LinearGradient
              colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tripInfoCardGradient}
            >
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Hora</Text>
                  <Text style={styles.infoValue}>{departureTime}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Tarifa</Text>
                  <Text style={styles.infoValue}>${selectedRoute.price_per_seat?.toLocaleString('es-CO')}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Fecha</Text>
                  <Text style={styles.infoValue}>{departureDate}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Action Buttons */}
            <LinearGradient
              colors={['#0E2699', '#1230B8', '#1A3FCC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newTripBtnGradient}
            >
              <TouchableOpacity
                style={styles.newTripBtnInner}
                onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.newTripBtnText}>Buscar nuevas rutas</Text>
              </TouchableOpacity>
            </LinearGradient>

            <TouchableOpacity 
              style={[styles.cancelBtn, cancelLoading && { opacity: 0.6 }]}
              onPress={handleCancelBooking}
              disabled={cancelLoading}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.cancelBtnText}>
                {cancelLoading ? 'Cancelando...' : 'Cancelar Reserva'}
              </Text>
            </TouchableOpacity>

            {/* Confirmation Modal */}
            <Modal
              visible={showConfirmModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowConfirmModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Ionicons name="warning" size={32} color={COLORS.error} />
                  </View>
                  <Text style={styles.modalTitle}>Cancelar Reserva</Text>
                  <Text style={styles.modalMessage}>
                    ¿Estás seguro? Se procesará un reembolso completo a tu cuenta.
                  </Text>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnCancel]}
                      onPress={() => setShowConfirmModal(false)}
                      disabled={cancelLoading}
                    >
                      <Text style={styles.modalBtnTextCancel}>Mantener</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnConfirm, cancelLoading && { opacity: 0.6 }]}
                      onPress={confirmCancel}
                      disabled={cancelLoading}
                    >
                      <Text style={styles.modalBtnTextConfirm}>
                        {cancelLoading ? 'Procesando...' : 'Cancelar Reserva'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>


            {/* Trip Messages Modal */}
            {selectedTripForChat && user && (
              <TripMessagesModal
                visible={!!selectedTripForChat}
                tripId={selectedTripForChat.id}
                userId={user.id}
                otherUserId={selectedTripForChat.driverId}
                otherUserName={selectedTripForChat.driverName}
                onClose={() => setSelectedTripForChat(null)}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  homeBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },

  // Status Card
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
  },
  statusCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tripTime: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  routeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  routePoint: {
    alignItems: 'center',
  },
  routePointColumn: {
    maxWidth: 100,
  },
  routeDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  routeDotEnd: {
    backgroundColor: COLORS.accent,
  },
  routeArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  routeLine: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.borderLight,
  },
  routeCity: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 100,
  },
  routeCityWhite: {
    color: '#fff',
  },

  // Seats Card
  seatsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  seatsCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  seatsSubtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  seatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  seatItem: {
    alignItems: 'center',
    width: 60,
  },
  seatCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  seatOccupied: {
    backgroundColor: COLORS.textSecondary,
  },
  seatAvailable: {
    backgroundColor: '#1230B8',
  },
  seatSelected: {
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  seatNumber: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  seatNumberSelected: {
    color: '#fff',
  },
  seatLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1230B8',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  progressText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  vehicleCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  vehicleRightSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehicleDetails: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  vehicleBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(18,48,184,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(18,48,184,0.15)',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1230B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitial: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    flexWrap: 'wrap',
  },
  ratingText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  actionButtonsColumn: {
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(18,48,184,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Trip Info Card
  tripInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  tripInfoCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 90,
  },
  infoDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  infoLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Action Buttons
  newTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    height: 52,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  newTripBtnGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  newTripBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  newTripBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  quickChatBtn: {
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  quickChatBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  quickChatBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  chatBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: SPACING.xs,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.error,
  },
  modalBtnTextCancel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalBtnTextConfirm: {
    ...TYPOGRAPHY.labelMedium,
    color: '#fff',
    fontWeight: '600',
  },

  // Passengers Card Styles
  passengersCardGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    paddingVertical: SPACING.md,
  },
  passengersList: {
    paddingHorizontal: SPACING.md,
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  passengerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  passengerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  passengerSeat: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
  },
  passengerChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
})

