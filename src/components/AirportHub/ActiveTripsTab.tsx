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
import { NegotiationChatModal } from '../NegotiationChatModal'
import { TripDetailsModal } from '../TripDetailsModal'
import { supabase } from '../../services/supabase'

interface ActiveTrip {
  id: string
  origin: string
  destination: string
  price: number
  status: string
  otherUserName: string
  otherUserId: string
  otherUserAvatar?: string
  userRole: 'conductor' | 'pasajero'
}

export default function ActiveTripsTab() {
  const user = useAppStore((s) => s.user)
  const [trips, setTrips] = useState<ActiveTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<ActiveTrip | null>(null)
  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)

  const loadTrips = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const tripsList: ActiveTrip[] = []

      // 1️⃣ Viajes como conductor
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
          profiles!passenger_id (name, avatar_url)
        `
        )
        .eq('driver_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })

      if (driverTrips) {
        for (const trip of driverTrips) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            status: trip.status,
            otherUserName: (trip.profiles as any)?.name || 'Pasajero',
            otherUserId: trip.passenger_id,
            otherUserAvatar: (trip.profiles as any)?.avatar_url,
            userRole: 'conductor',
          })
        }
      }

      // 2️⃣ Viajes como pasajero
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
          profiles!driver_id (name, avatar_url)
        `
        )
        .eq('passenger_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })

      if (passengerTrips) {
        for (const trip of passengerTrips) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            status: trip.status,
            otherUserName: (trip.profiles as any)?.name || 'Conductor',
            otherUserId: trip.driver_id,
            otherUserAvatar: (trip.profiles as any)?.avatar_url,
            userRole: 'pasajero',
          })
        }
      }

      setTrips(tripsList)
    } catch (err) {
      console.error('❌ Error loading trips:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadTrips()
    }, [loadTrips])
  )

  const handleDetailsPress = (trip: ActiveTrip) => {
    setSelectedTrip(trip)
    setDetailsModalVisible(true)
  }

  const handleChatPress = (trip: ActiveTrip) => {
    setSelectedTrip(trip)
    setChatModalVisible(true)
  }

  const renderTripItem = ({ item: trip }: { item: ActiveTrip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.tripUserSection}>
          <Text style={styles.tripUser}>{trip.otherUserName}</Text>
        </View>
        <View style={styles.tripStatusBadge}>
          <Ionicons 
            name={trip.status === 'accepted' ? 'checkmark-circle' : 'navigate-circle'} 
            size={16} 
            color={COLORS.white} 
          />
          <Text style={styles.tripStatus}>
            {trip.status === 'accepted' ? 'Aceptado' : 'En progreso'}
          </Text>
        </View>
      </View>

      <Text style={styles.tripRoute} numberOfLines={2}>
        {trip.origin} → {trip.destination}
      </Text>

      <Text style={styles.tripPrice}>${trip.price.toLocaleString('es-CO')}</Text>

      <View style={styles.tripActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.detailButton]}
          onPress={() => handleDetailsPress(trip)}
        >
          <Ionicons name="information-circle" size={14} color={COLORS.primary} />
          <Text style={styles.detailButtonText}>Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => handleChatPress(trip)}
        >
          <Ionicons name="chatbubble" size={14} color={COLORS.white} />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="car-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin viajes activos</Text>
      <Text style={styles.emptySubtitle}>
        Los viajes aceptados aparecerán aquí
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
            loadTrips()
          }}
          scrollEnabled={trips.length > 0}
        />
      )}

      {selectedTrip && (
        <>
          <TripDetailsModal
            visible={detailsModalVisible}
            onClose={() => {
              setDetailsModalVisible(false)
              setSelectedTrip(null)
            }}
            trip={selectedTrip}
          />
          <NegotiationChatModal
            visible={chatModalVisible}
            onClose={() => {
              setChatModalVisible(false)
              setSelectedTrip(null)
              loadTrips()
            }}
            requestId={selectedTrip.id}
            driverName={selectedTrip.otherUserName}
            otherUserId={selectedTrip.otherUserId}
          />
        </>
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
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  tripLeft: {
    justifyContent: 'center',
  },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: '#e3f2fd',
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
    gap: SPACING.md,
  },
  tripUserSection: {
    flex: 1,
  },
  tripUser: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  tripStatusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    minWidth: 120,
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  tripStatus: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  tripRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  tripPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  detailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
  },
  detailButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chatButton: {
    backgroundColor: COLORS.primary,
  },
  chatButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.white,
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
    backgroundColor: '#e3f2fd',
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
