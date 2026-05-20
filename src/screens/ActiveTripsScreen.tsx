import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { notifyTripCancellation } from '../services/pushNotifications'
import { insertNotificationForUser } from '../services/notificationInsert'
import { showSuccess, showError } from '../utils/showError'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { getTripUnreadCount, subscribeTripMessages } from '../services/trip_messages'

interface ActiveTrip {
  id: string
  bookingId: string
  origin: string
  destination: string
  departureTime: string
  departureTimeFormatted: string
  driverName: string
  driverId: string
  driverRating: number | null
  driverPhone: string
  vehicleInfo: string
  seatNumber: number
  price: number
  routeStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  dropoffPoint?: string
  dropoffPointCustom?: boolean
}

export default function ActiveTripsScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore(s => s.user)
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTripForChat, setSelectedTripForChat] = useState<ActiveTrip | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const msgChannelsRef = useRef<Map<string, () => void>>(new Map())

  useEffect(() => {
    if (user?.id) {
      loadActiveTrips()
    }
  }, [user?.id])

  // Recargar viajes cada vez que la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadActiveTrips()
      }
      return () => {
        msgChannelsRef.current.forEach((unsub) => unsub())
        msgChannelsRef.current.clear()
      }
    }, [user?.id])
  )

  const loadActiveTrips = async () => {
    try {
      setLoading(true)
      if (!user?.id) {
        setActiveTrips([])
        return
      }

      // Obtener bookings CONFIRMADOS del pasajero (viajes en los que ya reservó asientos)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
          id,
          booking_status,
          route_id,
          seat_number,
          price,
          dropoff_point,
          dropoff_point_custom,
          routes(
            id,
            origin,
            destination,
            departure_time,
            status,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vehicle_plate,
            driver_id,
            profiles(
              id,
              name,
              rating,
              phone
            )
          )
        `
        )
        .eq('passenger_id', user.id)
        .in('booking_status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false })

      if (bookingsError) throw bookingsError

      if (!bookings || bookings.length === 0) {
        setActiveTrips([])
        return
      }

      // Mostrar SOLO viajes que NO están completados o cancelados
      // Filtrar: ruta existe + status de ruta es activo + booking no está cancelado
      const formattedTrips: ActiveTrip[] = (bookings as any[])
        .filter((b) => {
          const route = b.routes
          const bookingStatus = b.booking_status
          // Mostrar si: 
          // 1. La ruta existe
          // 2. La ruta NO está completed o cancelled
          // 3. El booking NO está cancelled
          return (
            route && 
            !['completed', 'cancelled'].includes(route.status) &&
            bookingStatus !== 'cancelled'
          )
        })
        .map((booking: any) => {
          const route = booking.routes
          const driver = route?.profiles || {}
          const departureDate = new Date(route.departure_time)

          return {
            id: route.id,
            bookingId: booking.id,
            origin: route.origin || 'Origen desconocido',
            destination: route.destination || 'Destino desconocido',
            departureTime: route.departure_time,
            departureTimeFormatted: departureDate.toLocaleString('es-CO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            driverName: driver.name || 'Conductor',
            driverId: route.driver_id || '',
            driverRating: driver.rating || null,
            driverPhone: driver.phone || '',
            vehicleInfo: `${route.vehicle_make || ''} ${route.vehicle_model || ''} (${route.vehicle_plate || ''})`.trim(),
            seatNumber: booking.seat_number,
            price: booking.price,
            routeStatus: route.status,
            dropoffPoint: booking.dropoff_point,
            dropoffPointCustom: booking.dropoff_point_custom,
          }
        })

      setActiveTrips(formattedTrips)

      // Cargar unread counts y suscribir canales por viaje
      if (user?.id) {
        const counts: Record<string, number> = {}
        for (const trip of formattedTrips) {
          counts[trip.id] = await getTripUnreadCount(trip.id, user.id)
          if (!msgChannelsRef.current.has(trip.id)) {
            const unsub = subscribeTripMessages(trip.id, user.id, null, () => {
              setUnreadCounts((prev) => ({ ...prev, [trip.id]: (prev[trip.id] ?? 0) + 1 }))
            })
            msgChannelsRef.current.set(trip.id, unsub)
          }
        }
        setUnreadCounts(counts)
      }

    } catch (error) {
      console.error('Error loading active trips:', error)
      showError('Error cargando viajes activos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadActiveTrips()
  }

  const handleCancelTrip = (trip: ActiveTrip) => {
    Alert.alert(
      'Cancelar Viaje',
      `¿Deseas cancelar el viaje de ${trip.origin} a ${trip.destination}?`,
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => cancelTrip(trip),
        },
      ]
    )
  }

  const cancelTrip = async (trip: ActiveTrip) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', payment_status: 'refunded' })
        .eq('id', trip.bookingId)

      if (error) throw error

      // Notificar al conductor
      if (user?.id) {
        notifyTripCancellation(trip.bookingId, user.id, 'Cancelado por pasajero').catch(err => {
          console.warn('Error sending cancellation notification:', err)
        })
      }

      // Notificar al pasajero sobre el reembolso
      if (user?.id) {
        insertNotificationForUser(user.id, {
          user_id: user.id,
          type: 'refund',
          title: 'Reembolso procesado',
          message: `Tu reserva para ${trip.origin} → ${trip.destination} fue cancelada y el reembolso ha sido procesado.`,
          data: { booking_id: trip.bookingId, route_id: trip.id },
          is_read: false,
        }).catch(() => {})
      }

      showSuccess('Viaje cancelado exitosamente')

      // Recargar lista
      await loadActiveTrips()
    } catch (error) {
      console.error('Error cancelling trip:', error)
      showError('Error al cancelar viaje')
    }
  }

  const handleContactDriver = (trip: ActiveTrip) => {
    setUnreadCounts((prev) => ({ ...prev, [trip.id]: 0 }))
    setSelectedTripForChat(trip)
  }

  const handleTrackTrip = (trip: ActiveTrip) => {
    // Navegar a pantalla de estado del viaje
    navigation.navigate('TripStatus', { routeId: trip.id, bookingId: trip.bookingId })
  }

  const TripCard = ({ trip }: { trip: ActiveTrip }) => {
    return (
    <View style={styles.tripCard}>
      {/* Encabezado con estado */}
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: trip.routeStatus === 'in_progress' ? COLORS.success : COLORS.warning },
            ]}
          />
          <Text style={styles.statusText}>
            {trip.routeStatus === 'in_progress' ? 'En curso' : 'Por iniciar'}
          </Text>
        </View>
        <Text style={styles.timeText}>{trip.departureTimeFormatted}</Text>
      </View>

      {/* Ruta */}
      <View style={styles.routeSection}>
        <View style={styles.routePoint}>
          <Ionicons name="location-outline" size={16} color={COLORS.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Origen</Text>
            <Text style={styles.routeValue} numberOfLines={1}>
              {trip.origin}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <Ionicons name="location-outline" size={16} color={COLORS.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Destino</Text>
            <Text style={styles.routeValue} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
        </View>

        {trip.dropoffPoint && trip.dropoffPointCustom && (
          <View style={[styles.routePoint, { marginTop: SPACING.sm }]}>
            <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Punto de bajada personalizado</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {trip.dropoffPoint}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Información del conductor */}
      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <Ionicons name="person-circle" size={48} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.driverName}>{trip.driverName}</Text>
            <View style={styles.driverMeta}>
              {trip.driverRating !== null && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.ratingText}>{trip.driverRating.toFixed(1)}</Text>
                </View>
              )}
              <Text style={styles.vehicleText}>{trip.vehicleInfo}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => {
              if (trip.driverPhone) {
                Linking.openURL(`tel:${trip.driverPhone}`)
              } else {
                Alert.alert('Sin teléfono', 'El conductor no tiene número de teléfono registrado.')
              }
            }}
          >
            <Ionicons name="call" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Detalles del viaje */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <Ionicons name="car-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>Asiento: {trip.seatNumber}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>${trip.price.toLocaleString('es-CO')}</Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => handleContactDriver(trip)}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Contactar</Text>
          {(unreadCounts[trip.id] ?? 0) > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadCounts[trip.id] > 9 ? '9+' : unreadCounts[trip.id]}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => handleTrackTrip(trip)}>
          <Ionicons name="navigate-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Rastrear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={() => handleCancelTrip(trip)}>
          <Ionicons name="close-outline" size={18} color={COLORS.error} />
          <Text style={styles.dangerButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Viajes Activos</Text>
          <Text style={styles.subtitle}>En progreso o próximos</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando viajes activos...</Text>
        </View>
      ) : activeTrips.length === 0 ? (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="car-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin viajes activos</Text>
            <Text style={styles.emptyText}>No tienes viajes en progreso o próximos</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => navigation.navigate('Main', { screen: 'Search' })}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Buscar viajes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={activeTrips}
          keyExtractor={(item) => item.bookingId}
          renderItem={({ item }) => <TripCard trip={item} />}
          contentContainerStyle={styles.listContainer}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de mensajes del viaje */}
      {selectedTripForChat && (
        <TripMessagesModal
          visible={!!selectedTripForChat}
          tripId={selectedTripForChat.id}
          userId={user?.id || ''}
          otherUserId={selectedTripForChat.driverId}
          otherUserName={selectedTripForChat.driverName}
          onClose={() => setSelectedTripForChat(null)}
        />
      )}

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: 100,
  },

  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  timeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  routeSection: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  routePoint: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },

  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 7,
  },

  routeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },

  routeValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  driverSection: {
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  driverName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  driverMeta: {
    gap: SPACING.xs,
    marginTop: 4,
  },

  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },

  ratingText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  vehicleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },

  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },

  detailsSection: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  detailText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  actionsSection: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },

  primaryButtonText: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
  },

  chatBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  secondaryButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontWeight: '600',
  },

  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.error + '15',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  dangerButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.error,
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },

  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },

  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },

  searchButtonText: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
  },
})
