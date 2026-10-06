import { useState, useEffect, useCallback, useRef } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { useRoutes } from '../hooks/useRoutes'
import { supabase } from '../services/supabase'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

// Reserva3: elegir asientos en vivo. Los asientos ocupados vienen del servidor
// y se recargan cuando la ruta cambia.
export default function SeatSelectionScreen() {
  const navigation = useNavigation()
  const selectedRoute = useAppStore((s) => s.selectedRoute)
  const setBookingData = useAppStore((s) => s.setBookingData)
  const authUser = useAppStore((s) => s.authUser)
  const user = useAppStore((s) => s.user)
  const { getRouteBookings, reservePendingBookings, loading } = useBookings()
  const { getRouteById } = useRoutes()
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const { isOnline } = useNetworkStatus()
  const isMountedRef = useRef(true)
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

      const routeBookings = await getRouteBookings(selectedRoute.id)
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

  // Cupos en vivo: cuando cambian los cupos de la ruta, se recargan los asientos ocupados.
  useEffect(() => {
    const routeId = selectedRoute?.id
    if (!routeId) return
    const channel = supabase
      .channel(`seats_${routeId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'routes', filter: `id=eq.${routeId}` },
        () => { loadBookings(true) }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRoute?.id, loadBookings])

  useFocusEffect(
    useCallback(() => {
      if (!selectedRoute?.id || !authUser) return
      loadBookings(true)
      return () => {}
    }, [loadBookings, selectedRoute?.id, authUser])
  )

  if (!selectedRoute) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const occupiedSeats = new Set(bookings.map((b: any) => Number(b.seat_number)))
  const totalSeats = selectedRoute.total_seats || 5
  const seatNumbers = Array.from({ length: totalSeats }, (_, i) => i + 1)
  const seatRows: number[][] = []
  for (let i = 0; i < seatNumbers.length; i += 2) seatRows.push(seatNumbers.slice(i, i + 2))

  const handleSeatPress = (seatId: number, isOccupied: boolean) => {
    if (isOccupied) {
      errorHandler.handle(
        'Este asiento ya está reservado. Por favor elige otro.',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'seat_unavailable', seat_id: seatId }
      )
      return
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId].sort((a, b) => a - b)
    )
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

      const latestBookings = await getRouteBookings(selectedRoute.id)
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

      const reservedBookings = await reservePendingBookings(selectedRoute.id, selectedSeats)

      // El total y el código los entrega el servidor en las reservas pendientes.
      const serverTotal = reservedBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0)
      const reservationCode = reservedBookings.find((b) => b.reservation_code)?.reservation_code ?? null

      setBookingData({
        route_id: selectedRoute.id,
        seat_numbers: selectedSeats,
        total_seats: selectedSeats.length,
        price_per_seat: selectedRoute.price_per_seat,
        total_price: serverTotal,
        origin: selectedRoute.origin,
        destination: selectedRoute.destination,
        departure_time: selectedRoute.departure_time,
        driver_name: selectedRoute.driver_name,
        vehicle_info: `${selectedRoute.vehicle_make} ${selectedRoute.vehicle_color}`,
        license_plate: selectedRoute.vehicle_plate,
        pending_booking_ids: reservedBookings.map((booking) => booking.id),
        reservation_code: reservationCode,
      })

      navigation.navigate('Booking' as never)
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

  const departureTime = new Date(selectedRoute.departure_time).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const seatCount = selectedSeats.length
  const hasSelection = seatCount > 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
            <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.stepBlock}>
            <View style={styles.stepRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <View key={n} style={[styles.stepSeg, n <= 3 && styles.stepSegActive]} />
              ))}
            </View>
            <Text style={styles.stepLabel}>Paso 3 de 5 · Asientos</Text>
          </View>
        </View>

        <Text style={styles.title}>Elige tus asientos</Text>
        <Text style={styles.subtitle}>
          {selectedRoute.driver_name || 'Conductor'} · {departureTime} · Se actualiza en vivo
        </Text>

        {initialLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Ficha del conductor: solo datos que llegan en available_rides (rating y reseñas). */}
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>
                  {(selectedRoute.driver_name || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.driverBody}>
                <Text style={styles.driverName}>{selectedRoute.driver_name || 'Conductor'}</Text>
                <View style={styles.driverStats}>
                  <Icon name="Star" size={13} color={COLORS.accent} />
                  <Text style={styles.driverStatValue}>
                    {selectedRoute.driver_rating ? Number(selectedRoute.driver_rating).toFixed(1) : 'Nuevo'}
                  </Text>
                  <Text style={styles.driverStatMuted}>
                    · {Number(selectedRoute.driver_review_count ?? 0)} reseñas
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.mapCard}>
              <View style={styles.mapTop}>
                <View style={styles.wheelPill}>
                  <Text style={styles.wheelText}>Volante</Text>
                </View>
                <Text style={styles.frontText}>Adelante</Text>
              </View>

              <View style={styles.grid}>
                {seatRows.map((row) =>
                  row.map((seatId) => {
                    const isOccupied = occupiedSeats.has(seatId)
                    const isSelected = selectedSeats.includes(seatId)
                    return (
                      <TouchableOpacity
                        key={seatId}
                        style={[
                          styles.seat,
                          isOccupied ? styles.seatOccupied : isSelected ? styles.seatSelected : styles.seatFree,
                        ]}
                        onPress={() => handleSeatPress(seatId, isOccupied)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Asiento ${seatId}`}
                        accessibilityState={{ selected: isSelected, disabled: isOccupied }}
                      >
                        <Text
                          style={[
                            styles.seatText,
                            isOccupied ? styles.seatTextOccupied : isSelected ? styles.seatTextSelected : styles.seatTextFree,
                          ]}
                        >
                          {seatId}
                        </Text>
                      </TouchableOpacity>
                    )
                  })
                )}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.seatFree]} />
                  <Text style={styles.legendText}>Libre</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={[styles.legendText, { color: COLORS.primary }]}>Tuyo</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.surfaceAlt }]} />
                  <Text style={[styles.legendText, { color: COLORS.textTertiary }]}>Ocupado</Text>
                </View>
              </View>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Si alguien reserva el mismo asiento antes que tú, te avisamos y eliges otro.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !hasSelection && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!hasSelection || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <>
              <Text style={[styles.ctaText, !hasSelection && styles.ctaTextDisabled]}>
                {hasSelection
                  ? `Continuar · ${seatCount} ${seatCount === 1 ? 'asiento' : 'asientos'}`
                  : 'Selecciona tus asientos'}
              </Text>
              {hasSelection && (
                <Text style={styles.ctaPrice}>{formatCOP(selectedRoute.price_per_seat)} c/u</Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const SEAT_SIZE = 56

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg },

  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBlock: { flex: 1 },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepSegActive: { backgroundColor: COLORS.primary },
  stepLabel: { marginTop: 8, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  title: { marginTop: 18, fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },
  subtitle: { marginTop: 2, fontSize: 14, color: COLORS.textSecondary },

  loading: { paddingVertical: SPACING.xxxl, alignItems: 'center' },

  driverCard: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  driverBody: { flex: 1 },
  driverName: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, fontWeight: '700' },
  driverStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  driverStatValue: { ...TYPOGRAPHY.labelMedium, color: COLORS.textPrimary, fontWeight: '700' },
  driverStatMuted: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary },

  mapCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 26,
  },
  mapTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wheelPill: {
    width: 40,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  frontText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  grid: {
    alignSelf: 'center',
    width: SEAT_SIZE * 2 + 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 18,
  },
  seat: {
    width: SEAT_SIZE,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatFree: {
    backgroundColor: COLORS.primaryTint,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  seatSelected: { backgroundColor: COLORS.primary },
  seatOccupied: { backgroundColor: COLORS.surfaceAlt },
  seatText: { fontSize: 16, fontWeight: '800' },
  seatTextFree: { color: COLORS.primary },
  seatTextSelected: { color: COLORS.textInverse },
  seatTextOccupied: { color: COLORS.textTertiary },

  legend: { flexDirection: 'row', gap: 14, marginTop: 18, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  noteBox: {
    marginTop: 16,
    borderRadius: RADIUS.lg,
    padding: 14,
    backgroundColor: COLORS.surfaceAlt,
  },
  noteText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  cta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  ctaDisabled: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse },
  ctaTextDisabled: { color: COLORS.textTertiary },
  ctaPrice: { fontSize: 14, fontWeight: '700', color: COLORS.textInverse },
})
