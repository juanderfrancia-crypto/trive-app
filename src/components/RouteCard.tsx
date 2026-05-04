import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useDriverReputation } from '../hooks/useDriverReputation'
import type { Route } from '../hooks/useRoutes'

interface RouteCardProps {
  route: Route
  onPress: (route: Route) => void
  onDetails: (driverId: string) => void
  formatTime: (start: string, end: string) => string
  formatPrice: (price: number) => string
}

export default function RouteCard({
  route,
  onPress,
  onDetails,
  formatTime,
  formatPrice,
}: RouteCardProps) {
  const { reputation } = useDriverReputation(route.driver_id)

  const getTrustColor = (rating: number) => {
    if (rating >= 4.7) return '#8B5CF6'
    if (rating >= 4.5) return '#06B6D4'
    if (rating >= 4.0) return '#10B981'
    if (rating >= 3.5) return '#F59E0B'
    return '#EF4444'
  }

  const getTrustIcon = (rating: number) => {
    if (rating >= 4.7) return 'shield-checkmark'
    if (rating >= 4.5) return 'checkmark-circle'
    if (rating >= 4.0) return 'thumbs-up'
    if (rating >= 3.5) return 'help-circle'
    return 'warning'
  }

  return (
    <TouchableOpacity
      style={styles.routeCardWrapper}
      onPress={() => onPress(route)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        {/* Vehicle Type Badge */}
        {route.vehicle_type && (
          <View style={styles.vehicleTypeBadge}>
            <Text style={styles.vehicleTypeText}>{route.vehicle_type}</Text>
          </View>
        )}

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            route.available_seats > 0 ? styles.badgeAvailable : styles.badgeFull,
          ]}
        >
          <Ionicons
            name={route.available_seats > 0 ? 'checkmark-circle' : 'close-circle'}
            size={12}
            color={route.available_seats > 0 ? COLORS.success : COLORS.error}
          />
          <Text style={styles.badgeText}>
            {route.available_seats > 0 ? 'Disponible' : 'Lleno'}
          </Text>
        </View>
      </View>

      {/* Route Info - Origin & Destination */}
      <View style={styles.routeSection}>
        <View style={styles.locationRow}>
          <View style={styles.locationDot}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>SALIDA</Text>
            <Text style={styles.locationName} numberOfLines={1}>
              {route.origin}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.locationRow}>
          <View style={styles.locationDot}>
            <Ionicons name="location" size={20} color={COLORS.error} />
          </View>
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>DESTINO</Text>
            <Text style={styles.locationName} numberOfLines={1}>
              {route.destination}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Row - Time, Price, Seats */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoValue}>
            {formatTime(route.departure_time, route.arrival_time)}
          </Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoItem}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoValue}>{formatPrice(route.price_per_seat)}</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoValue}>
            {route.available_seats === 0 ? '0' : route.available_seats}
          </Text>
          <Text style={styles.infoLabel}>puestos</Text>
        </View>
      </View>

      {/* Nota de ruta del conductor */}
      {!!route.description && (
        <View style={styles.viaRow}>
          <Ionicons name="git-branch-outline" size={13} color={COLORS.accent} />
          <Text style={styles.viaText} numberOfLines={2}>{route.description}</Text>
        </View>
      )}

      {/* Driver & Reputation Row */}
      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {route.driver_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName} numberOfLines={1}>
              {route.driver_name || 'Conductor'}
            </Text>
            <Text style={styles.vehicleInfo} numberOfLines={1}>
              {route.vehicle_plate || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Reputation Badge */}
        {reputation && (
          <TouchableOpacity
            style={[
              styles.reputationBadge,
              { backgroundColor: getTrustColor(reputation.weightedRating) + '15' },
            ]}
            onPress={() => onDetails(route.driver_id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={getTrustIcon(reputation.weightedRating) as any}
              size={16}
              color={getTrustColor(reputation.weightedRating)}
            />
            <Text
              style={[
                styles.ratingValue,
                { color: getTrustColor(reputation.weightedRating) },
              ]}
            >
              {reputation.weightedRating.toFixed(1)}
            </Text>
            <Ionicons name="star" size={12} color={getTrustColor(reputation.weightedRating)} />
            {reputation.reviewComments.length > 0 && (
              <View style={styles.commentCounter}>
                <Ionicons name="chatbubble" size={12} color={COLORS.textSecondary} />
                <Text style={styles.commentCountText}>
                  {reputation.reviewComments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom CTA */}
      <TouchableOpacity
        style={[
          styles.ctaButton,
          route.available_seats === 0 && styles.ctaButtonDisabled,
        ]}
        onPress={() => onPress(route)}
        disabled={route.available_seats === 0}
      >
        <Text style={styles.ctaButtonText}>
          {route.available_seats === 0 ? 'Viaje lleno' : 'Ver detalles y reservar'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  routeCardWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.md,
    overflow: 'hidden',
  },

  // Header with badges
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  vehicleTypeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  vehicleTypeText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  badgeAvailable: {
    backgroundColor: COLORS.success + '15',
  },
  badgeFull: {
    backgroundColor: COLORS.error + '15',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Route Section with visual line
  routeSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationName: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 15,
    marginVertical: 4,
  },

  // Info Row (time, price, seats)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoValue: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },

  // Via note
  viaRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: `${COLORS.accent}10`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  viaText: { flex: 1, fontSize: 12, color: COLORS.accent, lineHeight: 16 },

  // Driver Section
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    ...TYPOGRAPHY.body2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehicleInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Reputation Badge
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  ratingValue: {
    ...TYPOGRAPHY.body3,
    fontWeight: '700',
  },
  commentCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: SPACING.xs,
  },
  commentCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  ctaButtonText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
