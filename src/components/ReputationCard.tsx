import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { DriverReputation } from '../services/driverReputation'

interface ReputationCardProps {
  reputation: DriverReputation | null
  loading?: boolean
}

export default function ReputationCard({ reputation, loading = false }: ReputationCardProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando reputación...</Text>
      </View>
    )
  }

  if (!reputation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No se pudo cargar la información de reputación</Text>
      </View>
    )
  }

  const RatingStars = ({ rating, size = 16 }: { rating: number; size?: number }) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= Math.floor(rating) ? 'star' : 'star-outline'}
          size={size}
          color={star <= Math.floor(rating) ? COLORS.warning : COLORS.textTertiary}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Main Rating Section */}
      <View style={styles.ratingSection}>
        <View style={styles.ratingLeft}>
          <Text style={styles.ratingLabel}>Rating Promedio</Text>
          <Text style={styles.ratingValue}>{reputation.avgRating.toFixed(1)}</Text>
          <RatingStars rating={reputation.avgRating} size={14} />
          <Text style={styles.reviewCount}>{reputation.totalReviews} opiniones</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.ratingRight}>
          <Text style={styles.ratingLabel}>Rating Ponderado</Text>
          <View style={styles.weightedBadge}>
            <Text style={styles.weightedValue}>{reputation.weightedRating.toFixed(1)}</Text>
            <Ionicons name="star" size={18} color="#FFF" style={{ marginLeft: 4 }} />
          </View>
          <Text style={styles.weightedNote}>Incluye: viajes, consistencia, recomendaciones</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-done" size={18} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.statValue}>{reputation.completedTrips}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="heart" size={18} color={COLORS.error} />
          </View>
          <View>
            <Text style={styles.statValue}>{reputation.recommendPercent}%</Text>
            <Text style={styles.statLabel}>Recomendado</Text>
          </View>
        </View>
      </View>

      {/* Achievements Section */}
      {reputation.achievements.length > 0 && (
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>🏆 Logros Desbloqueados</Text>
          <View style={styles.achievementsList}>
            {reputation.achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementBadge}>
                <Ionicons
                  name={achievement.iconName as any}
                  size={20}
                  color={COLORS.warning}
                  style={{ marginRight: 6 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDesc} numberOfLines={1}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Trust Indicator */}
      <View style={[styles.trustIndicator, getTrustStyle(reputation.weightedRating)]}>
        <Ionicons
          name={getTrustIcon(reputation.weightedRating)}
          size={16}
          color="#FFF"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.trustText}>{getTrustLabel(reputation.weightedRating)}</Text>
      </View>
    </View>
  )
}

/**
 * Helper functions to determine trust level
 */
function getTrustStyle(rating: number) {
  if (rating >= 4.7) return styles.trustPremium
  if (rating >= 4.5) return styles.trustExcellent
  if (rating >= 4.0) return styles.trustGood
  if (rating >= 3.5) return styles.trustFair
  return styles.trustLow
}

function getTrustIcon(rating: number) {
  if (rating >= 4.7) return 'shield-checkmark'
  if (rating >= 4.5) return 'checkmark-circle'
  if (rating >= 4.0) return 'thumbs-up'
  if (rating >= 3.5) return 'help-circle'
  return 'warning'
}

function getTrustLabel(rating: number) {
  if (rating >= 4.7) return '✓ Conductor Premium - Altamente Confiable'
  if (rating >= 4.5) return '✓ Excelente - Muy Recomendado'
  if (rating >= 4.0) return '✓ Bueno - Confiable'
  if (rating >= 3.5) return '⚠ Aceptable'
  return '✗ Bajo Rating'
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },

  // Loading & Error
  loadingText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.error,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Rating Section
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ratingLeft: {
    flex: 1,
    alignItems: 'center',
    paddingRight: SPACING.md,
  },
  ratingRight: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: SPACING.md,
  },
  ratingLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  ratingValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  reviewCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },

  weightedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  weightedValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.warning,
  },
  weightedNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    maxWidth: '100%',
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING.md,
  },

  // Achievements
  achievementsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  achievementsList: {
    gap: SPACING.sm,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  achievementName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  achievementDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Trust Indicator
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  trustText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Trust Level Styles
  trustPremium: {
    backgroundColor: '#8B5CF6',
  },
  trustExcellent: {
    backgroundColor: '#06B6D4',
  },
  trustGood: {
    backgroundColor: '#10B981',
  },
  trustFair: {
    backgroundColor: '#F59E0B',
  },
  trustLow: {
    backgroundColor: '#EF4444',
  },
})
