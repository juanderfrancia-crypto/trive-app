import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { NegotiationChatModal } from '../NegotiationChatModal'
import { TripDetailsModal } from '../TripDetailsModal'
import { supabase } from '../../services/supabase'
import type { HubTabProps } from './types'
import { formatDeparture, formatPrice } from './formatters'

interface ActiveTrip {
  id: string
  origin: string
  destination: string
  price: number
  departureTime: string
  otherUserName: string
  otherUserId: string
}

export default function ActiveTripsTab({ isDriver }: HubTabProps) {
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

      if (isDriver) {
        const { data: driverTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, passenger_id, origin, destination, offered_price, departure_time,
             profiles!passenger_id (name)`
          )
          .eq('driver_id', user.id)
          .eq('status', 'accepted')
          .order('departure_time', { ascending: true })

        for (const trip of driverTrips ?? []) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            departureTime: trip.departure_time,
            otherUserName: (trip.profiles as any)?.name || 'Pasajero',
            otherUserId: trip.passenger_id,
          })
        }
      } else {
        const { data: passengerTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, driver_id, origin, destination, offered_price, departure_time,
             profiles!driver_id (name)`
          )
          .eq('passenger_id', user.id)
          .eq('status', 'accepted')
          .order('departure_time', { ascending: true })

        for (const trip of passengerTrips ?? []) {
          if (!trip.driver_id) continue
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            departureTime: trip.departure_time,
            otherUserName: (trip.profiles as any)?.name || 'Conductor',
            otherUserId: trip.driver_id,
          })
        }
      }

      setTrips(tripsList)
    } catch (err) {
      console.error('Error loading trips:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, isDriver, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadTrips()
    }, [loadTrips])
  )

  const renderTripItem = ({ item: trip }: { item: ActiveTrip }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.when}>{formatDeparture(trip.departureTime)}</Text>
        <View style={styles.acceptedPill}>
          <Text style={styles.acceptedPillText}>Aceptada</Text>
        </View>
      </View>

      <Text style={styles.route} numberOfLines={2}>
        {trip.origin} → {trip.destination}
      </Text>
      <Text style={styles.meta}>
        {isDriver
          ? `Pasajero: ${trip.otherUserName} · Acordado ${formatPrice(trip.price)}`
          : `Conductor: ${trip.otherUserName} · Acordado ${formatPrice(trip.price)}`}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => {
            setSelectedTrip(trip)
            setChatModalVisible(true)
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.chatButtonText}>{isDriver ? 'Abrir chat' : 'Chatear'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => {
            setSelectedTrip(trip)
            setDetailsModalVisible(true)
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.detailButtonText}>Ver detalle</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Sin viajes aceptados</Text>
      <Text style={styles.emptySubtitle}>
        {isDriver
          ? 'Los viajes que aceptes aparecerán aquí'
          : 'Cuando un conductor confirme tu solicitud, la verás aquí'}
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
            trip={{
              id: selectedTrip.id,
              origin: selectedTrip.origin,
              destination: selectedTrip.destination,
              price: selectedTrip.price,
              status: 'accepted',
              otherUserName: selectedTrip.otherUserName,
              userRole: isDriver ? 'conductor' : 'pasajero',
            }}
          />
          <NegotiationChatModal
            visible={chatModalVisible}
            onClose={() => {
              setChatModalVisible(false)
              setSelectedTrip(null)
              loadTrips()
            }}
            requestId={selectedTrip.id}
            driverId={isDriver ? (user?.id ?? '') : selectedTrip.otherUserId}
            driverName={selectedTrip.otherUserName}
            otherUserId={selectedTrip.otherUserId}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  when: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  acceptedPill: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  acceptedPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.success,
  },
  route: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  chatButton: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailButton: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
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
