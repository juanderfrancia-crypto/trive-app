import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { notifyTripCancellation } from '../services/pushNotifications'
import Toast from '../components/Toast'
import { TripMessagesModal } from '../components/TripMessagesModal'

export default function ScheduledTripsScreen() {
  const navigation = useNavigation<any>()
  const user             = useAppStore((s) => s.user)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const { getPassengerBookings, cancelBooking, loading: bookingsLoading } = useBookings()
  const [trips, setTrips] = useState<any[]>([])
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [cancellationLoading, setCancellationLoading] = useState(false)
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ visible: false, message: '', type: 'info' })

  const [selectedTripForChat, setSelectedTripForChat] = useState<any>(null)

  const loadPassengerBookings = useCallback(async () => {
    if (!user) return
    try {
      const bookings = await getPassengerBookings(user.id)
      // Mapear datos de bookings + routes a formato esperado por UI
      const formattedTrips = bookings
        .filter((b: any) => b.booking_status === 'confirmed' && b.routes)
        .map((booking: any) => {
          const route = booking.routes;
          return {
            id: booking.id,
            bookingId: booking.id,
            routeId: route.id,
            origin: route.origin || 'Origen desconocido',
            destination: route.destination || 'Destino desconocido',
            dropoffPoint: booking.dropoff_point || route.destination || 'Destino desconocido',
            dropoffPointCustom: booking.dropoff_point_custom || false,
            date: route.departure_time ? new Date(route.departure_time).toISOString().split('T')[0] : '',
            time: route.departure_time 
              ? new Date(route.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
              : '00:00',
            seats: booking.seat_number ? 1 : 0,
            price: booking.price || route.price_per_seat || 0,
            status: booking.booking_status,
            driverName: route.driver_name || 'Conductor desconocido',
            driverRating: route.driver_rating || 0,
            vehicleModel: route.vehicle_model || 'Vehículo',
            vehiclePlate: route.vehicle_plate || 'N/A',
            vehicleColor: route.vehicle_color || 'Sin color',
            totalSeats: route.total_seats || 0,
            occupiedSeats: route.occupied_seats || 0,
            availableSeats: route.available_seats || 0,
          }
        })
      setTrips(formattedTrips)
    } catch (error) {
      console.error('Error loading bookings:', error)
      setToastConfig({ visible: true, message: 'Error al cargar tus viajes', type: 'error' })
    }
  }, [getPassengerBookings, setToastConfig, user])

  useFocusEffect(
    useCallback(() => {
      loadPassengerBookings()
    }, [loadPassengerBookings])
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const calculateDaysUntil = (dateStr: string) => {
    const today = new Date()
    const tripDate = new Date(dateStr)
    const diffTime = tripDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleCancel = (tripId: string, tripData: any) => {
    Alert.alert(
      'Cancelar reserva',
      `¿Cancelarás tu reserva de ${tripData.origin} a ${tripData.destination}? Se procesará el reembolso.`,
      [
        { text: 'Mantener reserva', style: 'cancel' },
        {
          text: 'Cancelar reserva',
          style: 'destructive',
          onPress: () => {
            performCancellation(tripId)
          },
        },
      ]
    )
  }

  const performCancellation = async (bookingId: string) => {
    setCancellationLoading(true)
    
    try {
      // Cancelar en Supabase
      await cancelBooking(bookingId)

      // Enviar notificación al conductor (sin esperar respuesta)
      if (user?.id) {
        notifyTripCancellation(bookingId, user.id, 'Cancelado por pasajero').catch(err => {
          console.warn('Error sending cancellation notification:', err)
        })
      }
      
      // Crear nueva lista sin el viaje cancelado
      const updatedTrips = trips.filter((trip) => trip.id !== bookingId)
      setTrips(updatedTrips)
      
      // Cerrar interfaces
      setCancellationLoading(false)
      setModalVisible(false)
      setSelectedTrip(null)
      
      // Mostrar confirmación
      setToastConfig({ visible: true, message: '✓ Reserva cancelada exitosamente', type: 'success' })
    } catch (error) {
      setCancellationLoading(false)
      setToastConfig({ visible: true, message: 'Error al cancelar la reserva', type: 'error' })
      console.error('Error:', error)
    }
  }

  const handleViewStatus = (tripData: any) => {
    setSelectedRoute({
      id: tripData.routeId || tripData.bookingId,
      origin: tripData.origin,
      destination: tripData.destination,
      departure_time: `${tripData.date}T${tripData.time}:00`,
      driver_name: tripData.driverName,
      driver_rating: tripData.driverRating,
      vehicle_model: tripData.vehicleModel,
      vehicle_plate: tripData.vehiclePlate,
      vehicle_color: tripData.vehicleColor,
      total_seats: tripData.totalSeats,
      price_per_seat: tripData.price,
      status: 'scheduled',
    })
    navigation.navigate('TripStatus' as never)
    setModalVisible(false)
  }

  const handleChat = (tripData: any) => {
    if (!tripData?.driverId) {
      setToastConfig({ visible: true, message: 'No hay conductor asignado para chatear aún', type: 'warning' })
      return
    }
    setSelectedTripForChat({
      id: tripData.routeId,
      driverId: tripData.driverId,
      driverName: tripData.driverName,
    })
    setModalVisible(false)
  }

  const handleViewDetails = (trip: any) => {
    setSelectedTrip(trip)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedTrip(null)
    setCancellationLoading(false)
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Viajes Programados</Text>
            <Text style={styles.subtitle}>Tus viajes para más adelante</Text>
          </View>
        </View>

        {/* Modal de detalles - Mejorado UI/UX */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeModal}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedTrip && (
                <>
                  {/* Modal Header con Gradient */}
                  <View style={styles.modalTopBar}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                      <Ionicons name="close" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                  </View>

                  {/* Route Header Card - Gradient */}
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primary + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.routeHeaderGradient}
                  >
                    <View style={styles.routeHeaderTop}>
                      <View style={styles.statusBadgeModal}>
                        <Ionicons name="calendar-clear" size={12} color="#fff" />
                        <Text style={styles.statusBadgeTextModal}>
                          En {calculateDaysUntil(selectedTrip.date)} días
                        </Text>
                      </View>
                    </View>

                    <View style={styles.routeHeaderContent}>
                      <View style={styles.routeDestination}>
                        <View style={styles.routePointLarge}>
                          <Ionicons name="location" size={28} color="#fff" />
                        </View>
                        <View style={styles.routeTextContainer}>
                          <Text style={styles.routeLabelBold}>SALIDA</Text>
                          <Text style={styles.routeLocationBold}>{selectedTrip.origin}</Text>
                        </View>
                      </View>

                      <View style={styles.routeArrowLarge}>
                        <Ionicons name="arrow-forward" size={24} color="#fff" />
                      </View>

                      <View style={styles.routeDestination}>
                        <View style={styles.routePointLarge}>
                          <Ionicons name="location" size={28} color="#fff" />
                        </View>
                        <View style={styles.routeTextContainer}>
                          <Text style={styles.routeLabelBold}>DESTINO</Text>
                          <Text style={styles.routeLocationBold}>{selectedTrip.destination}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.routeFooter}>
                      <Text style={styles.routeDateBold}>
                        {formatFullDate(selectedTrip.date)} • {selectedTrip.time}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Info Cards Grid */}
                  <View style={styles.infoGridSection}>
                    <View style={styles.infoGridRow}>
                      <View style={styles.infoGridCard}>
                        <View style={styles.gridIconBox}>
                          <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.gridLabel}>Hora</Text>
                        <Text style={styles.gridValue}>{selectedTrip.time}</Text>
                      </View>

                      <View style={styles.infoGridCard}>
                        <View style={styles.gridIconBox}>
                          <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.gridLabel}>Asientos</Text>
                        <Text style={styles.gridValue}>{selectedTrip.seats}</Text>
                      </View>
                    </View>

                    <View style={styles.infoGridRow}>
                      <View style={styles.infoGridCard}>
                        <View style={styles.gridIconBox}>
                          <Ionicons name="cash-outline" size={22} color={COLORS.success} />
                        </View>
                        <Text style={styles.gridLabel}>Total</Text>
                        <Text style={[styles.gridValue, { color: COLORS.success }]}>
                          ${selectedTrip.price.toLocaleString('es-CO')}
                        </Text>
                      </View>

                      <View style={styles.infoGridCard}>
                        <View style={styles.gridIconBox}>
                          <Ionicons name="car-outline" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.gridLabel}>Vehículo</Text>
                        <Text style={styles.gridValue}>{selectedTrip.totalSeats} cupos</Text>
                      </View>
                    </View>
                  </View>

                  {/* Dropoff Point Card */}
                  <View style={styles.dropoffCardTrip}>
                    <View style={styles.dropoffHeaderTrip}>
                      <Ionicons name="location-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.dropoffTitleTrip}>Parada de desembarque</Text>
                    </View>
                    <View style={styles.dropoffContentTrip}>
                      <Text style={styles.dropoffLocationTrip}>{selectedTrip.dropoffPoint}</Text>
                      {selectedTrip.dropoffPointCustom && (
                        <View style={styles.customDropoffBadge}>
                          <Ionicons name="flag-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.customDropoffText}>Parada intermedia</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Driver Card - Mejorado */}
                  <View style={styles.driverCardImproved}>
                    <View style={styles.driverHeaderImproved}>
                      <View style={styles.driverAvatarLarge}>
                        <Text style={styles.driverInitialLarge}>
                          {selectedTrip.driverName?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.driverDetailsSection}>
                        <View>
                          <Text style={styles.driverNameLarge}>{selectedTrip.driverName}</Text>
                          <View style={styles.driverRatingRow}>
                            <View style={styles.verifiedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                              <Text style={styles.verifiedText}>Conductor verificado</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.ratingCircle}>
                          <Ionicons name="star" size={16} color={COLORS.accent} />
                          <Text style={styles.ratingNumber}>{selectedTrip.driverRating}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.driverActionsImproved}>
                      <TouchableOpacity style={styles.contactBtnLarge} onPress={() => {
                        setToastConfig({ visible: true, message: 'Función de llamada aún no disponible', type: 'info' })
                      }}>
                        <Ionicons name="call" size={20} color={COLORS.primary} />
                        <Text style={styles.contactBtnText}>Llamar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.contactBtnLarge}
                        onPress={() => handleChat(selectedTrip)}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.contactBtnText}>Mensaje</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Vehicle Card - Mejorado */}
                  <View style={styles.vehicleCardImproved}>
                    <View style={styles.vehicleHeaderImproved}>
                      <View style={styles.vehicleIconBox}>
                        <Ionicons name="car" size={28} color={COLORS.primary} />
                      </View>
                      <View style={styles.vehicleInfoImproved}>
                        <Text style={styles.vehicleModelImproved}>{selectedTrip.vehicleModel}</Text>
                        <Text style={styles.vehicleDetailsImproved}>
                          Placa: {selectedTrip.vehiclePlate} • {selectedTrip.vehicleColor}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.occupancyCardImproved}>
                      <View style={styles.occupancyHeadImproved}>
                        <Text style={styles.occupancyLabelImproved}>Disponibilidad del vehículo</Text>
                        <Text style={styles.occupancyPercentage}>
                          {Math.round((selectedTrip.occupiedSeats / selectedTrip.totalSeats) * 100)}%
                        </Text>
                      </View>
                      <View style={styles.occupancyBarLarge}>
                        <View
                          style={[
                            styles.occupancyFillLarge,
                            {
                              width: `${(selectedTrip.occupiedSeats / selectedTrip.totalSeats) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.seatsCountRow}>
                        <View style={styles.seatsCountItem}>
                          <View style={[styles.seatDot, { backgroundColor: COLORS.primary }]} />
                          <Text style={styles.seatsCountText}>
                            {selectedTrip.occupiedSeats} ocupados
                          </Text>
                        </View>
                        <View style={styles.seatsCountItem}>
                          <View style={[styles.seatDot, { backgroundColor: COLORS.background }]} />
                          <Text style={styles.seatsCountText}>
                            {selectedTrip.totalSeats - selectedTrip.occupiedSeats} disponibles
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons - Mejorados */}
                  <View style={styles.modalActionsImproved}>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleViewStatus(selectedTrip)}
                      disabled={cancellationLoading}
                    >
                      <Ionicons name="eye-outline" size={22} color={COLORS.textInverse} />
                      <Text style={styles.primaryActionText}>Seguimiento en vivo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryActionBtn}
                      onPress={() => handleCancel(selectedTrip.id, selectedTrip)}
                      disabled={cancellationLoading}
                    >
                      {cancellationLoading ? (
                        <ActivityIndicator color={COLORS.error} size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                          <Text style={styles.secondaryActionText}>Cancelar reserva</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {bookingsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tus viajes...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin viajes programados</Text>
            <Text style={styles.emptyText}>
              Programa tus viajes con anticipación y reserva tu asiento
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
            >
              <Ionicons name="search" size={20} color={COLORS.textInverse} />
              <Text style={styles.searchBtnText}>Buscar rutas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {trips.map((trip) => (
              <View key={trip.id} style={styles.tripCardContainer}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tripCardGradient}
                >
                  {/* Status Badge */}
                  <View style={styles.tripCardBadge}>
                    <Ionicons name="calendar-clear" size={12} color="#fff" />
                    <Text style={styles.tripCardBadgeText}>
                      En {calculateDaysUntil(trip.date)} días
                    </Text>
                  </View>

                  {/* Route Section */}
                  <View style={styles.tripCardRouteSection}>
                    <View style={styles.tripCardOrigin}>
                      <View style={styles.tripCardLocationIcon}>
                        <Ionicons name="location" size={20} color="#fff" />
                      </View>
                      <View>
                        <Text style={styles.tripCardLocationLabel}>SALIDA</Text>
                        <Text style={styles.tripCardLocationName}>{trip.origin}</Text>
                      </View>
                    </View>

                    <View style={styles.tripCardArrow}>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>

                    <View style={styles.tripCardDestination}>
                      <View style={styles.tripCardLocationIcon}>
                        <Ionicons name="location" size={20} color="#fff" />
                      </View>
                      <View>
                        <Text style={styles.tripCardLocationLabel}>DESTINO</Text>
                        <Text style={styles.tripCardLocationName}>{trip.destination}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer with Time and Price */}
                  <View style={styles.tripCardFooter}>
                    <View style={styles.tripCardFooterItem}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                      <Text style={styles.tripCardFooterText}>{trip.time}</Text>
                    </View>
                    <View style={styles.tripCardFooterDivider} />
                    <View style={styles.tripCardFooterItem}>
                      <Ionicons name="person-outline" size={16} color="#fff" />
                      <Text style={styles.tripCardFooterText}>{trip.seats} asiento(s)</Text>
                    </View>
                    <View style={styles.tripCardFooterDivider} />
                    <View style={styles.tripCardFooterItem}>
                      <Ionicons name="cash-outline" size={16} color="#fff" />
                      <Text style={styles.tripCardFooterText}>
                        ${trip.price.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* Action Buttons */}
                <View style={styles.tripCardActions}>
                  <TouchableOpacity
                    style={styles.tripCardCancelBtn}
                    onPress={() => handleCancel(trip.id, trip)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                    <Text style={styles.tripCardCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tripCardChatBtn}
                    onPress={() => handleChat(trip)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.tripCardChatText}>Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tripCardViewBtn}
                    onPress={() => handleViewDetails(trip)}
                  >
                    <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.tripCardViewText}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Toast */}
        <Toast
          visible={toastConfig.visible}
          message={toastConfig.message}
          type={toastConfig.type}
          onHide={() => setToastConfig({ ...toastConfig, visible: false })}
          duration={toastConfig.type === 'error' ? 4000 : 3000}
        />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
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
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 100,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  searchBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  // Old tripCard styles - REEMPLAZADOS con nuevos
  tripCardContainer: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  tripCardGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  tripCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  tripCardBadgeText: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
  },
  tripCardRouteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tripCardOrigin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tripCardDestination: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tripCardLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripCardLocationLabel: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.xs,
  },
  tripCardLocationName: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
    maxWidth: 80,
  },
  tripCardArrow: {
    paddingHorizontal: SPACING.sm,
  },
  tripCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  tripCardFooterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tripCardFooterText: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  tripCardFooterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.md,
  },
  tripCardActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  tripCardCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  tripCardCancelText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error,
    fontWeight: '600',
  },
  tripCardChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  tripCardChatText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tripCardViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
  },
  tripCardViewText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Deprecated styles (kept for reference)
  tripCard: {
    display: 'none',
  },
  tripHeader: {
    display: 'none',
  },
  statusBadge: {
    display: 'none',
  },
  statusText: {
    display: 'none',
  },
  tripDate: {
    display: 'none',
  },
  routeRow: {
    display: 'none',
  },
  routePoint: {
    display: 'none',
  },
  routeDot: {
    display: 'none',
  },
  routeDotEnd: {
    display: 'none',
  },
  routeText: {
    display: 'none',
  },
  routeArrow: {
    display: 'none',
  },
  tripDetails: {
    display: 'none',
  },
  detailItem: {
    display: 'none',
  },
  detailText: {
    display: 'none',
  },
  tripActions: {
    display: 'none',
  },
  cancelBtn: {
    display: 'none',
  },
  cancelBtnText: {
    display: 'none',
  },
  viewBtn: {
    display: 'none',
  },
  viewBtnText: {
    display: 'none',
  },
  // Modal Styles - Mejorados
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    flex: 1,
    paddingBottom: SPACING.xxxl,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  
  // Route Header Gradient
  routeHeaderGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  routeHeaderTop: {
    marginBottom: SPACING.md,
  },
  statusBadgeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  statusBadgeTextModal: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
  },
  routeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  routeDestination: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routePointLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabelBold: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.xs,
  },
  routeLocationBold: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
    fontWeight: 'bold',
  },
  routeArrowLarge: {
    paddingHorizontal: SPACING.sm,
  },
  routeFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  routeDateBold: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '600',
  },

  // Info Grid Section
  infoGridSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  infoGridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoGridCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  gridLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  gridValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  // Driver Card Improved
  driverCardImproved: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  driverHeaderImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  driverAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitialLarge: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: 'bold',
    fontSize: 24,
  },
  driverDetailsSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverNameLarge: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  verifiedText: {
    ...TYPOGRAPHY.label,
    color: COLORS.success,
    fontWeight: '600',
  },
  ratingCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  ratingNumber: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.accent,
    fontWeight: '700',
  },
  driverActionsImproved: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  contactBtnLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    paddingVertical: SPACING.md,
  },
  contactBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Vehicle Card Improved
  vehicleCardImproved: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  vehicleHeaderImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  vehicleIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfoImproved: {
    flex: 1,
  },
  vehicleModelImproved: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  vehicleDetailsImproved: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },

  // Occupancy Card Improved
  occupancyCardImproved: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  occupancyHeadImproved: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  occupancyLabelImproved: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  occupancyPercentage: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  occupancyBarLarge: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  occupancyFillLarge: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  seatsCountRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  seatsCountItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  seatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  seatsCountText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },

  // Modal Actions Improved
  modalActionsImproved: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    ...SHADOWS.md,
  },
  primaryActionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    paddingVertical: SPACING.lg,
    minHeight: 50,
  },
  secondaryActionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error,
    fontWeight: '700',
  },

  // Dropoff Card
  dropoffCardTrip: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  dropoffHeaderTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  dropoffTitleTrip: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  dropoffContentTrip: {
    gap: SPACING.sm,
  },
  dropoffLocationTrip: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  customDropoffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '15',
    alignSelf: 'flex-start',
  },
  customDropoffText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.accent,
    fontWeight: '600',
  },
})
