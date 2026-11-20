import { useCallback, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { showSuccess, showError } from '../utils/showError'
import { supabase } from '../services/supabase'
import { createReview } from '../services/reviews'
import { useAppStore } from '../store/useAppStore'
import Icon from '../components/Icon'

interface RouteParams {
  routeId: string
}

interface PassengerRow {
  bookingId: string
  name: string
  seatNumber: number | null
  rating: number
  alreadyRated: boolean
}

// Un conductor comparte ruta con varios pasajeros a la vez (a diferencia de
// ruta personalizada, que es 1 a 1) — calificar a cada uno en su propia
// pantalla sería entrar y salir N veces por cada viaje. Acá se califica a
// todos de una vez, en lote, y cada quien queda con su propia nota.
export default function RatePassengersScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { routeId } = (route.params ?? {}) as RouteParams
  const authUser = useAppStore((s) => s.authUser)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState<PassengerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const driverId = authUser?.id
    if (!driverId) return
    setLoading(true)
    try {
      const { data: routeRow } = await supabase
        .from('routes')
        .select('origin, destination')
        .eq('id', routeId)
        .maybeSingle()
      setOrigin(routeRow?.origin ?? '')
      setDestination(routeRow?.destination ?? '')

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, seat_number, passenger:profiles!passenger_id(name)')
        .eq('route_id', routeId)
        .in('booking_status', ['completed', 'confirmed'])

      const bookingIds = (bookings ?? []).map((b: any) => b.id)
      let ratedSet = new Set<string>()
      if (bookingIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('booking_id')
          .eq('reviewer_id', driverId)
          .in('booking_id', bookingIds)
        ratedSet = new Set((reviews ?? []).map((r: any) => r.booking_id))
      }

      setPassengers(
        (bookings ?? []).map((b: any) => ({
          bookingId: b.id,
          name: b.passenger?.name || `Pasajero ${b.seat_number}`,
          seatNumber: b.seat_number ?? null,
          rating: 0,
          alreadyRated: ratedSet.has(b.id),
        }))
      )
    } catch {
      showError('No se pudieron cargar los pasajeros de esta ruta')
    } finally {
      setLoading(false)
    }
  }, [routeId, authUser?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const setRating = (bookingId: string, rating: number) => {
    setPassengers((prev) => prev.map((p) => (p.bookingId === bookingId ? { ...p, rating } : p)))
  }

  const pendingCount = passengers.filter((p) => !p.alreadyRated).length
  const readyToSubmit = passengers.some((p) => !p.alreadyRated && p.rating > 0)

  const handleSubmit = async () => {
    const toSubmit = passengers.filter((p) => !p.alreadyRated && p.rating > 0)
    if (toSubmit.length === 0) return
    setSubmitting(true)
    try {
      for (const p of toSubmit) {
        const saved = await createReview(p.bookingId, p.rating)
        if (!saved) throw new Error(`No se pudo calificar a ${p.name}`)
      }
      showSuccess(
        toSubmit.length === 1 ? 'Calificación enviada' : `${toSubmit.length} calificaciones enviadas`
      )
      navigation.goBack()
    } catch (error: any) {
      showError(error.message || 'Error al enviar las calificaciones')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="ChevronLeft" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Calificar pasajeros</Text>
          {!!origin && <Text style={s.subtitle} numberOfLines={1}>{origin} → {destination}</Text>}
        </View>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {passengers.length === 0 && (
              <Text style={s.emptyText}>No hay pasajeros para calificar en esta ruta.</Text>
            )}
            {passengers.map((p) => (
              <View key={p.bookingId} style={s.row}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.rowInfo}>
                  <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                  {p.alreadyRated ? (
                    <View style={s.ratedRow}>
                      <Icon name="CircleCheck" size={13} color={COLORS.success} />
                      <Text style={s.ratedText}>Ya calificado</Text>
                    </View>
                  ) : (
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(p.bookingId, star)} disabled={submitting} hitSlop={4}>
                          <Icon name="Star" size={24} color={star <= p.rating ? COLORS.accent : '#ddd'} style={s.star} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <Text style={s.footerHint}>
              {pendingCount === 0
                ? 'Ya calificaste a todos los pasajeros de esta ruta.'
                : 'Puedes calificar a quien quieras, no es obligatorio hacerlo a todos.'}
            </Text>
            <TouchableOpacity
              style={[s.submitBtn, !readyToSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!readyToSubmit || submitting}
            >
              {submitting ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={s.submitBtnText}>Enviar calificaciones</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.lg, gap: SPACING.md },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1, minWidth: 0, gap: SPACING.xs },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  starsRow: { flexDirection: 'row' },
  star: { marginRight: 4 },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratedText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  footer: {
    padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.sm,
  },
  footerHint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
})
