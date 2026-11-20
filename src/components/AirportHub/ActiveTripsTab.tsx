import { useState, useCallback } from 'react'
import { View, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Text } from '../AppText'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme/theme'
import Illustration from '../illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonCardList } from '../SkeletonLoader'
import { TripDetailsModal } from '../TripDetailsModal'
import { supabase } from '../../services/supabase'
import { useAirportNegotiation } from '../../hooks/useAirportNegotiation'
import { showError } from '../../utils/showError'
import type { HubTabProps } from './types'
import { formatDeparture, formatPrice } from './formatters'

interface ActiveTrip {
  id: string
  origin: string
  destination: string
  price: number
  departureTime: string
  status: 'accepted' | 'in_progress'
  otherUserName: string
  otherUserAvatar: string | null
  otherUserId: string
}

export default function ActiveTripsTab({ isDriver }: HubTabProps) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { startTrip, completeTrip } = useAirportNegotiation()
  const [trips, setTrips] = useState<ActiveTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<ActiveTrip | null>(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)

  const loadTrips = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const tripsList: ActiveTrip[] = []

      if (isDriver) {
        const { data: driverTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, passenger_id, origin, destination, offered_price, departure_time, status,
             profiles!passenger_id (name, avatar_url)`
          )
          .eq('driver_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('departure_time', { ascending: true })

        for (const trip of driverTrips ?? []) {
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            departureTime: trip.departure_time,
            status: trip.status as ActiveTrip['status'],
            otherUserName: (trip.profiles as any)?.name || 'Pasajero',
            otherUserAvatar: (trip.profiles as any)?.avatar_url ?? null,
            otherUserId: trip.passenger_id,
          })
        }
      } else {
        const { data: passengerTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, driver_id, origin, destination, offered_price, departure_time, status,
             profiles!driver_id (name, avatar_url)`
          )
          .eq('passenger_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('departure_time', { ascending: true })

        for (const trip of passengerTrips ?? []) {
          if (!trip.driver_id) continue
          tripsList.push({
            id: trip.id,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            departureTime: trip.departure_time,
            status: trip.status as ActiveTrip['status'],
            otherUserName: (trip.profiles as any)?.name || 'Conductor',
            otherUserAvatar: (trip.profiles as any)?.avatar_url ?? null,
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

  const handleStart = async (trip: ActiveTrip) => {
    setStartingId(trip.id)
    try {
      await startTrip(trip.id)
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, status: 'in_progress' } : t)))
    } catch (err: any) {
      showError(err.message || 'No se pudo iniciar el viaje')
    } finally {
      setStartingId(null)
    }
  }

  const handleComplete = (trip: ActiveTrip) => {
    Alert.alert(
      'Marcar como completado',
      `¿Confirmas que el viaje con ${trip.otherUserName} ya se realizó? Pasará a tu historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setCompletingId(trip.id)
            try {
              await completeTrip(trip.id)
              setTrips((prev) => prev.filter((t) => t.id !== trip.id))
            } catch (err: any) {
              showError(err.message || 'No se pudo marcar como completado')
            } finally {
              setCompletingId(null)
            }
          },
        },
      ]
    )
  }

  const renderTripItem = ({ item: trip }: { item: ActiveTrip }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.when}>{formatDeparture(trip.departureTime)}</Text>
        <View style={styles.acceptedPill}>
          <Text style={styles.acceptedPillText}>{trip.status === 'in_progress' ? 'En curso' : 'Aceptada'}</Text>
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
          onPress={() => navigation.navigate('NegotiationChat', {
            requestId: trip.id,
            driverId: isDriver ? (user?.id ?? '') : trip.otherUserId,
            driverName: trip.otherUserName,
            otherUserId: trip.otherUserId,
          })}
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

      {isDriver && trip.status === 'accepted' && new Date(trip.departureTime).getTime() <= Date.now() && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleStart(trip)}
          disabled={startingId === trip.id}
          activeOpacity={0.85}
        >
          {startingId === trip.id ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.completeButtonText}>Iniciar viaje</Text>
          )}
        </TouchableOpacity>
      )}

      {isDriver && trip.status === 'in_progress' && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleComplete(trip)}
          disabled={completingId === trip.id}
          activeOpacity={0.85}
        >
          {completingId === trip.id ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.completeButtonText}>Marcar como completado</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="schedule" width={170} />
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
        <SkeletonCardList variant="trip" count={3} />
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
            status: selectedTrip.status,
            otherUserName: selectedTrip.otherUserName,
            otherUserAvatar: selectedTrip.otherUserAvatar ?? undefined,
            userRole: isDriver ? 'conductor' : 'pasajero',
          }}
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
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  acceptedPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.primary,
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
  completeButton: {
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
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
