import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAvailableRides } from '../hooks/useAvailableRides'
import { useAppStore } from '../store/useAppStore'

export default function AvailableRidesScreen() {
  const navigation = useNavigation()
  const { rides, loading, error, refetch } = useAvailableRides()
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const authUser         = useAppStore((s) => s.authUser)
  const [refreshing, setRefreshing] = useState(false)

  // 🔄 Refetch whenever the screen is focused (e.g., returning from SeatSelection)
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleReserve = (ride: any) => {
    if (!authUser) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reservar un viaje.', [
        { text: 'Aceptar', onPress: () => navigation.navigate('Login' as never) },
      ])
      return
    }

    // Set selected route in store
    setSelectedRoute(ride)

    // Navigate to seat selection
    navigation.navigate('SeatSelection' as never)
  }

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }, [])

  const getMinutesUntilDeparture = useCallback((dateString: string) => {
    const diffMins = Math.round((new Date(dateString).getTime() - Date.now()) / 60000)
    if (diffMins < 60) return `en ${diffMins} min`
    if (diffMins < 1440) return `en ${Math.round(diffMins / 60)}h`
    return `en ${Math.round(diffMins / 1440)}d`
  }, [])

  const renderRideCard = ({ item: ride }: any) => (
    <View style={styles.rideCard}>
      {/* Header: Origin → Destination (Horizontal) */}
      <View style={styles.routeInfo}>
        <View style={styles.routeStart}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.origin}
          </Text>
        </View>

        <View style={styles.routeDash}>
          <Ionicons name="arrow-forward" size={14} color={COLORS.secondary} />
        </View>

        <View style={styles.routeEnd}>
          <Ionicons name="location" size={18} color={COLORS.error} />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.destination}
          </Text>
        </View>
      </View>

      {/* Time & Availability */}
      <View style={styles.timeAvailability}>
        <View style={styles.timeBlock}>
          <Ionicons name="time" size={16} color={COLORS.textSecondary} />
          <Text style={styles.timeText}>{formatTime(ride.departure_time)}</Text>
          <Text style={styles.minutesText}>{getMinutesUntilDeparture(ride.departure_time)}</Text>
        </View>

        <View style={styles.availabilityBlock}>
          <View style={styles.seatsBox}>
            <Text style={styles.seatsCount}>{ride.seats_available_count}</Text>
            <Text style={styles.seatsLabel}>de {ride.total_seats}</Text>
          </View>
          <Text style={styles.seatsText}>asientos</Text>
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>por persona</Text>
          <Text style={styles.priceValue}>${ride.price_per_seat.toLocaleString()}</Text>
        </View>
      </View>

      {/* Driver Info */}
      <View style={styles.driverInfo}>
        {ride.driver_photo ? (
          <Image source={{ uri: ride.driver_photo }} style={styles.driverPhoto} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.driverPhoto, styles.driverPhotoPlaceholder]}>
            <Ionicons name="person" size={24} color={COLORS.textTertiary} />
          </View>
        )}

        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{ride.driver_name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.warning} />
            <Text style={styles.ratingText}>
              {ride.driver_rating.toFixed(1)} ({ride.driver_review_count})
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => handleReserve(ride)}
          activeOpacity={0.8}
        >
          <View style={styles.reserveGradient}>
            <Text style={styles.reserveText}>Reservar</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleTag}>
          <Ionicons name="car" size={14} color={COLORS.secondary} />
          <Text style={styles.vehicleType}>{ride.vehicle_type || 'Auto'}</Text>
        </View>
        <Text style={styles.vehicleDetail}>{ride.vehicle_color}</Text>
        <Text style={styles.vehiclePlate}>{ride.vehicle_plate}</Text>
      </View>

      {/* Nota de ruta */}
      {!!ride.description && (
        <View style={styles.viaRow}>
          <Ionicons name="git-branch-outline" size={13} color={COLORS.accent} />
          <Text style={styles.viaText} numberOfLines={2}>{ride.description}</Text>
        </View>
      )}
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No hay viajes disponibles</Text>
      <Text style={styles.emptyText}>
        Prueba con diferentes ciudades o horarios
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
        <Text style={styles.emptyButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  )

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={COLORS.error} />
      <Text style={styles.errorTitle}>Error cargando viajes</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={onRefresh}>
        <Text style={styles.errorButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Viajes Disponibles</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && rides.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Buscando viajes...</Text>
        </View>
      ) : error && rides.length === 0 ? (
        renderError()
      ) : rides.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
  },
  errorButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  routeInfo: {
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  routeStart: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '40%',
  },
  routeText: {
    ...TYPOGRAPHY.subtitle1,
    color: COLORS.text,
    marginLeft: SPACING.xs,
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
  },
  routeDash: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.3,
  },
  dashLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  routeEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '40%',
  },
  timeAvailability: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 0,
  },
  timeText: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
  },
  minutesText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 11,
  },
  availabilityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 0,
  },
  seatsBox: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatsCount: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  seatsLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  seatsText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  priceBlock: {
    alignItems: 'flex-end',
    flex: 1,
    justifyContent: 'flex-end',
  },
  priceLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  priceValue: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
    flexWrap: 'wrap',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  driverPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  driverPhotoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  driverName: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
    maxWidth: '80%',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  reserveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    flex: 0,
  },
  reserveGradient: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reserveText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'flex-start',
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  vehicleType: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  vehicleDetail: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  vehiclePlate: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  viaRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: `${COLORS.accent}10`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginTop: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  viaText: { flex: 1, fontSize: 12, color: COLORS.accent, lineHeight: 16 },
})
