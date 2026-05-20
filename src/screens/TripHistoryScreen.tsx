import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { createReview } from '../services/reviews'
import RatingModal from '../components/RatingModal'
import { showSuccess, showError } from '../utils/showError'

const HIDDEN_KEY = 'hidden_trip_history'

type FilterType = 'all' | 'active' | 'completed' | 'cancelled'

interface TripItem {
  id: string
  origin: string
  destination: string
  departureTime: string
  driverName: string
  driverId: string | null
  price: number
  status: string
  routeStatus: string
  hasRated: boolean
}

const STATUS_COLOR: Record<string, string> = {
  completed: '#10B981',
  cancelled: COLORS.error,
  scheduled: '#1A3FCC',
  in_progress: '#F59E0B',
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
  completed: '#ECFDF5',
  cancelled: '#FEF2F2',
  scheduled: '#EEF2FF',
  in_progress: '#FFFBEB',
}

export default function TripHistoryScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const isDriver = user?.role === 'driver'

  const [trips, setTrips] = useState<TripItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [ratingTrip, setRatingTrip] = useState<TripItem | null>(null)

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
        .in('status', ['completed', 'cancelled'])
        .order('departure_time', { ascending: false })

      if (error || !routes) { setTrips([]); return }

      // Obtener conteo real de pasajeros desde bookings para cada ruta
      const routeIds = routes.map((r: any) => r.id)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('route_id, booking_status')
        .in('route_id', routeIds)
        .in('booking_status', ['completed', 'confirmed'])

      const passengersByRoute: Record<string, number> = {}
      ;(bookings ?? []).forEach((b: any) => {
        passengersByRoute[b.route_id] = (passengersByRoute[b.route_id] ?? 0) + 1
      })

      const formatted: TripItem[] = routes.map((r: any) => {
        const count = passengersByRoute[r.id] ?? 0
        return {
          id:            r.id,
          origin:        r.origin,
          destination:   r.destination,
          departureTime: r.departure_time,
          driverName:    `${count} pasajero${count !== 1 ? 's' : ''}`,
          driverId:      null,
          price:         r.price_per_seat * count,
          status:        r.status,
          routeStatus:   r.status,
          hasRated:      false,
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

  const handleRatingSubmit = async (rating: number, comment: string, recommend: boolean) => {
    if (!ratingTrip || !user) return
    try {
      const result = await createReview(
        ratingTrip.id, user.id, ratingTrip.driverId!, rating,
        comment || undefined, recommend,
      )
      if (result) {
        setTrips((prev) => prev.map((t) =>
          t.id === ratingTrip.id ? { ...t, hasRated: true } : t
        ))
        showSuccess(`Calificado con ${rating} estrellas`)
      }
    } catch {
      showError('Error al enviar calificación')
    } finally {
      setRatingTrip(null)
    }
  }

  const filtered = trips.filter((t) => {
    if (hiddenIds.has(t.id)) return false
    if (filter === 'active') return ['scheduled', 'in_progress'].includes(t.routeStatus) && t.status !== 'cancelled'
    if (filter === 'completed') return t.routeStatus === 'completed'
    if (filter === 'cancelled') return t.status === 'cancelled' || t.routeStatus === 'cancelled'
    return true
  })

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

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'completed', label: 'Completados' },
    { id: 'cancelled', label: 'Cancelados' },
  ]

  const renderItem = ({ item }: { item: TripItem }) => {
    const status = effectiveStatus(item)
    const accentColor = STATUS_COLOR[status] ?? COLORS.textSecondary
    const statusBg = STATUS_BG[status] ?? '#F4F6FF'
    const canRate = status === 'completed' && !item.hasRated && !!item.driverId

    return (
      <View style={s.card}>
        {/* Ícono de ruta */}
        <LinearGradient
          colors={['#0E2699', '#1230B8', '#1A3FCC']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.routeIcon}
        >
          <Ionicons name="navigate" size={18} color="#fff" />
        </LinearGradient>

        {/* Contenido */}
        <View style={s.cardContent}>
          {/* Ruta */}
          <View style={s.routeRow}>
            <View style={s.routePoints}>
              <View style={s.routePoint}>
                <View style={s.dotOrigin} />
                <Text style={s.routeText} numberOfLines={1}>{item.origin}</Text>
              </View>
              <View style={s.routeLine} />
              <View style={s.routePoint}>
                <View style={s.dotDest} />
                <Text style={s.routeText} numberOfLines={1}>{item.destination}</Text>
              </View>
            </View>
            <Text style={s.price}>
              {isDriver && item.price === 0 ? '—' : `$${item.price.toLocaleString('es-CO')}`}
            </Text>
          </View>

          {/* Meta info */}
          <View style={s.metaRow}>
            <Ionicons name={isDriver ? 'people-outline' : 'person-outline'} size={12} color={COLORS.textTertiary} />
            <Text style={s.metaText} numberOfLines={1}>{item.driverName}</Text>
            {item.departureTime ? (
              <>
                <View style={s.metaDot} />
                <Ionicons name="calendar-outline" size={12} color={COLORS.textTertiary} />
                <Text style={s.metaText}>{formatDate(item.departureTime)}</Text>
                <View style={s.metaDot} />
                <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                <Text style={s.metaText}>{formatTime(item.departureTime)}</Text>
              </>
            ) : null}
          </View>

          {/* Fila inferior: status + acción */}
          <View style={s.bottomRow}>
            <View style={[s.statusChip, { backgroundColor: statusBg }]}>
              <View style={[s.statusDot, { backgroundColor: accentColor }]} />
              <Text style={[s.statusText, { color: accentColor }]}>
                {STATUS_LABEL[status] ?? status}
              </Text>
            </View>

            {!isDriver && canRate ? (
              <TouchableOpacity onPress={() => setRatingTrip(item)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.rateBtn}
                >
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={s.rateBtnText}>Calificar conductor</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : !isDriver && item.hasRated ? (
              <View style={s.ratedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={s.ratedText}>Calificado</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Eliminar */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => hideTrip(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={14} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1230B8" />
        </TouchableOpacity>
        <Text style={s.title}>{isDriver ? 'Historial de Rutas' : 'Historial de Viajes'}</Text>
        {filtered.length > 0 ? (
          <TouchableOpacity style={s.deleteAllBtn} onPress={hideAll}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        ) : (
          <View style={s.headerIconBtn} />
        )}
      </View>

      {/* Filtros */}
      <View style={s.filters}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={s.filterWrap}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.filterChip}
                >
                  <Text style={[s.filterText, s.filterTextActive]}>{f.label}</Text>
                </LinearGradient>
              ) : (
                <View style={s.filterChip}>
                  <Text style={s.filterText}>{f.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#1230B8" />
          <Text style={s.loadingText}>Cargando viajes...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <LinearGradient
            colors={['#EEF2FF', '#E4EBFF']}
            style={s.emptyIconWrap}
          >
            <Ionicons name="receipt-outline" size={32} color="#1A3FCC" />
          </LinearGradient>
          <Text style={s.emptyTitle}>Sin viajes</Text>
          <Text style={s.emptyText}>
            {filter === 'all' ? 'Aún no tienes viajes registrados'
              : filter === 'active' ? 'No tienes viajes activos'
              : filter === 'completed' ? 'No tienes viajes completados'
              : 'No tienes viajes cancelados'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {ratingTrip && (
        <RatingModal
          visible
          userName={ratingTrip.driverName}
          isDriver
          onClose={() => setRatingTrip(null)}
          onSubmit={handleRatingSubmit}
        />
      )}

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F4F6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E0FF',
  },
  headerIconBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0E1A4A',
  },
  deleteAllBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.error + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error + '25',
  },

  // Filtros
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterWrap: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D6E0FF',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },

  // Lista
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
    gap: SPACING.md,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9EBF2',
    shadowColor: '#0E2699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: SPACING.md,
  },
  routeIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },

  // Ruta
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  routePoints: {
    flex: 1,
    gap: 3,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotOrigin: {
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1A3FCC',
    flexShrink: 0,
  },
  dotDest: {
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    flexShrink: 0,
  },
  routeLine: {
    width: 2,
    height: 8,
    backgroundColor: '#D6E0FF',
    marginLeft: 2.5,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0E1A4A',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1230B8',
    flexShrink: 0,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  metaDot: {
    width: 3, height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textTertiary,
  },

  // Fila inferior
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  rateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: '#ECFDF5',
  },
  ratedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },

  // Botón eliminar
  deleteBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: '#F4F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Estados
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 72, height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0E1A4A',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
