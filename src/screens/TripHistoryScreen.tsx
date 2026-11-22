import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { showSuccess, showError } from '../utils/showError'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'

const HIDDEN_KEY = 'hidden_trip_history'

type FilterType = 'all' | 'active' | 'completed' | 'cancelled'

interface TripItem {
  id: string
  origin: string
  destination: string
  departureTime: string
  driverName: string
  driverId: string | null
  passengerCount: number
  price: number
  status: string
  routeStatus: string
  hasRated: boolean
}

const STATUS_COLOR: Record<string, string> = {
  completed: COLORS.white,
  cancelled: COLORS.error,
  scheduled: COLORS.primaryLight,
  in_progress: COLORS.warning,
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completado',
  cancelled: 'Cancelado',
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  scheduled: 'Programado',
  in_progress: 'En curso',
}

const STATUS_BG: Record<string, string> = {
  completed: COLORS.textPrimary,
  cancelled: COLORS.errorLight,
  scheduled: COLORS.primaryTint,
  in_progress: COLORS.warningLight,
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
]

export default function TripHistoryScreen({ embedded = false }: { embedded?: boolean }) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const isDriver = user?.role === 'driver'

  const [trips, setTrips] = useState<TripItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // Cambia de filtro y vuelve a la página 1 en el mismo toque (no en un
  // useEffect aparte) -- si no, se alcanza a pintar un instante la página
  // vieja sobre los datos del filtro nuevo antes de corregirse, y ese
  // parpadeo se siente como que tarda en cambiar.
  const selectFilter = (id: FilterType) => {
    setFilter(id)
    setPage(1)
  }

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(HIDDEN_KEY).then((raw) => {
      setHiddenIds(raw ? new Set(JSON.parse(raw)) : new Set())
    })
    if (user?.id) {
      if (isDriver) loadDriverRoutes(user.id)
      else loadTrips(user.id)
    }
  }, [user?.id, isDriver]))

  const loadTrips = async (passengerId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_status,
          price,
          routes:route_id (
            id,
            origin,
            destination,
            departure_time,
            status,
            price_per_seat,
            driver_id,
            profiles:driver_id ( name )
          )
        `)
        .eq('passenger_id', passengerId)
        .not('booking_status', 'eq', 'pending')
        .order('created_at', { ascending: false })

      if (error || !data) { setTrips([]); return }

      const completedBookingIds = (data as any[])
        .filter((b) => b.routes?.status === 'completed')
        .map((b) => b.id)

      let ratedSet = new Set<string>()
      if (completedBookingIds.length > 0) {
        const { data: ratedData } = await supabase
          .from('reviews')
          .select('booking_id')
          .eq('reviewer_id', passengerId)
          .in('booking_id', completedBookingIds)
        ratedSet = new Set((ratedData || []).map((r: any) => r.booking_id))
      }

      const formatted: TripItem[] = (data as any[]).map((b) => {
        const route = b.routes || {}
        return {
          id: b.id,
          origin: route.origin || 'Origen desconocido',
          destination: route.destination || 'Destino desconocido',
          departureTime: route.departure_time || '',
          driverName: route.profiles?.name || 'Conductor',
          driverId: route.driver_id || null,
          passengerCount: 0,
          price: b.price || route.price_per_seat || 0,
          status: b.booking_status,
          routeStatus: route.status || 'scheduled',
          hasRated: ratedSet.has(b.id),
        }
      })

      setTrips(formatted)
    } catch {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const loadDriverRoutes = async (driverId: string) => {
    setLoading(true)
    try {
      const { data: routes, error } = await supabase
        .from('routes')
        .select('id, origin, destination, departure_time, status, price_per_seat')
        .eq('driver_id', driverId)
        .in('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])
        .order('departure_time', { ascending: false })

      if (error || !routes) { setTrips([]); return }

      // Obtener conteo real de pasajeros desde bookings para cada ruta
      const routeIds = routes.map((r: any) => r.id)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, route_id, booking_status')
        .in('route_id', routeIds)
        .in('booking_status', ['completed', 'confirmed'])

      const passengersByRoute: Record<string, number> = {}
      const bookingIdsByRoute: Record<string, string[]> = {}
      ;(bookings ?? []).forEach((b: any) => {
        passengersByRoute[b.route_id] = (passengersByRoute[b.route_id] ?? 0) + 1
        ;(bookingIdsByRoute[b.route_id] ??= []).push(b.id)
      })

      // Para saber si ya calificó a todos los pasajeros de cada ruta (y no
      // mostrarle de nuevo el botón si ya terminó con esa ruta).
      const allBookingIds = (bookings ?? []).map((b: any) => b.id)
      const ratedBookingIds = new Set<string>()
      if (allBookingIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('booking_id')
          .eq('reviewer_id', driverId)
          .in('booking_id', allBookingIds)
        ;(reviews ?? []).forEach((rv: any) => ratedBookingIds.add(rv.booking_id))
      }

      const formatted: TripItem[] = routes.map((r: any) => {
        const count = passengersByRoute[r.id] ?? 0
        const routeBookingIds = bookingIdsByRoute[r.id] ?? []
        const allRated = routeBookingIds.length > 0 && routeBookingIds.every((id) => ratedBookingIds.has(id))
        return {
          id:            r.id,
          origin:        r.origin,
          destination:   r.destination,
          departureTime: r.departure_time,
          driverName:    `${count} pasajero${count !== 1 ? 's' : ''}`,
          driverId:      null,
          passengerCount: count,
          price:         r.price_per_seat * count,
          status:        r.status,
          routeStatus:   r.status,
          hasRated:      allRated,
        }
      })

      setTrips(formatted)
    } catch {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const saveHidden = async (ids: Set<string>) => {
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]))
  }

  const hideTrip = (id: string) => {
    Alert.alert(
      'Eliminar del historial',
      '¿Quieres eliminar este viaje de tu historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => {
            const next = new Set(hiddenIds)
            next.add(id)
            setHiddenIds(next)
            saveHidden(next)
          },
        },
      ]
    )
  }

  const hideAll = () => {
    Alert.alert(
      'Eliminar todo',
      '¿Quieres eliminar todos los viajes visibles?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo', style: 'destructive',
          onPress: () => {
            const next = new Set(hiddenIds)
            filtered.forEach((t) => next.add(t.id))
            setHiddenIds(next)
            saveHidden(next)
          },
        },
      ]
    )
  }

  const filtered = trips.filter((t) => {
    if (hiddenIds.has(t.id)) return false
    if (filter === 'active') return ['scheduled', 'in_progress'].includes(t.routeStatus) && t.status !== 'cancelled'
    if (filter === 'completed') return t.routeStatus === 'completed'
    if (filter === 'cancelled') return t.status === 'cancelled' || t.routeStatus === 'cancelled'
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedTrips = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const formatTime = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const effectiveStatus = (trip: TripItem) =>
    trip.status === 'cancelled' ? 'cancelled' : trip.routeStatus

  const renderItem = ({ item }: { item: TripItem }) => {
    const status = effectiveStatus(item)
    const accentColor = STATUS_COLOR[status] ?? COLORS.textSecondary
    const statusBg = STATUS_BG[status] ?? COLORS.surfaceAlt
    const canRate = status === 'completed' && !item.hasRated && !!item.driverId
    const canRatePassengers = isDriver && status === 'completed' && !item.hasRated && item.passengerCount > 0

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.routeRow}>
            <Text style={s.routeText} numberOfLines={1}>{item.origin}</Text>
            <Icon name="ArrowRight" size={13} color={COLORS.textTertiary} />
            <Text style={s.routeText} numberOfLines={1}>{item.destination}</Text>
          </View>
          <View style={s.cardHeaderRight}>
            <Text style={s.price}>
              {isDriver && item.price === 0 ? '—' : `$${item.price.toLocaleString('es-CO')}`}
            </Text>
            <TouchableOpacity
              style={s.deleteIconBtn}
              onPress={() => hideTrip(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="X" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.metaRow}>
          <Icon name={isDriver ? 'Users' : 'User'} size={12} color={COLORS.textTertiary} />
          <Text style={s.metaText} numberOfLines={1}>{item.driverName}</Text>
          {item.departureTime ? (
            <>
              <View style={s.metaDot} />
              <Icon name="Calendar" size={12} color={COLORS.textTertiary} />
              <Text style={s.metaText}>{formatDate(item.departureTime)}</Text>
              <View style={s.metaDot} />
              <Icon name="Clock" size={12} color={COLORS.textTertiary} />
              <Text style={s.metaText}>{formatTime(item.departureTime)}</Text>
            </>
          ) : null}
        </View>

        <View style={s.bottomRow}>
          <View style={[s.statusChip, { backgroundColor: statusBg }]}>
            <View style={[s.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[s.statusText, { color: accentColor }]}>
              {STATUS_LABEL[status] ?? status}
            </Text>
          </View>

          {!isDriver && canRate ? (
            <TouchableOpacity
              style={s.rateBtn}
              onPress={() => navigation.navigate('RatingScreen', { bookingId: item.id, otherUserName: item.driverName })}
              activeOpacity={0.85}
            >
              <Icon name="Star" size={12} color={COLORS.white} />
              <Text style={s.rateBtnText}>Calificar conductor</Text>
            </TouchableOpacity>
          ) : !isDriver && item.hasRated ? (
            <View style={s.ratedBadge}>
              <Icon name="CircleCheck" size={12} color={COLORS.primary} />
              <Text style={s.ratedText}>Calificado</Text>
            </View>
          ) : canRatePassengers ? (
            <TouchableOpacity
              style={s.rateBtn}
              onPress={() => navigation.navigate('RatePassengers', { routeId: item.id })}
              activeOpacity={0.85}
            >
              <Icon name="Star" size={12} color={COLORS.white} />
              <Text style={s.rateBtnText}>Calificar pasajeros</Text>
            </TouchableOpacity>
          ) : isDriver && status === 'completed' && item.hasRated ? (
            <View style={s.ratedBadge}>
              <Icon name="CircleCheck" size={12} color={COLORS.primary} />
              <Text style={s.ratedText}>Calificados</Text>
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  const emptyText = filter === 'all' ? 'Aún no tienes viajes registrados'
    : filter === 'active' ? 'No tienes viajes activos'
    : filter === 'completed' ? 'No tienes viajes completados'
    : 'No tienes viajes cancelados'

  return (
    <SafeAreaView style={s.safe} edges={embedded ? [] : ['top', 'left', 'right']}>

      {!embedded && <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{isDriver ? 'Mis rutas' : 'Historial de Viajes'}</Text>
        {filtered.length > 0 ? (
          <TouchableOpacity style={[s.headerBtn, s.headerBtnDanger]} onPress={hideAll} activeOpacity={0.7}>
            <Icon name="Trash2" size={16} color={COLORS.error} />
          </TouchableOpacity>
        ) : (
          <View style={s.headerBtnPlaceholder} />
        )}
      </View>}

      <View style={s.filters}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => selectFilter(f.id)}
              style={[s.filterChip, isActive && s.filterChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, isActive && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Cargando viajes...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Illustration name="noData" width={170} />
          <Text style={s.emptyTitle}>Sin viajes</Text>
          <Text style={s.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={pagedTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="ChevronLeft" size={18} color={page === 1 ? COLORS.textTertiary : COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={s.pageText}>Página {page} de {totalPages}</Text>
                <TouchableOpacity
                  style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Icon name="ChevronRight" size={18} color={page === totalPages ? COLORS.textTertiary : COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnDanger: { backgroundColor: COLORS.errorLight },
  headerBtnPlaceholder: { width: 40, height: 40 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800' },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },

  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },

  // Antes era una tarjeta flotante (sombra + borde + esquinas redondeadas),
  // ahora son filas planas separadas por una línea delgada -- mismo contenido,
  // más liviano, igual que el resto de listas de la app.
  card: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 },
  deleteIconBtn: { padding: 2 },
  // Origen y destino en una sola línea (antes apiladas en dos, dejando la mitad
  // derecha de la segunda línea vacía -- se sentía "ancho"/desaprovechado).
  routeRow: { flex: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { ...TYPOGRAPHY.bodySmall, flexShrink: 1, fontWeight: '700', color: COLORS.textPrimary },
  price: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.primary, flexShrink: 0 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textTertiary },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  rateBtnText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.white },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
  },
  ratedText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loadingText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '500' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
})
