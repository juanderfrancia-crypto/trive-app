import { useState, useCallback, useRef } from 'react'
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Text } from '../AppText'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import Illustration from '../illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonCardList } from '../SkeletonLoader'
import { supabase } from '../../services/supabase'
import type { HubTabProps } from './types'
import Icon from '../Icon'

interface CompletedTrip {
  id: string
  origin: string
  destination: string
  price: number
  completedAt: string
  otherUserName: string
  otherUserId: string
  hasRated: boolean
}

export default function TripHistoryTab({ isDriver }: HubTabProps) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const [trips, setTrips] = useState<CompletedTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const tripsList: CompletedTrip[] = []

      if (isDriver) {
        const { data: driverTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, origin, destination, offered_price, completed_at, passenger_id,
             profiles!passenger_id (name)`
          )
          .eq('driver_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50)

        for (const trip of driverTrips ?? []) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            completedAt: trip.completed_at || '',
            otherUserName: (trip.profiles as any)?.name || 'Pasajero',
            otherUserId: trip.passenger_id,
            hasRated: false,
          })
        }
      } else {
        const { data: passengerTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, origin, destination, offered_price, completed_at, driver_id,
             profiles!driver_id (name)`
          )
          .eq('passenger_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50)

        for (const trip of passengerTrips ?? []) {
          if (!trip.driver_id) continue
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            completedAt: trip.completed_at || '',
            otherUserName: (trip.profiles as any)?.name || 'Conductor',
            otherUserId: trip.driver_id,
            hasRated: false,
          })
        }
      }

      if (tripsList.length > 0) {
        const { data: ratings } = await supabase
          .from('trip_ratings')
          .select('trip_id')
          .eq('rater_id', user.id)
          .in('trip_id', tripsList.map((t) => t.id))
        const ratedIds = new Set((ratings ?? []).map((r) => r.trip_id))
        tripsList.forEach((t) => { t.hasRated = ratedIds.has(t.id) })
      }

      setTrips(tripsList)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, isDriver, refreshing])

  // El historial de viajes completados no cambia en segundos — se omite la
  // recarga si se vuelve a esta pestaña antes de este tiempo (el pull-to-refresh
  // manual, arriba, no pasa por aquí y siempre recarga).
  const FOCUS_RELOAD_THROTTLE_MS = 30000
  const lastLoadRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastLoadRef.current < FOCUS_RELOAD_THROTTLE_MS) return
      lastLoadRef.current = now
      loadHistory()
    }, [loadHistory])
  )

  const renderTripItem = ({ item: trip }: { item: CompletedTrip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripLeft}>
        <View style={styles.statusBadge}>
          <Icon name="CircleCheck" size={20} color={COLORS.success} />
        </View>
      </View>

      <View style={styles.tripContent}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripUser}>{trip.otherUserName}</Text>
          <Text style={styles.tripBadge}>Completado</Text>
        </View>
        <Text style={styles.tripRoute} numberOfLines={2}>
          {trip.origin} → {trip.destination}
        </Text>
        <View style={styles.tripFooter}>
          <Text style={styles.tripPrice}>${trip.price.toLocaleString('es-CO')}</Text>
          {trip.completedAt ? (
            <Text style={styles.tripDate}>
              {new Date(trip.completedAt).toLocaleDateString('es-CO', {
                month: 'short',
                day: 'numeric',
                year: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
        {trip.hasRated ? (
          <View style={styles.ratedRow}>
            <Icon name="CircleCheck" size={13} color={COLORS.success} />
            <Text style={styles.ratedText}>Calificado</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.rateBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RatingScreen', {
              tripId: trip.id,
              otherUserName: trip.otherUserName,
              ratedIsDriver: !isDriver,
            })}
          >
            <Icon name="Star" size={13} color={COLORS.primary} />
            <Text style={styles.rateBtnText}>{isDriver ? 'Calificar pasajero' : 'Calificar conductor'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="noData" width={160} />
      <Text style={styles.emptyTitle}>Sin historial</Text>
      <Text style={styles.emptySubtitle}>Tus viajes completados aparecerán aquí</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading && trips.length === 0 ? (
        <SkeletonCardList variant="history" count={3} />
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadHistory()
          }}
          scrollEnabled={trips.length > 0}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
  tripCard: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tripLeft: { justifyContent: 'center' },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripContent: { flex: 1 },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tripUser: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tripBadge: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  tripRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripDate: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textTertiary,
  },
  ratedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm,
  },
  ratedText: {
    fontSize: TYPOGRAPHY.size.xs, fontWeight: '600', color: COLORS.success,
  },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: SPACING.sm, backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.md, paddingVertical: SPACING.xs + 2,
  },
  rateBtnText: {
    fontSize: TYPOGRAPHY.size.sm, fontWeight: '700', color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
