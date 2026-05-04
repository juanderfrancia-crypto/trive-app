import { useState, useEffect } from 'react'
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import RatingModal from '../components/RatingModal'
import { createReview, hasUserRated } from '../services/reviews'
import Toast from '../components/Toast'

export default function TripHistoryScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAppStore()
  const { getPassengerBookings, loading } = useBookings()
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all')
  const [tripHistory, setTripHistory] = useState<any[]>([])
  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null)
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  })
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await loadTripHistory()
    setRefreshing(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    loadTripHistory()
  }, [user])

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadTripHistory()
      }
    }, [user])
  )

  const loadTripHistory = async () => {
    try {
      const bookings = await getPassengerBookings(user!.id)
      const formatted = bookings.map((booking: any) => {
        const route = booking.routes || {}
        return {
          id: booking.id,
          origin: route.origin || 'Origen desconocido',
          destination: route.destination || 'Destino desconocido',
          date: route.departure_time ? new Date(route.departure_time).toISOString().split('T')[0] : '',
          time: route.departure_time
            ? new Date(route.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : '00:00',
          seats: booking.seat_number ? 1 : 0,
          price: booking.price || route.price_per_seat || 0,
          status: booking.booking_status || 'confirmed',
          routeStatus: route.status || 'scheduled',
          rating: route.driver_rating || null,
          driver: route.driver_name || 'Conductor',
          driver_id: route.driver_id || null,
          hasRated: false,
        }
      })

      const enriched = await Promise.all(
        formatted.map(async (trip) => {
          if (!trip.driver_id || trip.routeStatus !== 'completed') return trip
          const alreadyRated = await hasUserRated(trip.id, user!.id, trip.driver_id)
          return {
            ...trip,
            hasRated: alreadyRated,
          }
        })
      )

      setTripHistory(enriched)
    } catch (err) {
      console.error('Error loading trip history:', err)
      setTripHistory([])
    }
  }

  const filteredTrips = tripHistory.filter((trip) => {
    if (filter === 'all') return true
    if (filter === 'active')
      return trip.status !== 'cancelled' && ['scheduled', 'in_progress'].includes(trip.routeStatus)
    if (filter === 'completed')
      return trip.routeStatus === 'completed'
    if (filter === 'cancelled')
      return trip.status === 'cancelled' || trip.routeStatus === 'cancelled'
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const handleRateTrip = async (trip: any) => {
    if (!user) return
    if (trip.hasRated) {
      setToastConfig({
        visible: true,
        message: 'Ya has calificado este viaje.',
        type: 'info',
      })
      return
    }

    if (!trip.driver_id) {
      setToastConfig({
        visible: true,
        message: 'No se encontró el conductor del viaje para calificar.',
        type: 'error',
      })
      return
    }

    const alreadyRated = await hasUserRated(trip.id, user.id, trip.driver_id)
    if (alreadyRated) {
      setTripHistory((prev) =>
        prev.map((item) =>
          item.id === trip.id ? { ...item, hasRated: true } : item
        )
      )
      setToastConfig({
        visible: true,
        message: 'Ya has calificado este viaje.',
        type: 'info',
      })
      return
    }

    setSelectedTrip(trip)
    setRatingModalVisible(true)
  }

  const handleRatingSubmit = async (rating: number, comment: string, recommend: boolean) => {
    if (!selectedTrip || !user) return
    if (!selectedTrip.driver_id) {
      setToastConfig({
        visible: true,
        message: 'No se encontró el conductor del viaje para calificar.',
        type: 'error',
      })
      return
    }

    try {
      const alreadyRated = await hasUserRated(selectedTrip.id, user.id, selectedTrip.driver_id)
      if (alreadyRated) {
        setTripHistory((prev) =>
          prev.map((item) =>
            item.id === selectedTrip.id ? { ...item, hasRated: true } : item
          )
        )
        setToastConfig({
          visible: true,
          message: 'Ya has calificado este viaje.',
          type: 'info',
        })
        setRatingModalVisible(false)
        setSelectedTrip(null)
        return
      }

      const success = await createReview(
        selectedTrip.id,
        user.id,
        selectedTrip.driver_id,
        rating,
        comment || undefined,
        recommend
      )

      if (success) {
        setToastConfig({
          visible: true,
          message: `✓ Viaje calificado con ${rating} estrellas${recommend ? ' - ¡Recomendado!' : ''}`,
          type: 'success',
        })

        // Update the trip in local state to reflect rating
        setTripHistory(prev => prev.map(t => 
          t.id === selectedTrip.id ? { ...t, rating } : t
        ))

        setRatingModalVisible(false)
        setSelectedTrip(null)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      setToastConfig({
        visible: true,
        message: 'Error al enviar calificación',
        type: 'error',
      })
    }
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Historial de Viajes</Text>
            <Text style={styles.subtitle}>Tus viajes recientes</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'active', 'completed', 'cancelled'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'completed' ? 'Completados' : 'Cancelados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.content}>
            {[1, 2, 3].map((idx) => (
              <View key={idx} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '80%' }]} />
                <View style={[styles.skeletonLine, { width: '60%', marginTop: SPACING.md }]} />
              </View>
            ))}
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin viajes</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Aún no tienes viajes realizados'
                : filter === 'active'
                ? 'No hay viajes activos'
                : filter === 'completed'
                ? 'No hay viajes completados'
                : 'No hay viajes cancelados'}
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
            >
              <Ionicons name="search" size={20} color={COLORS.textInverse} />
              <Text style={styles.searchBtnText}>Buscar rutas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {filteredTrips.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                {/* Status Badge & Date */}
                <View style={styles.tripHeaderRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      trip.status === 'completed' ? styles.statusCompleted : styles.statusCancelled,
                    ]}
                  >
                    <Ionicons
                      name={trip.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={trip.status === 'completed' ? COLORS.success : COLORS.error}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: trip.status === 'completed' ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {trip.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </Text>
                  </View>
                  <Text style={styles.tripDate}>{formatDate(trip.date)} • {trip.time}</Text>
                </View>

                {/* Route Section */}
                <View style={styles.routeSection}>
                  <View style={styles.routePoint}>
                    <View style={styles.routeDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeLabel}>Origen</Text>
                      <Text style={styles.routeValue}>{trip.origin}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.routeArrow}>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textTertiary} />
                  </View>

                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotEnd]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeLabel}>Destino</Text>
                      <Text style={styles.routeValue}>{trip.destination}</Text>
                    </View>
                  </View>
                </View>

                {/* Trip Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailCard}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Hora</Text>
                    <Text style={styles.detailValue}>{trip.time}</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Precio</Text>
                    <Text style={styles.detailValue}>${trip.price.toLocaleString('es-CO')}</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Puestos</Text>
                    <Text style={styles.detailValue}>{trip.seats}</Text>
                  </View>
                </View>

                {/* Driver Info Section */}
                {trip.status === 'completed' && (
                  <View style={styles.driverSection}>
                    <View style={styles.driverCard}>
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>
                          {trip.driver.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverName}>{trip.driver}</Text>
                        {(trip.rating || trip.hasRated) && (
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={COLORS.warning} />
                            <Text style={styles.ratingText}>
                              {trip.rating ? trip.rating.toFixed(1) : 'Calificado'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {!trip.rating && !trip.hasRated && (
                      <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() => handleRateTrip(trip)}
                      >
                        <Ionicons name="star" size={18} color="#FFFFFF" />
                        <Text style={styles.rateBtnText}>Calificar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Repeat Button */}
                <TouchableOpacity
                  style={styles.repeatBtn}
                  onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="repeat" size={18} color={COLORS.primary} />
                  <Text style={styles.repeatBtnText}>Repetir ruta</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RatingModal
        visible={ratingModalVisible}
        userName={selectedTrip?.driver || 'Conductor'}
        onClose={() => {
          setRatingModalVisible(false)
          setSelectedTrip(null)
        }}
        onSubmit={handleRatingSubmit}
        isDriver={true}
      />

      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setToastConfig({ ...toastConfig, visible: false })}
      />
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
  backBtn: {
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  loadingContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skeletonHeader: {
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  searchBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: SPACING.md,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  statusCompleted: {
    backgroundColor: COLORS.success + '15',
  },
  statusCancelled: {
    backgroundColor: COLORS.error + '15',
  },
  statusText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  tripDate: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  /* Route Section */
  routeSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    flexShrink: 0,
  },
  routeDotEnd: {
    backgroundColor: COLORS.accent,
  },
  routeLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  routeValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  routeArrow: {
    paddingHorizontal: SPACING.xs,
  },

  /* Details Grid */
  detailsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  detailCard: {
    flex: 1,
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '15',
  },
  detailLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Driver Section */
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  driverCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  driverAvatarText: {
    ...TYPOGRAPHY.h4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  driverName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  ratingText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.warning,
    fontWeight: '700',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.warning,
    ...SHADOWS.md,
  },
  rateBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  repeatBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },
})
