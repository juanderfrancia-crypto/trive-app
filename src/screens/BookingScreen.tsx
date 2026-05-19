import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { insertNotificationForUser } from '../services/notificationInsert'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { supabase } from '../services/supabase'
import Toast from '../components/Toast'
import OfflineBanner from '../components/OfflineBanner'

export default function BookingScreen() {
  const navigation = useNavigation<any>()
  const selectedRoute = useAppStore((s) => s.selectedRoute)
  const bookingData   = useAppStore((s) => s.bookingData)
  const user          = useAppStore((s) => s.user)
  const authUser      = useAppStore((s) => s.authUser)
  const setBookingData = useAppStore((s) => s.setBookingData)
  const { createBooking, reservePendingBookings, finalizePendingBookings, releasePendingBookings, loading } = useBookings()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash')
  const [selectedDropoffOption, setSelectedDropoffOption] = useState<'final' | 'custom'>('final')
  const [customDropoffPoint, setCustomDropoffPoint] = useState('')
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>(bookingData?.pending_booking_ids ?? [])
  const [bookingFinalized, setBookingFinalized] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string | null>(null)
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)
  const [driverPaymentMethods, setDriverPaymentMethods] = useState<any[]>([])

  useEffect(() => {
    if (!selectedRoute?.driver_id) return
    let isMounted = true
    supabase
      .from('profiles')
      .select('avatar_url, vehicle_photo_url')
      .eq('id', selectedRoute.driver_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return
        if (data?.avatar_url) setDriverPhotoUrl(data.avatar_url)
        const vPhoto = (selectedRoute as any).vehicle_photo_url || data?.vehicle_photo_url
        if (vPhoto) setVehiclePhotoUrl(vPhoto)
      })
    supabase
      .from('driver_payment_methods')
      .select('*')
      .eq('driver_id', selectedRoute.driver_id)
      .eq('is_active', true)
      .then(({ data }) => { if (isMounted && data) setDriverPaymentMethods(data) })
    return () => { isMounted = false }
  }, [selectedRoute?.driver_id])

  useEffect(() => {
    return () => {
      if (!bookingFinalized && pendingBookingIds.length > 0 && selectedRoute) {
        releasePendingBookings(pendingBookingIds, selectedRoute.id).catch((error) => {
          console.warn('Error releasing pending bookings on unmount:', error)
        })
        setBookingData(null)
      }
    }
  }, [bookingFinalized, pendingBookingIds, releasePendingBookings, selectedRoute, setBookingData])

  if (!selectedRoute || !user || !authUser || !bookingData || !bookingData.seat_numbers?.length) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>No hay datos de reserva</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
          >
            <Ionicons name="search" size={20} color={COLORS.textInverse} />
            <Text style={styles.retryBtnText}>Buscar rutas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { seat_numbers, total_price } = bookingData
  const seatsCount = seat_numbers.length

  const departureDate = new Date(selectedRoute.departure_time)
  const formattedDate = departureDate.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = departureDate.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Determinar punto de desembarque
  const getDropoffPoint = () => {
    if (selectedDropoffOption === 'final') {
      return selectedRoute.destination
    } else {
      return customDropoffPoint
    }
  }

  const handleCashBooking = async () => {
    if (!authUser) {
      errorHandler.handle(
        'Debes iniciar sesión para confirmar la reserva',
        ErrorType.AUTH,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'booking_not_authenticated' }
      )
      return
    }

    // Validar que haya seleccionado parada intermedia
    if (selectedDropoffOption === 'custom' && !customDropoffPoint.trim()) {
      errorHandler.handle(
        'Por favor ingresa la parada de desembarque',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'dropoff_required' }
      )
      return
    }

    try {
      const dropoffPoint = getDropoffPoint()
      const isCustomDropoff = selectedDropoffOption === 'custom'

      let results

      if (pendingBookingIds.length > 0) {
        // 📍 Primero actualizar dropoff_point en los bookings pending
        if (__DEV__) console.log(`📍 Actualizando dropoff_point en ${pendingBookingIds.length} bookings antes de finalizar...`)
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            dropoff_point: dropoffPoint,
            dropoff_point_custom: isCustomDropoff,
          })
          .in('id', pendingBookingIds)
          .eq('booking_status', 'pending')

        if (updateError) {
          console.error('❌ Error actualizando dropoff_point:', updateError)
          throw updateError
        }
        if (__DEV__) console.log('✅ Dropoff point actualizado en bookings')

        // Ahora finalizar con la RPC (preservará los dropoff_point que acabamos de establecer)
        results = await finalizePendingBookings(pendingBookingIds, paymentMethod)
      } else {
        const bookingPromises = seat_numbers.map((seatNum: number) =>
          createBooking(
            selectedRoute.id,
            authUser.id,
            seatNum,
            selectedRoute.price_per_seat,
            'cash',
            'confirmed',
            'completed',
            dropoffPoint,
            isCustomDropoff
          )
        )
        results = await Promise.all(bookingPromises)
      }

      const allSuccessful = Array.isArray(results)
        ? results.length === seat_numbers.length && results.every((r) => r !== null)
        : !!results

      if (allSuccessful) {
        setBookingFinalized(true)
        setPendingBookingIds([])
        setBookingData(null)

        try {
          await insertNotificationForUser(authUser.id, {
            user_id: authUser.id,
            type: 'booking',
            title: 'Reserva confirmada',
            message: `Tu reserva para ${selectedRoute.origin} → ${selectedRoute.destination} está confirmada. Asientos: ${seat_numbers.join(', ')}`,
            data: {
              route_id: selectedRoute.id,
              booking_id: Array.isArray(results) ? results[0]?.id : undefined,
              seat_numbers: seat_numbers,
              departure_time: selectedRoute.departure_time,
              audience: 'passengers_only',
            },
            is_read: false,
          })

          // Notificar al conductor
          insertNotificationForUser(selectedRoute.driver_id, {
            user_id: selectedRoute.driver_id,
            type: 'booking',
            title: 'Nueva reserva',
            message: `${user.name || 'Un pasajero'} reservó ${seat_numbers.length} cupo${seat_numbers.length > 1 ? 's' : ''} en tu ruta ${selectedRoute.origin} → ${selectedRoute.destination}.`,
            data: {
              route_id: selectedRoute.id,
              passenger_id: authUser.id,
              seat_numbers,
              audience: 'drivers_only',
            },
            is_read: false,
          }).catch(() => {})
        } catch (notifError) {
          console.error('Error creando notificación:', notifError)
        }

        setToastType('success')
        setToastMessage(`✅ Reserva confirmada. Asientos: ${seat_numbers.join(', ')}`)
        setToastVisible(true)
        setTimeout(() => navigation.navigate('TripStatus' as never), 1500)
      } else {
        errorHandler.handle(
          'Algunas reservas fallaron. Por favor contacta a soporte.',
          ErrorType.DATABASE,
          ErrorSeverity.HIGH,
          true,
          { context: 'booking_partial_failure' }
        )
      }
    } catch (error: any) {
      if (error.code === 'SEAT_ALREADY_RESERVED') {
        errorHandler.handle(
          'Uno de los asientos seleccionados ya fue reservado. Por favor vuelve a seleccionar.',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'seat_conflict' }
        )
        setTimeout(() => navigation.navigate('SeatSelection' as never), 2000)
      } else if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'booking_network_error' }
        )
      } else {
        // Manejo de error con Supabase
        if (error.code) {
          errorHandler.handleSupabaseError(error, 'finalize_booking', { route_id: selectedRoute.id })
        } else {
          errorHandler.handle(
            error,
            ErrorType.UNKNOWN,
            ErrorSeverity.MEDIUM,
            true,
            { context: 'booking_error', error: error.message }
          )
        }
      }
    }
  }

  const handleConfirmBooking = async () => {
    await handleCashBooking()
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <OfflineBanner />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Reserva tu cupo</Text>
            <Text style={styles.subtitle}>Confirmación de viaje</Text>
          </View>
        </View>

        {/* Route Card */}
        <LinearGradient
          colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tripCardGradient}
        >
          <View style={styles.routeRow}>
            <View style={[styles.routePoint, styles.routePointColumn]}>
              <View style={[styles.routeDotStart, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.routeLabel}>Desde</Text>
              <Text style={[styles.routeText, styles.routeTextWhite]} numberOfLines={2}>{selectedRoute.origin}</Text>
            </View>
            <View style={styles.routeLineContainer}>
              <View style={styles.routeLine} />
              <View style={styles.carIconContainer}>
                <Ionicons name="car-outline" size={20} color={COLORS.textSecondary} />
              </View>
            </View>
            <View style={[styles.routePoint, styles.routePointColumn]}>
              <View style={[styles.routeDotEnd, { backgroundColor: '#10B981' }]} />
              <Text style={styles.routeLabel}>Hacia</Text>
              <Text style={[styles.routeText, styles.routeTextWhite]} numberOfLines={2}>{selectedRoute.destination}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: COLORS.borderLight }]} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.detailLabel, { color: COLORS.textSecondary }]}>Fecha</Text>
              <Text style={[styles.detailValue, { color: COLORS.textPrimary }]}>{formattedDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.detailLabel, { color: COLORS.textSecondary }]}>Hora</Text>
              <Text style={[styles.detailValue, { color: COLORS.textPrimary }]}>{formattedTime}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Seats Card */}
        <LinearGradient
          colors={['#D6E0FF', '#BDCEFF', '#A8BBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seatsCardGradient}
        >
          <Text style={styles.sectionTitle}>Asientos seleccionados</Text>
          <View style={styles.seatsBadges}>
            {seat_numbers.map((seatNum: number) => (
              <View key={seatNum} style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>{seatNum}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.seatsSummary}>
            {seatsCount} {seatsCount === 1 ? 'asiento' : 'asientos'} · ${selectedRoute.price_per_seat.toLocaleString('es-CO')} c/u
          </Text>
        </LinearGradient>

        {/* Passenger Card */}
        <LinearGradient
          colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passengerCardGradient}
        >
          <Text style={styles.sectionTitle}>Datos del pasajero</Text>

          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerInitial}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName}>{user.name}</Text>
              <Text style={styles.passengerPhone}>{user.phone || user.email}</Text>
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
          <View style={styles.vehicleCardContent}>
            {/* Izquierda: info */}
            <View style={styles.vehicleCardLeft}>
              <View style={styles.vehicleRow}>
                <Ionicons name="car" size={20} color={COLORS.primary} />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{selectedRoute.vehicle_make} {selectedRoute.vehicle_color}</Text>
                  <Text style={styles.vehiclePlate}>{selectedRoute.vehicle_plate}</Text>
                </View>
              </View>
              {selectedRoute.driver_name && (
                <View style={styles.driverRow}>
                  <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.driverName}>Conductor: {selectedRoute.driver_name}</Text>
                </View>
              )}
            </View>

            {/* Derecha: foto conductor (arriba) + foto vehículo (abajo) */}
            <View style={styles.vehiclePhotosColumn}>
              <View style={styles.vehiclePhotoHalf}>
                {driverPhotoUrl ? (
                  <Image source={{ uri: driverPhotoUrl }} style={styles.vehiclePhotoImg} resizeMode="cover" />
                ) : (
                  <View style={styles.vehiclePhotoPlaceholder}>
                    <Ionicons name="person" size={18} color={COLORS.textTertiary} />
                  </View>
                )}
              </View>
              <View style={[styles.vehiclePhotoHalf, { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                {vehiclePhotoUrl ? (
                  <Image source={{ uri: vehiclePhotoUrl }} style={styles.vehiclePhotoImg} resizeMode="cover" />
                ) : (
                  <View style={styles.vehiclePhotoPlaceholder}>
                    <Ionicons name="car-outline" size={18} color={COLORS.textTertiary} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Dropoff Point Card */}
        <LinearGradient
          colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dropoffCardGradient}
        >
          <Text style={styles.sectionTitle}>Punto de desembarque</Text>

          {/* Option: Final Destination */}
          <TouchableOpacity
            style={[styles.dropoffOption, selectedDropoffOption === 'final' && styles.dropoffOptionActive]}
            onPress={() => setSelectedDropoffOption('final')}
            activeOpacity={0.7}
          >
            <View style={[styles.dropoffRadio, selectedDropoffOption === 'final' && styles.dropoffRadioSelected]}>
              {selectedDropoffOption === 'final' && <View style={styles.dropoffRadioInner} />}
            </View>
            <View style={styles.dropoffOptionContent}>
              <Text style={[styles.dropoffOptionLabel, selectedDropoffOption === 'final' && styles.dropoffOptionLabelActive]}>
                Destino final
              </Text>
              <Text style={styles.dropoffOptionSubtitle}>{selectedRoute.destination}</Text>
            </View>
          </TouchableOpacity>

          {/* Option: Custom Dropoff */}
          <TouchableOpacity
            style={[styles.dropoffOption, selectedDropoffOption === 'custom' && styles.dropoffOptionActive]}
            onPress={() => setSelectedDropoffOption('custom')}
            activeOpacity={0.7}
          >
            <View style={[styles.dropoffRadio, selectedDropoffOption === 'custom' && styles.dropoffRadioSelected]}>
              {selectedDropoffOption === 'custom' && <View style={styles.dropoffRadioInner} />}
            </View>
            <View style={styles.dropoffOptionContent}>
              <Text style={[styles.dropoffOptionLabel, selectedDropoffOption === 'custom' && styles.dropoffOptionLabelActive]}>
                Parada intermedia
              </Text>
              <Text style={styles.dropoffOptionSubtitle}>Especifica dónde te bajan</Text>
            </View>
          </TouchableOpacity>

          {/* Custom Dropoff Input */}
          {selectedDropoffOption === 'custom' && (
            <TextInput
              style={styles.dropoffInput}
              placeholder="Ej: Centro comercial, calle 5ta, farmacia..."
              placeholderTextColor={COLORS.textSecondary}
              value={customDropoffPoint}
              onChangeText={setCustomDropoffPoint}
              editable={!loading}
            />
          )}
        </LinearGradient>

        {/* Payment Method */}
        <LinearGradient
          colors={['#D6E0FF', '#BDCEFF', '#A8BBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.paymentCardGradient}
        >
          <Text style={styles.sectionTitle}>Método de pago</Text>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={[styles.paymentRadio, paymentMethod === 'cash' && styles.paymentRadioSelected]}>
              {paymentMethod === 'cash' && <View style={styles.paymentRadioInner} />}
            </View>
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.paymentText, paymentMethod === 'cash' && styles.paymentTextActive]}>
              Efectivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'digital' && styles.paymentOptionActive, driverPaymentMethods.length === 0 && styles.paymentOptionDisabled]}
            onPress={() => driverPaymentMethods.length > 0 && setPaymentMethod('digital')}
            disabled={driverPaymentMethods.length === 0}
          >
            <View style={[styles.paymentRadio, paymentMethod === 'digital' && styles.paymentRadioSelected]}>
              {paymentMethod === 'digital' && <View style={styles.paymentRadioInner} />}
            </View>
            <Ionicons name="phone-portrait-outline" size={24} color={paymentMethod === 'digital' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.paymentText, paymentMethod === 'digital' && styles.paymentTextActive, driverPaymentMethods.length === 0 && styles.paymentTextDisabled]}>
              Pago digital{driverPaymentMethods.length === 0 ? ' (conductor sin configurar)' : ''}
            </Text>
          </TouchableOpacity>

          {/* Info de pago digital del conductor */}
          {paymentMethod === 'digital' && driverPaymentMethods.length > 0 && (
            <View style={styles.digitalInfoBox}>
              <Text style={styles.digitalInfoTitle}>Paga directamente al conductor:</Text>
              {driverPaymentMethods.map((m: any) => {
                const colors: Record<string, string> = { nequi: '#6C1FC6', daviplata: '#E31E24', bancolombia: '#B8970A' }
                const labels: Record<string, string> = { nequi: 'Nequi', daviplata: 'Daviplata', bancolombia: 'Bancolombia' }
                return (
                  <View key={m.id} style={styles.digitalMethodRow}>
                    <View style={[styles.digitalMethodDot, { backgroundColor: colors[m.type] ?? COLORS.primary }]} />
                    <View>
                      <Text style={styles.digitalMethodLabel}>{labels[m.type] ?? m.type}</Text>
                      <Text style={styles.digitalMethodPhone}>{m.phone_number}</Text>
                      <Text style={styles.digitalMethodHolder}>{m.account_holder}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </LinearGradient>

        {/* Price Summary */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.priceCardGradient}
        >
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {seatsCount} {seatsCount === 1 ? 'asiento' : 'asientos'} × ${selectedRoute.price_per_seat.toLocaleString('es-CO')}
            </Text>
            <Text style={styles.priceValue}>
              ${total_price.toLocaleString('es-CO')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>Total a pagar</Text>
            <Text style={styles.priceTotalValue}>
              ${total_price.toLocaleString('es-CO')}
            </Text>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <LinearGradient
          colors={loading ? [COLORS.border, COLORS.border] : ['#0E2699', '#1230B8', '#1A3FCC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.confirmBtnGradient}
        >
          <TouchableOpacity
            style={styles.confirmBtnInner}
            onPress={handleConfirmBooking}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirmar reserva</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
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

  // Header
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

  // Trip Card
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
  },
  tripCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  routePoint: {
    alignItems: 'center',
  },
  routePointColumn: {
    flex: 0,
    minWidth: 110,
    maxWidth: 120,
  },
  routeDotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  routeLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  routeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  routeTextWhite: {
    color: COLORS.textPrimary,
  },
  routeLine: {
    position: 'absolute',
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderLight,
    width: '100%',
  },
  routeLineContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  carIconContainer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    zIndex: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  seatsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  seatBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  seatBadgeText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  seatsSummary: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Passenger Card
  passengerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  passengerCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitial: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  passengerPhone: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  vehicleCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  vehicleCardContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  vehicleCardLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  vehiclePhotosColumn: {
    width: 84,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  vehiclePhotoHalf: {
    flex: 1,
    overflow: 'hidden',
  },
  vehiclePhotoImg: {
    width: '100%',
    height: '100%',
  },
  vehiclePhotoPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehiclePlate: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  driverName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  paymentCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  paymentOptionActive: {
    backgroundColor: COLORS.primary + '10',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: {
    borderColor: COLORS.primary,
  },
  paymentRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  paymentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  paymentTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  paymentTextDisabled: {
    color: COLORS.textSecondary,
  },
  digitalInfoBox: {
    marginTop: 12, backgroundColor: '#F8F9FF', borderRadius: 10,
    borderWidth: 1, borderColor: `${COLORS.primary}25`, padding: 12, gap: 10,
  },
  digitalInfoTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.3 },
  digitalMethodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  digitalMethodDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  digitalMethodLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  digitalMethodPhone: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  digitalMethodHolder: { fontSize: 12, color: COLORS.textSecondary },

  // Price Card
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  priceCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  priceTotalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  priceTotalValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Buttons
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.orangeSoft,
    borderTopColor: COLORS.shadowWhiteMid,
    borderTopWidth: 2,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  confirmBtnGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  confirmBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  retryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Dropoff Card
  dropoffCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dropoffOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  dropoffOptionActive: {
    backgroundColor: COLORS.primary + '10',
  },
  dropoffRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
    flexShrink: 0,
  },
  dropoffRadioSelected: {
    borderColor: COLORS.primary,
  },
  dropoffRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  dropoffOptionContent: {
    flex: 1,
  },
  dropoffOptionLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dropoffOptionLabelActive: {
    color: COLORS.primary,
  },
  dropoffOptionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  dropoffInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
})
