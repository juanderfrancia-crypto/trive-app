import React, { useState, useCallback } from 'react'
import TripHistoryScreen from '../TripHistoryScreen'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native'
import { Text } from '../../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Icon from '../../components/Icon'
import Illustration from '../../components/illustrations/Illustration'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { getCounterpartPhone } from '../../services/profileColumns'
import { showSuccess, showError } from '../../utils/showError'
import {
  usePassengerBookings,
  confirmPassengerTrip,
  cancelPassengerBooking,
  PassengerBooking,
} from './usePassengerBookings'
import { formatDia, formatHora } from './passengerFormat'

export default function PassengerTripsScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { bookings, loading, refetch } = usePassengerBookings(user?.id)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [segmento, setSegmento] = useState<'proximos' | 'historial'>('proximos')

  useFocusEffect(useCallback(() => { refetch() }, [refetch]))

  const handleConfirm = async (booking: PassengerBooking) => {
    try {
      setBusyId(booking.bookingId)
      await confirmPassengerTrip(booking.bookingId)
      showSuccess('¡Gracias por confirmar!')
      refetch()
    } catch (err: any) {
      showError(err?.message || 'No se pudo registrar tu respuesta')
    } finally {
      setBusyId(null)
    }
  }

  const doCancel = async (booking: PassengerBooking) => {
    if (!user?.id) return
    try {
      await cancelPassengerBooking(booking, user.id)
      showSuccess('Viaje cancelado')
      refetch()
    } catch {
      showError('No pudimos cancelar el viaje')
    }
  }

  const handleCancel = (booking: PassengerBooking) => {
    Alert.alert(
      'Cancelar viaje',
      `¿Deseas cancelar el viaje de ${booking.origin} a ${booking.destination}?`,
      [
        { text: 'No, mantener', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => doCancel(booking) },
      ]
    )
  }

  const handleCall = async (booking: PassengerBooking) => {
    const phone = await getCounterpartPhone(booking.driverId)
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    } else {
      Alert.alert(
        'No pudimos hacer la llamada',
        'No pudimos obtener el número del conductor en este momento. Puedes escribirle por el chat del viaje.'
      )
    }
  }

  const renderBooking = (booking: PassengerBooking) => {
    const esPendiente = booking.bookingStatus === 'pending'
    const esConfirmado = booking.bookingStatus === 'confirmed'
    const porConfirmar = booking.bookingStatus === 'awaiting_confirmation'

    return (
      <View key={booking.bookingId} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardDay}>{formatDia(booking.departureTime)} · {formatHora(booking.departureTime)}</Text>
          {esConfirmado && (
            <View style={[styles.pill, styles.pillOk]}><Text style={[styles.pillText, styles.pillOkText]}>Confirmado</Text></View>
          )}
          {porConfirmar && (
            <View style={[styles.pill, styles.pillWarn]}><Text style={[styles.pillText, styles.pillWarnText]}>Por confirmar</Text></View>
          )}
          {esPendiente && (
            <View style={[styles.pill, styles.pillNeutral]}><Text style={[styles.pillText, styles.pillNeutralText]}>Pendiente</Text></View>
          )}
        </View>

        <Text style={styles.route} numberOfLines={1}>{booking.origin} → {booking.destination}</Text>

        {esPendiente ? (
          <Text style={styles.sub}>Tu reserva está en proceso</Text>
        ) : (
          <Text style={styles.sub}>
            {booking.driverName} · ★ {booking.driverRating.toFixed(1)}
            {esConfirmado ? ` · Asiento ${booking.seatNumber}` : ''}
          </Text>
        )}

        {porConfirmar && (
          <>
            <Text style={styles.question}>¿Llegaste bien? Confírmalo para cerrar el viaje.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, busyId === booking.bookingId && styles.btnDisabled]}
              onPress={() => handleConfirm(booking)}
              disabled={busyId === booking.bookingId}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Confirmar viaje</Text>
            </TouchableOpacity>
          </>
        )}

        {esConfirmado && booking.paymentMethod === 'transfer' && booking.reservationCode && (
          booking.paymentConfirmedAt ? (
            <Text style={styles.sub}>Pago confirmado por {booking.driverName}</Text>
          ) : booking.paymentMarkedAt ? (
            <Text style={styles.sub}>Marcaste el pago. Esperando que {booking.driverName} lo confirme.</Text>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('PassengerPayment', { reservationCode: booking.reservationCode })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Pagar a {booking.driverName}</Text>
            </TouchableOpacity>
          )
        )}

        {esConfirmado && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.tintBtn} onPress={() => handleCall(booking)} activeOpacity={0.85}>
              <Icon name="Phone" size={16} color={COLORS.primary} />
              <Text style={styles.tintBtnText}>Llamar al conductor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => handleCancel(booking)} activeOpacity={0.85}>
              <Text style={styles.outlineBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  const showEmpty = !loading && bookings.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Mis viajes</Text>

        <View style={styles.segment}>
          <TouchableOpacity
            style={segmento === 'proximos' ? styles.segmentActive : styles.segmentItem}
            onPress={() => setSegmento('proximos')}
            activeOpacity={0.8}
          >
            <Text style={segmento === 'proximos' ? styles.segmentActiveText : styles.segmentText}>Próximos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={segmento === 'historial' ? styles.segmentActive : styles.segmentItem}
            onPress={() => setSegmento('historial')}
            activeOpacity={0.8}
          >
            <Text style={segmento === 'historial' ? styles.segmentActiveText : styles.segmentText}>Historial</Text>
          </TouchableOpacity>
        </View>
      </View>

      {segmento === 'historial' ? (
        <TripHistoryScreen embedded />
      ) : (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {loading && bookings.length === 0 && (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        )}

        {bookings.map(renderBooking)}

        {showEmpty && (
          <View style={styles.empty}>
            <Illustration name="schedule" width={170} />
            <Text style={styles.emptyTitle}>Aún no tienes viajes próximos</Text>
            <Text style={styles.emptyText}>Cuando reserves un viaje, lo verás aquí con su día, hora y conductor.</Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.85}
            >
              <Icon name="Search" size={18} color={COLORS.white} />
              <Text style={styles.searchBtnText}>Buscar viajes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },

  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  segment: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
  },
  segmentActive: {
    ...SHADOWS.xs,
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActiveText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.primary },
  segmentItem: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  segmentText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },

  loader: { marginTop: SPACING.xxl },

  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  cardDay: { ...TYPOGRAPHY.labelMedium, flex: 1, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  route: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
  question: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: 20 },

  pill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  pillText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold },
  pillOk: { backgroundColor: COLORS.successLight },
  pillOkText: { color: COLORS.success },
  pillWarn: { backgroundColor: COLORS.warningLight },
  pillWarnText: { color: COLORS.warningDark },
  pillNeutral: { backgroundColor: COLORS.surfaceAlt },
  pillNeutralText: { color: COLORS.textSecondary },

  primaryBtn: {
    marginTop: SPACING.md,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
  btnDisabled: { opacity: 0.6 },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  tintBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  tintBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  outlineBtn: {
    height: 44,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },

  empty: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary, marginTop: SPACING.sm, textAlign: 'center' },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 50,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  searchBtnText: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
})
