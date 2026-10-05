import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native'
import { Text } from '../../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../../theme/theme'
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
      showSuccess('Viaje cancelado exitosamente')
      refetch()
    } catch {
      showError('Error al cancelar viaje')
    }
  }

  const handleCancel = (booking: PassengerBooking) => {
    Alert.alert(
      'Cancelar Viaje',
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
      Alert.alert('Sin teléfono', 'No pudimos obtener el número del conductor en este momento.')
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
            <View style={styles.pillOk}><Text style={styles.pillOkText}>Confirmado</Text></View>
          )}
          {porConfirmar && (
            <View style={styles.pillWarn}><Text style={styles.pillWarnText}>Por confirmar</Text></View>
          )}
          {esPendiente && (
            <View style={styles.pillNeutral}><Text style={styles.pillNeutralText}>Pendiente</Text></View>
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

        {esConfirmado && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.tintBtn} onPress={() => handleCall(booking)} activeOpacity={0.85}>
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Mis viajes</Text>

        <View style={styles.segment}>
          <View style={styles.segmentActive}>
            <Text style={styles.segmentActiveText}>Próximos</Text>
          </View>
          <TouchableOpacity style={styles.segmentItem} onPress={() => navigation.navigate('TripHistory')} activeOpacity={0.8}>
            <Text style={styles.segmentText}>Historial</Text>
          </TouchableOpacity>
        </View>

        {bookings.map(renderBooking)}

        {!loading && bookings.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tienes viajes próximos</Text>
            <Text style={styles.emptySub}>Busca cupos desde Inicio para reservar tu próximo viaje.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },

  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },

  segment: {
    marginTop: SPACING.lg, flexDirection: 'row', backgroundColor: COLORS.borderLight, borderRadius: RADIUS.md + 2, padding: SPACING.xs,
  },
  segmentActive: {
    flex: 1, height: 40, borderRadius: RADIUS.md - 1, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  segmentActiveText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  segmentItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },

  card: {
    marginTop: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDay: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginRight: SPACING.sm },
  route: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
  question: { marginTop: SPACING.md, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  pillOk: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1, borderRadius: RADIUS.full, backgroundColor: COLORS.successLight },
  pillOkText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  pillWarn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1, borderRadius: RADIUS.full, backgroundColor: COLORS.warningLight },
  pillWarnText: { fontSize: 12, fontWeight: '700', color: COLORS.warningDark },
  pillNeutral: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  pillNeutralText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  primaryBtn: {
    marginTop: SPACING.md, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  btnDisabled: { opacity: 0.6 },

  actionsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  tintBtn: {
    flex: 1, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  tintBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  outlineBtn: {
    height: 42, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  empty: { marginTop: SPACING.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', lineHeight: 19 },
})
