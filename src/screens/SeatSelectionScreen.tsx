import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { useRoutes } from '../hooks/useRoutes'
import { useDriverReviews } from '../hooks/useDriverReviews'
import { supabase } from '../services/supabase'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function SeatSelectionScreen() {
  const navigation = useNavigation()
  const selectedRoute  = useAppStore((s) => s.selectedRoute)
  const setBookingData = useAppStore((s) => s.setBookingData)
  const authUser       = useAppStore((s) => s.authUser)
  const user           = useAppStore((s) => s.user)
  const { getRouteBookings, reservePendingBookings, loading } = useBookings()
  const { getRouteById } = useRoutes()
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string | null>(null)
  const { isOnline } = useNetworkStatus()
  const isMountedRef = useRef(true)
  const { reviews } = useDriverReviews(selectedRoute?.driver_id)
  const isFetchingRef = useRef(false)
  const navTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      navTimeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  const safeNavigate = useCallback((fn: () => void, delay = 0) => {
    if (delay === 0) {
      if (isMountedRef.current) fn()
      return
    }
    const id = setTimeout(() => { if (isMountedRef.current) fn() }, delay)
    navTimeoutsRef.current.push(id)
  }, [])

  const loadBookings = useCallback(async (skipValidation = false) => {
    if (!selectedRoute?.id) return
    if (isFetchingRef.current) return
    if (!authUser) {
      if (!skipValidation) {
        errorHandler.handle(
          'Debes iniciar sesión para ver los asientos disponibles',
          ErrorType.AUTH,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_selection_not_authenticated' }
        )
        safeNavigate(() => navigation.navigate('Login' as never), 800)
      }
      return
    }

    isFetchingRef.current = true
    try {
      setInitialLoading(true)

      const currentRoute = await getRouteById(selectedRoute.id)
      if (!currentRoute) {
        if (!skipValidation) {
          errorHandler.handle(
            'Esta ruta ya no está disponible',
            ErrorType.VALIDATION,
            ErrorSeverity.MEDIUM,
            true,
            { context: 'route_not_found', route_id: selectedRoute.id }
          )
          safeNavigate(() => navigation.goBack(), 800)
        }
        return
      }

      // Busca foto del vehículo y avatar del conductor desde profiles
      const photoFromRoute = currentRoute.vehicle_photo_url
      const { data: driverProfile } = await supabase
        .from('profiles')
        .select('vehicle_photo_url, avatar_url')
        .eq('id', currentRoute.driver_id)
        .maybeSingle()

      if (photoFromRoute) {
        setVehiclePhotoUrl(photoFromRoute)
      } else if (driverProfile?.vehicle_photo_url) {
        setVehiclePhotoUrl(driverProfile.vehicle_photo_url)
      }

      if (driverProfile?.avatar_url) {
        setDriverPhotoUrl(driverProfile.avatar_url)
      }

      if (currentRoute.status !== 'scheduled') {
        if (!skipValidation) {
          errorHandler.handle(
            'Esta ruta ya no está disponible para reservas. Por favor selecciona otra.',
            ErrorType.VALIDATION,
            ErrorSeverity.MEDIUM,
            true,
            { context: 'route_not_scheduled', route_id: selectedRoute.id, status: currentRoute.status }
          )
          safeNavigate(() => navigation.goBack(), 800)
        }
        return
      }

      const routeBookings = await getRouteBookings(selectedRoute.id, true)
      const normalizedBookings = routeBookings.map((booking: any) => ({
        ...booking,
        seat_number: Number(booking.seat_number),
      }))
      setBookings(normalizedBookings)
    } catch (error: any) {
      console.error('Error loading bookings:', error)
      if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'seat_selection_network' }
        )
      } else if (error.code) {
        errorHandler.handleSupabaseError(error, 'load_bookings_seat_selection', { route_id: selectedRoute.id })
      } else {
        errorHandler.handle(
          error,
          ErrorType.DATABASE,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_selection_load_error' }
        )
      }
    } finally {
      setInitialLoading(false)
      isFetchingRef.current = false
    }
  }, [getRouteBookings, getRouteById, selectedRoute?.id, authUser, navigation, safeNavigate])

  useEffect(() => {
    if (!selectedRoute) {
      errorHandler.handle(
        'No hay ruta seleccionada',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'no_route_selected' }
      )
      safeNavigate(() => navigation.goBack(), 800)
      return
    }

    if (!authUser) {
      errorHandler.handle(
        'Debes iniciar sesión',
        ErrorType.AUTH,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'seat_selection_auth' }
      )
      safeNavigate(() => navigation.navigate('Login' as never), 800)
      return
    }

    setSelectedSeats([])
    loadBookings()
  }, [selectedRoute?.id, loadBookings, authUser, navigation, safeNavigate])

  useFocusEffect(
    useCallback(() => {
      if (!selectedRoute?.id || !authUser) return

      // Cuando la pantalla gana foco, cargar sin validaciones agresivas
      loadBookings(true)
      return () => {}
    }, [loadBookings, selectedRoute?.id, authUser])
  )

  if (!selectedRoute) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const occupiedSeats = new Set(bookings.map((b: any) => Number(b.seat_number)))
  const totalSeats = selectedRoute.total_seats || 5
  const availableSeatsCount = totalSeats - occupiedSeats.size

  // Generate seat array
  const seatsArray = Array.from({ length: totalSeats }, (_, i) => {
    const seatId = i + 1
    return {
      id: seatId,
      available: !occupiedSeats.has(seatId),
    }
  })

  const toggleSeat = (seatId: number) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId)
      } else {
        return [...prev, seatId].sort((a, b) => a - b)
      }
    })
  }

  const handleSeatPress = (seatId: number, available: boolean) => {
    if (!available) {
      errorHandler.handle(
        'Este asiento ya está reservado. Por favor elige otro.',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'seat_unavailable', seat_id: seatId }
      )
      return
    }
    toggleSeat(seatId)
  }

  const handleContinue = async () => {
    if (!isOnline) {
      errorHandler.handle(
        'Sin conexión a internet. Verifica tu red antes de reservar.',
        ErrorType.NETWORK,
        ErrorSeverity.HIGH,
        true,
        { context: 'seat_reserve_offline' }
      )
      return
    }

    if (selectedSeats.length === 0) {
      errorHandler.handle(
        'Selecciona al menos un asiento para continuar',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'no_seats_selected' }
      )
      return
    }

    if (!selectedRoute) return
    if (!authUser || !user) {
      errorHandler.handle(
        'Debes iniciar sesión correctamente para reservar',
        ErrorType.AUTH,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'seat_continue_auth' }
      )
      return
    }

    try {
      const currentRoute = await getRouteById(selectedRoute.id)
      if (!currentRoute) {
        errorHandler.handle(
          'Esta ruta ya no está disponible',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'route_unavailable_continue', route_id: selectedRoute.id }
        )
        safeNavigate(() => navigation.goBack(), 800)
        return
      }

      if (currentRoute.status !== 'scheduled') {
        errorHandler.handle(
          'Esta ruta ya no está disponible para reservas',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'route_not_scheduled_continue', route_id: selectedRoute.id }
        )
        safeNavigate(() => navigation.goBack(), 800)
        return
      }

      const latestBookings = await getRouteBookings(selectedRoute.id, true)
      const latestOccupiedSeats = new Set(latestBookings.map((b: any) => Number(b.seat_number)))
      const invalidSeat = selectedSeats.find((seat) => latestOccupiedSeats.has(seat))

      if (invalidSeat) {
        errorHandler.handle(
          `El asiento ${invalidSeat} ya fue reservado. Por favor vuelve a seleccionar.`,
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_conflict', seat_id: invalidSeat }
        )
        await loadBookings()
        return
      }

      const reservedBookings = await reservePendingBookings(
        selectedRoute.id,
        authUser.id,
        selectedSeats,
        selectedRoute.price_per_seat
      )

      const totalPrice = selectedSeats.length * selectedRoute.price_per_seat

      setBookingData({
        route_id: selectedRoute.id,
        seat_numbers: selectedSeats,
        total_seats: selectedSeats.length,
        price_per_seat: selectedRoute.price_per_seat,
        total_price: totalPrice,
        origin: selectedRoute.origin,
        destination: selectedRoute.destination,
        departure_time: selectedRoute.departure_time,
        driver_name: selectedRoute.driver_name,
        vehicle_info: `${selectedRoute.vehicle_make} ${selectedRoute.vehicle_color}`,
        license_plate: selectedRoute.license_plate,
        pending_booking_ids: reservedBookings.map((booking) => booking.id),
      })

      Alert.alert(
        '✅ ¡Éxito!',
        `Asientos reservados: ${selectedSeats.join(', ')}`,
        [
          {
            text: 'Ver Mi Reserva',
            onPress: () => navigation.navigate('Booking' as never),
          },
        ]
      )
    } catch (error: any) {
      console.error('Error reservando asientos:', error)
      if (error.code === 'SEAT_ALREADY_RESERVED') {
        errorHandler.handle(
          'Uno o más asientos ya fueron reservados. Por favor vuelve a seleccionar.',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_already_reserved' }
        )
        await loadBookings()
      } else if (error.code === 'TIMEOUT' || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión o respuesta lenta. Verifica tu red e intenta de nuevo.',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'seat_reserve_network' }
        )
      } else if (error.code) {
        errorHandler.handleSupabaseError(error, 'reserve_seats', { route_id: selectedRoute.id, seats: selectedSeats })
      } else {
        errorHandler.handle(
          error,
          ErrorType.DATABASE,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_reserve_error' }
        )
      }
    }
  }

  const departureDate = new Date(selectedRoute.departure_time)
  const formattedDate = departureDate.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const departureTime = departureDate.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const driverInitial = selectedRoute.driver_name?.charAt(0).toUpperCase() || 'C'

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Selecciona tus asientos</Text>
            <Text style={styles.subtitle}>Toca los asientos disponibles</Text>
          </View>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Vehicle Card */}
            <LinearGradient
              colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vehicleCardGradient}
            >
              <View style={styles.vehicleHeader}>
                <View>
                  <Text style={styles.vehicleName}>{selectedRoute.vehicle_make || 'Vehículo'}</Text>
                  <Text style={styles.vehicleDetails}>
                    {selectedRoute.vehicle_year} · {selectedRoute.vehicle_color}
                  </Text>
                </View>
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.plateBadge}
                >
                  <Text style={styles.plateText}>{selectedRoute.vehicle_plate || '---'}</Text>
                </LinearGradient>
              </View>

              {/* Seats Grid - Real Car Layout */}
              <View style={styles.seatsSection}>
                {/* FRONT ROW: Driver + Copiloto (Seat 1) */}
                <View style={styles.frontRow}>
                  {/* Driver seat */}
                  <View style={styles.driverSeat}>
                    <Ionicons name="person" size={20} color={COLORS.textTertiary} />
                    <Text style={styles.driverLabel}>Conductor</Text>
                  </View>

                  {/* Copiloto - Seat 1 */}
                  {seatsArray.length > 0 && (() => {
                    const seat = seatsArray[0]
                    const isSelected = selectedSeats.includes(seat.id)
                    const isOccupied = !seat.available

                    return (
                      <TouchableOpacity
                        style={[
                          styles.seat,
                          styles.seatFront,
                          isOccupied && styles.seatOccupied,
                          isSelected && styles.seatSelected,
                        ]}
                        onPress={() => handleSeatPress(seat.id, seat.available)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.seatText,
                            isOccupied && styles.seatTextOccupied,
                            isSelected && styles.seatTextSelected,
                          ]}
                        >
                          {seat.id}
                        </Text>
                        {isOccupied && (
                          <View style={styles.occupiedOverlay}>
                            <Ionicons name="close" size={14} color={COLORS.textTertiary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })()}
                </View>

                {/* BACK ROW: Seats 2, 3, 4+ */}
                {seatsArray.length > 1 && (
                  <View style={styles.backRow}>
                    {seatsArray.slice(1).map((seat) => {
                      const isSelected = selectedSeats.includes(seat.id)
                      const isOccupied = !seat.available

                      return (
                        <TouchableOpacity
                          key={seat.id}
                          style={[
                            styles.seat,
                            isOccupied && styles.seatOccupied,
                            isSelected && styles.seatSelected,
                          ]}
                          onPress={() => handleSeatPress(seat.id, seat.available)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.seatText,
                              isOccupied && styles.seatTextOccupied,
                              isSelected && styles.seatTextSelected,
                            ]}
                          >
                            {seat.id}
                          </Text>
                          {isOccupied && (
                            <View style={styles.occupiedOverlay}>
                              <Ionicons name="close" size={14} color={COLORS.textTertiary} />
                            </View>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1D5DB' }]} />
                    <Text style={styles.legendText}>Disponible</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1230B8' }]} />
                    <Text style={styles.legendText}>Seleccionado</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.surfaceAlt }]} />
                    <Text style={styles.legendText}>Ocupado</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Selected Seats Counter */}
            <View style={styles.selectionCardGradient}>
              <View style={styles.selectionInfo}>
                <View
                  style={[
                    styles.selectionIcon,
                    selectedSeats.length > 0 && styles.selectionIconActive,
                  ]}
                >
                  <Ionicons
                    name={selectedSeats.length > 0 ? 'checkmark' : 'information-circle'}
                    size={20}
                    color={selectedSeats.length > 0 ? '#fff' : COLORS.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.selectionTitle,
                      selectedSeats.length > 0 && styles.selectionTitleActive,
                    ]}
                  >
                    {selectedSeats.length === 0
                      ? 'Sin asientos seleccionados'
                      : selectedSeats.length === 1
                      ? '1 asiento seleccionado'
                      : `${selectedSeats.length} asientos seleccionados`}
                  </Text>
                  <Text
                    style={[
                      styles.selectionSubtitle,
                      selectedSeats.length > 0 && styles.selectionSubtitleActive,
                    ]}
                  >
                    {selectedSeats.length > 0
                      ? `Asientos: ${selectedSeats.join(', ')}`
                      : 'Toca los asientos disponibles'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trip Card */}
            <LinearGradient
              colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tripCardGradient}
            >
              <View style={styles.routeRow}>
                <View style={styles.routePoint}>
                  <View style={styles.routeDotStart} />
                  <Text style={styles.routeTextOrigin}>{selectedRoute.origin}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={styles.routeDotEnd} />
                  <Text style={styles.routeTextDestination}>{selectedRoute.destination}</Text>
                </View>
              </View>

              <View style={styles.tripInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.infoText, { color: COLORS.textPrimary }]}>{departureTime}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.infoText, { color: COLORS.textPrimary }]}>
                    ${selectedRoute.price_per_seat.toLocaleString('es-CO')} / asiento
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.infoText, { color: COLORS.textPrimary }]}>{formattedDate}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Driver Card */}
            <View style={styles.driverCardGradient}>
              <View style={styles.driverHeader}>
                {/* Avatar */}
                {driverPhotoUrl ? (
                  <Image
                    source={{ uri: driverPhotoUrl }}
                    style={styles.driverAvatarPhoto}
                  />
                ) : (
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>{driverInitial}</Text>
                  </View>
                )}
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{selectedRoute.driver_name || 'Conductor'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={COLORS.accent} />
                    <Text style={styles.ratingText}>{selectedRoute.driver_rating || '0'}</Text>
                    <Text style={styles.ratingLabel}> ({selectedRoute.driver_trips || 0} viajes)</Text>
                  </View>
                  <Text style={styles.vehicleLabel}>
                    {[selectedRoute.vehicle_make, selectedRoute.vehicle_color].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                {/* Foto del vehículo */}
                <View style={styles.vehiclePhotoWrap}>
                  {vehiclePhotoUrl ? (
                    <Image
                      source={{ uri: vehiclePhotoUrl }}
                      style={styles.vehiclePhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.vehiclePhotoPlaceholder}>
                      <Ionicons name="car-outline" size={26} color={COLORS.textTertiary} />
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Reseñas del conductor */}
            {reviews.length > 0 && (
              <View style={styles.reviewsSection}>
                <Text style={styles.reviewsTitle}>Reseñas del conductor</Text>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewStars}>
                        {[1,2,3,4,5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= r.rating ? 'star' : 'star-outline'}
                            size={13}
                            color="#FBBF24"
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewAuthor}>{r.reviewer_name || 'Pasajero'}</Text>
                    </View>
                    {!!r.comment && (
                      <Text style={styles.reviewComment} numberOfLines={2}>{r.comment}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Summary */}
            <View style={styles.summaryCardGradient}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Asientos disponibles</Text>
                <Text style={styles.summaryValue}>{availableSeatsCount} de {totalSeats}</Text>
              </View>
              {selectedSeats.length > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Asientos ({selectedSeats.length} × ${selectedRoute.price_per_seat.toLocaleString('es-CO')})
                    </Text>
                    <Text style={styles.summaryPrice}>
                      ${(selectedSeats.length * selectedRoute.price_per_seat).toLocaleString('es-CO')}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Continue Button */}
            <LinearGradient
              colors={selectedSeats.length === 0 ? [COLORS.surfaceAlt, COLORS.surfaceAlt] : ['#0E2699', '#1230B8', '#1A3FCC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <TouchableOpacity
                style={styles.continueBtnInner}
                disabled={selectedSeats.length === 0 || loading}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                ) : (
                  <Ionicons
                    name={selectedSeats.length === 0 ? 'alert-circle' : 'arrow-forward'}
                    size={20}
                    color={selectedSeats.length === 0 ? COLORS.textSecondary : '#fff'}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text
                  style={[
                    styles.continueBtnText,
                    (selectedSeats.length === 0 || loading) && styles.continueBtnTextDisabled,
                  ]}
                >
                  {selectedSeats.length === 0
                    ? 'Selecciona tus asientos'
                    : loading
                    ? 'Reservando...'
                    : `Continuar - $${(selectedSeats.length * selectedRoute.price_per_seat).toLocaleString('es-CO')}`}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
  },
  vehicleCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E0FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  vehicleName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  vehicleDetails: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  plateBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  plateText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '700',
  },

  // Seats
  seatsSection: {
    alignItems: 'center',
  },

  // Front Row: Driver + Copiloto
  frontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  // Back Row: Passenger seats
  backRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  seatFront: {
    // Same as seat, no additional styling needed
  },

  driverSeatRow: {
    marginBottom: SPACING.lg,
  },
  driverSeat: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  driverLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textTertiary,
  },
  seatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    maxWidth: 220,
    marginBottom: SPACING.lg,
  },
  seat: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  seatOccupied: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.65,
  },
  seatSelected: {
    backgroundColor: '#1230B8',
    borderWidth: 2,
    borderColor: '#0E2699',
  },
  seatText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  seatTextOccupied: {
    color: COLORS.textTertiary,
  },
  seatTextSelected: {
    color: COLORS.textInverse,
  },
  occupiedOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },

  // Selection Card
  selectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.textTertiary,
  },
  selectionCardActive: {
    borderLeftColor: COLORS.success,
  },
  selectionCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.md,
  },
  selectionCardGradientActive: {
    opacity: 1,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  selectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIconActive: {
    backgroundColor: COLORS.success,
  },
  selectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  selectionTitleActive: {
    color: COLORS.textPrimary,
  },
  selectionSubtitleActive: {
    color: COLORS.textPrimary,
  },
  selectionSubtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Trip Card
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  tripCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E0FF',
    ...SHADOWS.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routePoint: {
    alignItems: 'center',
  },
  routeDotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1230B8',
    marginBottom: SPACING.xs,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.sm,
  },
  routeTextOrigin: {
    ...TYPOGRAPHY.labelMedium,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  routeTextDestination: {
    ...TYPOGRAPHY.labelMedium,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
  },

  // Driver Card
  driverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  driverCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.md,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarPhoto: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
  },
  driverInitial: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  vehicleLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  vehiclePhotoWrap: {
    width: 92,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    marginLeft: 8,
  },
  vehiclePhoto: {
    width: '100%',
    height: '100%',
  },
  vehiclePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Reviews
  reviewsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9EBF2',
    shadowColor: '#0E2699',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    gap: SPACING.sm,
  },
  reviewsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E1A4A',
    marginBottom: 4,
  },
  reviewCard: {
    gap: 4,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F2FF',
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewAuthor: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  summaryCardGradient: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Continue Button
  continueBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.orangeSoft,
    borderTopColor: COLORS.shadowWhiteMid,
    borderTopWidth: 2,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  continueBtnGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  continueBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  continueBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  continueBtnTextDisabled: {
    color: COLORS.textSecondary,
  },
})
