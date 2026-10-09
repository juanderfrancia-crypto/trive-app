import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert, ActivityIndicator } from 'react-native'
import { Text } from '../../components/AppText'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../theme/theme'
import Illustration from '../../components/illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../services/supabase'
import { showError } from '../../utils/showError'

type Tab = 'live' | 'scheduled' | 'history'

type Booking = {
  id: string
  seat_number: number
  payment_method: string | null
  booking_status: string
  passenger: { name: string | null } | null
}

type Route = {
  id: string
  origin: string
  destination: string
  departure_time: string
  price_per_seat: number
  total_seats: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  bookings: Booking[]
}

const ACTIVE_BOOKING = ['confirmed', 'awaiting_confirmation', 'completed', 'disputed']

const TABS: { key: Tab; label: string }[] = [
  { key: 'live', label: 'En curso' },
  { key: 'scheduled', label: 'Programados' },
  { key: 'history', label: 'Historial' },
]

const PAYMENT_LABEL: Record<string, string> = { cash: 'Efectivo', digital: 'Transferencia', transfer: 'Transferencia' }

const STATUS_LABEL: Record<Route['status'], { label: string; bg: string; color: string }> = {
  in_progress: { label: 'En curso', bg: COLORS.primaryTint, color: COLORS.primary },
  scheduled: { label: 'Programado', bg: COLORS.surfaceAlt, color: COLORS.textSecondary },
  completed: { label: 'Completado', bg: COLORS.successLight, color: COLORS.success },
  cancelled: { label: 'Cancelado', bg: COLORS.errorLight, color: COLORS.error },
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

function initialsOf(name: string | null | undefined) {
  return (name ?? 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function DriverTripsScreen() {
  const user = useAppStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('live')
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyRouteId, setBusyRouteId] = useState<string | null>(null)

  const fetchRoutes = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('routes')
      .select(`
        id, origin, destination, departure_time, price_per_seat, total_seats, status,
        bookings(id, seat_number, payment_method, booking_status, passenger:profiles!passenger_id(name))
      `)
      .eq('driver_id', user.id)
      .order('departure_time', { ascending: false })
      .limit(100)
    if (error) {
      showError('No se pudieron cargar tus viajes')
    } else {
      setRoutes((data as unknown as Route[]) ?? [])
    }
    setLoading(false)
    setRefreshing(false)
  }, [user?.id])

  useFocusEffect(useCallback(() => {
    fetchRoutes()
  }, [fetchRoutes]))

  const visible = routes.filter((r) => {
    if (tab === 'live') return r.status === 'in_progress'
    if (tab === 'scheduled') return r.status === 'scheduled'
    return r.status === 'completed' || r.status === 'cancelled'
  })

  const changeStatus = async (route: Route, status: 'in_progress' | 'completed' | 'cancelled') => {
    setBusyRouteId(route.id)

    // Cancelar usa una función aparte porque es la única que decide si se
    // devuelven los $2.000 de publicación (sin reservas, antes de salir, y
    // dentro del límite diario de devoluciones) y explica el motivo al conductor.
    if (status === 'cancelled') {
      const { data, error } = await supabase.rpc('driver_cancel_route', { p_route_id: route.id })
      setBusyRouteId(null)
      if (error) {
        showError(error.message || 'No se pudo cancelar el viaje')
        return
      }
      const result = data as { refunded: boolean; message: string }
      Alert.alert('Viaje cancelado', result.message)
      fetchRoutes()
      return
    }

    const { error } = await supabase.rpc('driver_set_route_status', { p_route_id: route.id, p_status: status })
    setBusyRouteId(null)
    if (error) {
      showError(error.message || 'No se pudo actualizar el viaje')
      return
    }
    fetchRoutes()
  }

  const confirmChange = (route: Route, status: 'in_progress' | 'completed' | 'cancelled', title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Confirmar', style: status === 'cancelled' ? 'destructive' : 'default', onPress: () => changeStatus(route, status) },
    ])
  }

  const renderCard = ({ item: route }: { item: Route }) => {
    const active = route.bookings.filter((b) => ACTIVE_BOOKING.includes(b.booking_status))
    const total = active.length * route.price_per_seat
    const badge = STATUS_LABEL[route.status]
    const busy = busyRouteId === route.id
    return (
      <View style={[styles.card, route.status === 'in_progress' && styles.cardLive]}>
        <View style={styles.cardTop}>
          <Text style={styles.when}>{formatWhen(route.departure_time)}</Text>
          <View style={[styles.pill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.pillText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.route} numberOfLines={1}>{route.origin} → {route.destination}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{active.length} de {route.total_seats} cupos reservados</Text>
          <Text style={styles.amount}>${total.toLocaleString('es-CO')}</Text>
        </View>

        {active.length > 0 && (
          <View style={styles.passengers}>
            {active.map((b) => (
              <View key={b.id} style={styles.passengerRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(b.passenger?.name)}</Text></View>
                <Text style={styles.passengerName} numberOfLines={1}>{b.passenger?.name ?? 'Pasajero'}</Text>
                <Text style={styles.passengerMeta}>
                  Asiento {b.seat_number} · {PAYMENT_LABEL[b.payment_method ?? 'cash'] ?? 'Efectivo'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {route.status === 'scheduled' && (
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnBusy]}
            disabled={busy}
            onPress={() => confirmChange(route, 'in_progress', 'Iniciar viaje', '¿Empezó el recorrido?')}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Iniciar viaje</Text>}
          </TouchableOpacity>
        )}

        {route.status === 'in_progress' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }, busy && styles.btnBusy]}
              disabled={busy}
              onPress={() => confirmChange(route, 'completed', 'Completar viaje', 'Los pasajeros confirmarán su llegada después.')}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Completar viaje</Text>}
            </TouchableOpacity>
          </View>
        )}

        {route.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            disabled={busy}
            onPress={() => confirmChange(route, 'cancelled', 'Cancelar viaje', 'Se cancelará la ruta para los pasajeros reservados.')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Cancelar viaje</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading ? [] : visible}
        keyExtractor={(route) => route.id}
        renderItem={renderCard}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoutes() }} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Mis viajes</Text>
            <Text style={styles.subtitle}>Tus rutas publicadas</Text>
            <View style={styles.segmented}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.segment, tab === t.key && styles.segmentActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
          ) : (
            <View style={styles.empty}>
              <Illustration name={tab === 'scheduled' ? 'schedule' : 'noData'} width={160} />
              <Text style={styles.emptyTitle}>
                {tab === 'live' ? 'No tienes viajes en curso' : tab === 'scheduled' ? 'No tienes viajes programados' : 'Aún no tienes historial'}
              </Text>
              <Text style={styles.emptyText}>
                {tab === 'scheduled' ? 'Publica una ruta desde Inicio para empezar.' : 'Aquí aparecerán tus viajes cuando avances.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {},
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },
  segmented: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.xs, marginTop: SPACING.lg },
  segment: { flex: 1, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: COLORS.white },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { fontWeight: '800', color: COLORS.primary },

  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  center: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
  empty: { paddingVertical: SPACING.xxxl, alignItems: 'center', gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  card: { ...SHADOWS.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg },
  cardLive: { borderColor: COLORS.primary, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  when: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pill: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  pillText: { fontSize: 13, fontWeight: '700' },
  route: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  passengers: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.sm },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  passengerName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  passengerMeta: { fontSize: 13, color: COLORS.textSecondary },

  primaryBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    marginTop: SPACING.md, height: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  btnBusy: { opacity: 0.7 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  secondaryBtn: { marginTop: SPACING.sm, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
})
