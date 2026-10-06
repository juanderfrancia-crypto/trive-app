import { useState, useEffect, useRef } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { useBookings, PaymentMethod } from '../hooks/useBookings'
import { getPaymentPreference } from '../services/passengerPaymentPreference'
import { insertNotificationForUser } from '../services/notificationInsert'
import * as Clipboard from 'expo-clipboard'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { supabase } from '../services/supabase'
import OfflineBanner from '../components/OfflineBanner'
import CancellationPolicyCard from '../components/CancellationPolicyCard'

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

const METHOD_LABELS: Record<string, string> = { nequi: 'Nequi', daviplata: 'Daviplata', bancolombia: 'Bancolombia' }

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

function seatList(seats: number[]) {
  if (seats.length === 2) return `${seats[0]} y ${seats[1]}`
  return seats.join(', ')
}

type Confirmation = {
  seatNumbers: number[]
  total: number
  dropoff: string
}

// Reserva4: punto de llegada y forma de pago. Reserva5: confirmación (misma pantalla).
// Trive no recibe ni retiene pagos: el pasajero paga directo al conductor.
export default function BookingScreen() {
  const navigation = useNavigation<any>()
  const selectedRoute = useAppStore((s) => s.selectedRoute)
  const bookingData = useAppStore((s) => s.bookingData)
  const reservationCode: string = bookingData?.reservation_code ?? '---'
  const user = useAppStore((s) => s.user)
  const authUser = useAppStore((s) => s.authUser)
  const setBookingData = useAppStore((s) => s.setBookingData)
  const { reservePendingBookings, finalizePendingBookings, releasePendingBookings, loading } = useBookings()
  const { isOnline } = useNetworkStatus()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  useEffect(() => {
    if (user?.id) getPaymentPreference(user.id).then(setPaymentMethod)
  }, [user?.id])
  const [dropoffOption, setDropoffOption] = useState<'final' | 'custom'>('final')
  const [customDropoffPoint, setCustomDropoffPoint] = useState('')
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>(bookingData?.pending_booking_ids ?? [])
  const [bookingFinalized, setBookingFinalized] = useState(false)
  const [codigoCopiado, setCodigoCopiado] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [driverPaymentMethods, setDriverPaymentMethods] = useState<any[]>([])

  useEffect(() => {
    if (!selectedRoute?.driver_id) return
    let isMounted = true
    supabase
      .from('driver_payment_methods')
      .select('*')
      .eq('driver_id', selectedRoute.driver_id)
      .eq('is_active', true)
      .then(({ data }) => { if (isMounted && data) setDriverPaymentMethods(data) })
    return () => { isMounted = false }
  }, [selectedRoute?.driver_id])

  // Si el pasajero sale sin confirmar, se liberan los asientos pendientes.
  // La referencia evita liberar reservas recién confirmadas al cambiar el estado.
  const pendingRef = useRef({ ids: pendingBookingIds, finalized: bookingFinalized, routeId: selectedRoute?.id })
  pendingRef.current = { ids: pendingBookingIds, finalized: bookingFinalized, routeId: selectedRoute?.id }

  useEffect(() => {
    return () => {
      const { ids, finalized, routeId } = pendingRef.current
      if (!finalized && ids.length > 0 && routeId) {
        releasePendingBookings(ids).catch((error) => {
          if (!String(error?.message ?? '').includes('ya no se puede cancelar')) {
            console.warn('Error releasing pending bookings on unmount:', error)
          }
        })
        setBookingData(null)
      }
    }
  }, [releasePendingBookings, setBookingData])

  const driverFirstName = selectedRoute?.driver_name?.split(' ')[0] ?? 'el conductor'
  const transferAvailable = driverPaymentMethods.length > 0

  if (confirmation && selectedRoute) {
    const dateLabel = isToday(selectedRoute.departure_time)
      ? 'Hoy'
      : new Date(selectedRoute.departure_time).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
    const timeLabel = new Date(selectedRoute.departure_time).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    const count = confirmation.seatNumbers.length

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={[styles.stepSeg, styles.stepSegActive]} />
            ))}
          </View>

          <Illustration name="allChecked" width={180} />
          <Text style={styles.confirmTitle}>Reserva confirmada</Text>
          <Text style={styles.confirmSubtitle}>
            {count === 1 ? 'Tu asiento está listo.' : `Tus ${count} asientos están listos.`} Los verás en Viajes.
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryRoute}>{selectedRoute.origin} → {selectedRoute.destination}</Text>
            <Text style={styles.summaryMeta}>
              {dateLabel} · {timeLabel} · Asientos {seatList(confirmation.seatNumbers)}
            </Text>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Conductor</Text>
              <Text style={styles.summaryValue}>
                {selectedRoute.driver_name ?? 'Conductor'}{selectedRoute.vehicle_plate ? ` · ${selectedRoute.vehicle_plate}` : ''}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowSpaced]}>
              <Text style={styles.summaryKey}>Llegada</Text>
              <Text style={styles.summaryValue}>{confirmation.dropoff}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowSpaced]}>
              <Text style={styles.summaryKey}>Pago</Text>
              <Text style={styles.summaryValue}>Pago directo a {driverFirstName} · {formatCOP(confirmation.total)}</Text>
            </View>
          </View>

          <CancellationPolicyCard />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Después del viaje, confirmas que llegaste bien. Así se cierra el viaje y puedes calificar a tu conductor.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footerStack}>
          {paymentMethod === 'transfer' && reservationCode !== '---' && (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate('PassengerPayment' as never, { reservationCode } as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Pagar a {driverFirstName}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('TripStatus' as never)} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Ver mi viaje</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => navigation.navigate('Main' as never, { screen: 'Home' } as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryCtaText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!selectedRoute || !user || !authUser || !bookingData || !bookingData.seat_numbers?.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Icon name="CircleAlert" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No hay datos de reserva</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
          >
            <Text style={styles.ctaText}>Buscar rutas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { seat_numbers, total_price } = bookingData
  const seatCount = seat_numbers.length

  const getDropoffPoint = () => (dropoffOption === 'final' ? selectedRoute.destination : customDropoffPoint.trim())

  const handleConfirm = async () => {
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

    if (!isOnline) {
      errorHandler.handle(
        'Sin conexión a internet. Verifica tu red antes de confirmar.',
        ErrorType.NETWORK,
        ErrorSeverity.HIGH,
        true,
        { context: 'booking_offline' }
      )
      return
    }

    if (dropoffOption === 'custom' && !customDropoffPoint.trim()) {
      errorHandler.handle(
        'Por favor escribe la dirección de llegada',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'dropoff_required' }
      )
      return
    }

    if (paymentMethod === 'transfer' && !transferAvailable) {
      errorHandler.handle(
        'Este conductor aún no tiene transferencia configurada. Elige efectivo.',
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'transfer_not_configured' }
      )
      return
    }

    try {
      const dropoffPoint = getDropoffPoint()
      const isCustomDropoff = dropoffOption === 'custom'
      let bookingIds = pendingBookingIds

      if (bookingIds.length > 0) {
        const { error: updateError } = await supabase.rpc('set_booking_dropoff', {
          p_booking_ids: bookingIds,
          p_dropoff_point: dropoffPoint,
          p_dropoff_custom: isCustomDropoff,
        })
        if (updateError) throw updateError
        await finalizePendingBookings(bookingIds, paymentMethod)
      } else {
        const reserved = await reservePendingBookings(
          selectedRoute.id,
          seat_numbers,
          paymentMethod,
          dropoffPoint,
          isCustomDropoff
        )
        bookingIds = reserved.map((b) => b.id)
        await finalizePendingBookings(bookingIds, paymentMethod)
      }

      setBookingFinalized(true)
      setPendingBookingIds([])
      setConfirmation({
        seatNumbers: seat_numbers,
        total: total_price,
        dropoff: dropoffPoint,
      })
      setBookingData(null)

      try {
        await insertNotificationForUser(authUser.id, {
          user_id: authUser.id,
          type: 'booking',
          title: '¡Reserva confirmada!',
          message: `Tu reserva para ${selectedRoute.origin} → ${selectedRoute.destination} está confirmada. Asientos: ${seat_numbers.join(', ')}`,
          data: {
            route_id: selectedRoute.id,
            booking_id: bookingIds[0],
            seat_numbers,
            origin: selectedRoute.origin,
            destination: selectedRoute.destination,
            trip_date: selectedRoute.departure_time,
            driver_name: selectedRoute.driver_name ?? null,
            driver_id: selectedRoute.driver_id,
            price: total_price,
            audience: 'passengers_only',
          },
          is_read: false,
        })

        insertNotificationForUser(selectedRoute.driver_id, {
          user_id: selectedRoute.driver_id,
          type: 'booking',
          title: 'Nueva reserva',
          message: `${user.name || 'Un pasajero'} reservó ${seat_numbers.length} cupo${seat_numbers.length > 1 ? 's' : ''} en tu ruta ${selectedRoute.origin} → ${selectedRoute.destination}.`,
          data: {
            route_id: selectedRoute.id,
            passenger_id: authUser.id,
            passenger_name: user.name ?? null,
            seat_numbers,
            origin: selectedRoute.origin,
            destination: selectedRoute.destination,
            trip_date: selectedRoute.departure_time,
            price: total_price,
            audience: 'drivers_only',
          },
          is_read: false,
        }).catch(() => {})
      } catch (notifError) {
        console.error('Error creando notificación:', notifError)
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
      } else if (error.code) {
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

  const transferNames = driverPaymentMethods
    .map((m: any) => METHOD_LABELS[m.type] ?? m.type)
    .join(', ')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading} accessibilityLabel="Volver">
            <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.stepBlock}>
            <View style={styles.stepRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <View key={n} style={[styles.stepSeg, n <= 4 && styles.stepSegActive]} />
              ))}
            </View>
            <Text style={styles.stepLabel}>Paso 4 de 5 · Punto y pago</Text>
          </View>
        </View>

        <Text style={styles.title}>¿Dónde te dejamos en {selectedRoute.destination}?</Text>

        {/* Punto de llegada */}
        <View style={styles.optionStack}>
          <TouchableOpacity
            style={[styles.option, dropoffOption === 'final' && styles.optionSelected]}
            onPress={() => setDropoffOption('final')}
            activeOpacity={0.7}
            accessibilityState={{ selected: dropoffOption === 'final' }}
          >
            <Text style={styles.optionTitle}>{selectedRoute.destination}</Text>
            <Radio selected={dropoffOption === 'final'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, dropoffOption === 'custom' && styles.optionSelected]}
            onPress={() => setDropoffOption('custom')}
            activeOpacity={0.7}
            accessibilityState={{ selected: dropoffOption === 'custom' }}
          >
            <Text style={[styles.optionTitle, dropoffOption !== 'custom' && styles.optionTitleMuted]}>
              Otro punto de llegada
            </Text>
            <Radio selected={dropoffOption === 'custom'} />
          </TouchableOpacity>

          {dropoffOption === 'custom' && (
            <TextInput
              style={styles.addressInput}
              placeholder="Ej: Jardín Plaza, Centro comercial, Farmacia"
              placeholderTextColor={COLORS.textTertiary}
              value={customDropoffPoint}
              onChangeText={setCustomDropoffPoint}
              editable={!loading}
            />
          )}
        </View>

        {/* Forma de pago */}
        <Text style={styles.sectionTitle}>Forma de pago</Text>
        <View style={styles.optionStack}>
          <TouchableOpacity
            style={[styles.option, paymentMethod === 'cash' && styles.optionSelected]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.7}
            accessibilityState={{ selected: paymentMethod === 'cash' }}
          >
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Efectivo</Text>
              <Text style={styles.optionSubtitle}>Pago directo al conductor</Text>
            </View>
            <Radio selected={paymentMethod === 'cash'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              paymentMethod === 'transfer' && styles.optionSelected,
              !transferAvailable && styles.optionDisabled,
            ]}
            onPress={() => { if (transferAvailable) setPaymentMethod('transfer') }}
            activeOpacity={transferAvailable ? 0.7 : 1}
            accessibilityState={{ selected: paymentMethod === 'transfer', disabled: !transferAvailable }}
          >
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Transferencia Bre-B</Text>
              <Text style={styles.optionSubtitle}>
                {transferAvailable ? `Llave de ${driverFirstName}` : 'Disponible cuando el conductor configure su llave'}
              </Text>
            </View>
            <Radio selected={paymentMethod === 'transfer'} disabled={!transferAvailable} />
          </TouchableOpacity>

          {paymentMethod === 'transfer' && transferAvailable && (
            <View style={styles.transferBox}>
              <Text style={styles.transferHint}>Paga a {driverFirstName} por: {transferNames}</Text>
              {driverPaymentMethods.map((m: any) => (
                <View key={m.id} style={styles.transferRow}>
                  <Text style={styles.transferLabel}>{METHOD_LABELS[m.type] ?? m.type}</Text>
                  <Text style={styles.transferValue}>{m.phone_number}</Text>
                  {!!m.account_holder && <Text style={styles.transferHolder}>{m.account_holder}</Text>}
                </View>
              ))}
            </View>
          )}

          <View style={styles.codeRow}>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Código de tu reserva</Text>
              <Text style={styles.optionSubtitle}>Lo escribes en el concepto de la transferencia</Text>
            </View>
            <TouchableOpacity
              style={styles.copyCodeBtn}
              onPress={() => {
                Clipboard.setStringAsync(reservationCode)
                setCodigoCopiado(true)
                setTimeout(() => setCodigoCopiado(false), 2000)
              }}
              activeOpacity={0.8}
              accessibilityLabel="Copiar código de reserva"
            >
              <Text style={styles.codeValue}>{reservationCode}</Text>
              <Icon name={codigoCopiado ? 'Check' : 'Copy'} size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.note}>
          Trive no recibe ni retiene este pago. Le pagas directo a {driverFirstName}, por el medio que elijas.
        </Text>

        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>
              {seatCount} {seatCount === 1 ? 'asiento' : 'asientos'} × {formatCOP(selectedRoute.price_per_seat)}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCOP(total_price)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.ctaText}>Confirmar reserva</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function Radio({ selected, disabled = false }: { selected: boolean; disabled?: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioSelected, disabled && styles.radioDisabled]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
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
  sectionTitle: { marginTop: 22, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  optionStack: { marginTop: 10, gap: 10 },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: { borderColor: COLORS.primary },
  optionDisabled: { opacity: 0.5 },
  optionBody: { flex: 1, paddingRight: 12 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  optionTitleMuted: { color: COLORS.textSecondary },
  optionSubtitle: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioDisabled: { borderColor: COLORS.border },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  addressInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
  },

  transferBox: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    padding: 14,
    gap: 8,
  },
  transferHint: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  transferRow: { gap: 2 },
  transferLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  transferValue: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  transferHolder: { fontSize: 12, color: COLORS.textSecondary },

  codeRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: { fontSize: 14, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  copyCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryTint },

  note: { marginTop: 16, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  totalBox: { marginTop: 16, borderRadius: 18, padding: 16, backgroundColor: COLORS.surfaceAlt },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalKey: { fontSize: 14, color: COLORS.textSecondary },
  totalDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },

  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  footerStack: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, gap: 10 },
  cta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: COLORS.primaryLight, opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse },
  secondaryCta: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  confirmTitle: { marginTop: 18, fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  confirmSubtitle: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  summaryCard: { marginTop: 22, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 18 },
  summaryRoute: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  summaryMeta: { marginTop: 4, fontSize: 13, color: COLORS.textSecondary },
  summaryDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryRowSpaced: { marginTop: 8 },
  summaryKey: { fontSize: 14, color: COLORS.textSecondary },
  summaryValue: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },

  infoBox: { marginTop: 14, borderRadius: RADIUS.lg, padding: 14, backgroundColor: COLORS.surfaceAlt },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
})
