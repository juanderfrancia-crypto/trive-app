import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { createReview } from '../services/reviews'
import RatingModal from '../components/RatingModal'
import Toast from '../components/Toast'

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
  completed: COLORS.success,
  cancelled: COLORS.error,
  scheduled: COLORS.primary,
  in_progress: COLORS.warning,
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completado',
  cancelled: 'Cancelado',
  confirmed: 'Confirmado',
  pending: 'Pendiente',
}

export default function TripHistoryScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAppStore()

  const [trips, setTrips] = useState<TripItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [ratingTrip, setRatingTrip] = useState<TripItem | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as any })

  // Carga inicial de IDs ocultos
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(HIDDEN_KEY).then((raw) => {
      setHiddenIds(raw ? new Set(JSON.parse(raw)) : new Set())
    })
    if (user?.id) loadTrips(user.id)
  }, [user?.id]))

  const loadTrips = async (passengerId: string) => {
    setLoading(true)
    try {
      // 1 query — solo los campos necesarios + nombre del conductor
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

      // 1 query batch para saber qué viajes ya calificó — sin N+1
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
        setToast({ visible: true, message: `Calificado con ${rating} estrellas`, type: 'success' })
      }
    } catch {
      setToast({ visible: true, message: 'Error al enviar calificación', type: 'error' })
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

  const renderItem = ({ item }: { item: TripItem }) => {
    const status = effectiveStatus(item)
    const accentColor = STATUS_COLOR[status] ?? COLORS.textSecondary
    const canRate = status === 'completed' && !item.hasRated && !!item.driverId

    return (
      <View style={s.row}>
        {/* Indicador de color */}
        <View style={[s.accent, { backgroundColor: accentColor }]} />

        {/* Contenido */}
        <View style={s.rowContent}>
          <View style={s.rowTop}>
            <Text style={s.route} numberOfLines={1}>
              {item.origin} → {item.destination}
            </Text>
            <Text style={s.price}>${item.price.toLocaleString('es-CO')}</Text>
          </View>

          <View style={s.rowBottom}>
            <Text style={s.meta} numberOfLines={1}>
              {item.driverName}
              {item.departureTime ? `  ·  ${formatDate(item.departureTime)}  ·  ${formatTime(item.departureTime)}` : ''}
            </Text>

            {canRate ? (
              <TouchableOpacity style={s.rateBtn} onPress={() => setRatingTrip(item)}>
                <Ionicons name="star" size={11} color="#fff" />
                <Text style={s.rateBtnText}>Calificar</Text>
              </TouchableOpacity>
            ) : (
              <View style={[s.statusChip, { backgroundColor: accentColor + '18' }]}>
                <Text style={[s.statusChipText, { color: accentColor }]}>
                  {STATUS_LABEL[status] ?? status}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Eliminar */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => hideTrip(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={15} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Historial de Viajes</Text>
          <Text style={s.subtitle}>Tus viajes recientes</Text>
        </View>
        {filtered.length > 0 && (
          <TouchableOpacity style={s.deleteAllBtn} onPress={hideAll}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={s.deleteAllText}>Eliminar todo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={s.filters}>
        {(['all', 'active', 'completed', 'cancelled'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'completed' ? 'Completados' : 'Cancelados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={52} color={COLORS.textTertiary} />
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
          ItemSeparatorComponent={() => <View style={s.separator} />}
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

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginTop: 2 },
  deleteAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  deleteAllText: { ...TYPOGRAPHY.labelSmall, color: COLORS.error, fontWeight: '600' },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },

  list: { paddingBottom: SPACING.xxxl },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: SPACING.lg + 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
  },
  accent: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: SPACING.md, marginLeft: SPACING.md },
  rowContent: { flex: 1, gap: 5 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  route: {
    flex: 1,
    fontSize: 14, fontWeight: '700', color: COLORS.textPrimary,
  },
  price: { fontSize: 14, fontWeight: '700', color: COLORS.primary, flexShrink: 0 },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  meta: {
    flex: 1,
    fontSize: 12, color: COLORS.textSecondary,
  },

  statusChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  statusChipText: { fontSize: 11, fontWeight: '600' },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  rateBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  deleteBtn: {
    width: 30, height: 30,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    flexShrink: 0,
  },
})
