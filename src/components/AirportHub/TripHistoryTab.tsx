import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { supabase } from '../../services/supabase'

interface CompletedTrip {
  id: string
  origin: string
  destination: string
  price: number
  completedAt: string
  otherUserName: string
  userRole: 'conductor' | 'pasajero'
}

export default function TripHistoryTab() {
  const user = useAppStore((s) => s.user)
  const [trips, setTrips] = useState<CompletedTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const tripsList: CompletedTrip[] = []

      // 1️⃣ Viajes completados como conductor
      const { data: driverTrips } = await supabase
        .from('airport_requests')
        .select(
          `
          id,
          driver_id,
          passenger_id,
          origin,
          destination,
          offered_price,
          status,
          completed_at,
          profiles!passenger_id (name)
        `
        )
        .eq('driver_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50)

      if (driverTrips) {
        for (const trip of driverTrips) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            completedAt: trip.completed_at || '',
            otherUserName: (trip.profiles as any)?.name || 'Pasajero',
            userRole: 'conductor',
          })
        }
      }

      // 2️⃣ Viajes completados como pasajero
      const { data: passengerTrips } = await supabase
        .from('airport_requests')
        .select(
          `
          id,
          driver_id,
          passenger_id,
          origin,
          destination,
          offered_price,
          status,
          completed_at,
          profiles!driver_id (name)
        `
        )
        .eq('passenger_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50)

      if (passengerTrips) {
        for (const trip of passengerTrips) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            completedAt: trip.completed_at || '',
            otherUserName: (trip.profiles as any)?.name || 'Conductor',
            userRole: 'pasajero',
          })
        }
      }

      tripsList.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      setTrips(tripsList)
    } catch (err) {
      console.error('❌ Error loading history:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadHistory()
    }, [loadHistory])
  )

  const renderTripItem = ({ item: trip }: { item: CompletedTrip }) => (
    <TouchableOpacity style={styles.tripCard} activeOpacity={0.7}>
      <View style={styles.tripLeft}>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        </View>
      </View>

      <View style={styles.tripContent}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripUser}>{trip.otherUserName}</Text>
          <Text style={styles.tripBadge}>✅ Completado</Text>
        </View>

        <Text style={styles.tripRoute} numberOfLines={2}>
          {trip.origin} → {trip.destination}
        </Text>

        <View style={styles.tripFooter}>
          <Text style={styles.tripPrice}>${trip.price.toLocaleString('es-CO')}</Text>
          <Text style={styles.tripDate}>
            {new Date(trip.completedAt).toLocaleDateString('es-CO', {
              month: 'short',
              day: 'numeric',
              year: '2-digit',
            })}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin historial</Text>
      <Text style={styles.emptySubtitle}>
        Los viajes completados aparecerán aquí
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading && trips.length === 0 ? (
        <SkeletonList count={3} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  tripCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  tripLeft: {
    justifyContent: 'center',
  },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripContent: {
    flex: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tripUser: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
