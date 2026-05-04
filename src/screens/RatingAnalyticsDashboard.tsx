import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useLayoutEffect } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRatingAnalytics } from '../hooks/useRatingAnalytics'
import { RatingStars } from '../components/RatingStars'

const { width } = Dimensions.get('window')

interface RatingStats {
  total_reviews: number
  average_rating: number
  distribution: {
    five_stars: number
    four_stars: number
    three_stars: number
    two_stars: number
    one_star: number
  }
  top_rated_drivers: Array<{ driver_name: string; avg_rating: number; review_count: number }>
  lowest_rated_drivers: Array<{ driver_name: string; avg_rating: number; review_count: number }>
  recent_reviews: Array<{
    driver_name: string
    rating: number
    comment: string
    created_at: string
  }>
}

export default function RatingAnalyticsDashboard() {
  const navigation = useNavigation()
  const { stats, loading } = useRatingAnalytics()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

  const getRatingDistribution = () => {
    const total = Object.values(stats?.distribution || {}).reduce((a, b) => a + b, 0)
    if (total === 0) return {}

    return {
      five: ((stats?.distribution?.five_stars || 0) / total) * 100,
      four: ((stats?.distribution?.four_stars || 0) / total) * 100,
      three: ((stats?.distribution?.three_stars || 0) / total) * 100,
      two: ((stats?.distribution?.two_stars || 0) / total) * 100,
      one: ((stats?.distribution?.one_star || 0) / total) * 100,
    }
  }

  const distribution = getRatingDistribution()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estadísticas de Ratings</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : stats ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Overall Rating */}
          <View style={styles.overallCard}>
            <Text style={styles.overallLabel}>Calificación General</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.overallRating}>{stats.average_rating?.toFixed(1) || '0'}</Text>
              <RatingStars rating={stats.average_rating || 0} size={24} />
            </View>
            <Text style={styles.totalReviews}>{stats.total_reviews || 0} reseñas</Text>
          </View>

          {/* Distribution Chart */}
          <View style={styles.distributionCard}>
            <Text style={styles.sectionTitle}>Distribución de Ratings</Text>
            {[5, 4, 3, 2, 1].map((rating) => {
              const key = `${rating === 5 ? 'five' : rating === 4 ? 'four' : rating === 3 ? 'three' : rating === 2 ? 'two' : 'one'}_stars`
              const count =
                stats.distribution?.[key as keyof typeof stats.distribution] || 0
              const percent = distribution?.[rating === 5 ? 'five' : rating === 4 ? 'four' : rating === 3 ? 'three' : rating === 2 ? 'two' : 'one'] || 0

              return (
                <View key={rating} style={styles.distributionRow}>
                  <View style={styles.ratingLabel}>
                    <Text style={styles.ratingLabelText}>{rating}★</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${percent}%`,
                          backgroundColor:
                            rating >= 4
                              ? COLORS.success
                              : rating === 3
                                ? COLORS.warning
                                : COLORS.error,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {count} ({percent.toFixed(0)}%)
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Top Rated Drivers */}
          {stats.top_rated_drivers && stats.top_rated_drivers.length > 0 && (
            <View style={styles.driversCard}>
              <Text style={styles.sectionTitle}>Top Drivers 👑</Text>
              {stats.top_rated_drivers.slice(0, 5).map((driver, index) => (
                <View key={index} style={styles.driverItem}>
                  <View style={styles.driverRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.driver_name}</Text>
                    <Text style={styles.driverStats}>{driver.review_count} reseñas</Text>
                  </View>
                  <RatingStars rating={driver.average_rating} size={16} />
                </View>
              ))}
            </View>
          )}

          {/* Drivers Needing Review */}
          {stats.lowest_rated_drivers && stats.lowest_rated_drivers.length > 0 && (
            <View style={styles.driversCard}>
              <Text style={styles.sectionTitle}>Necesitan Atención ⚠️</Text>
              {stats.lowest_rated_drivers.slice(0, 5).map((driver, index) => (
                <View key={index} style={[styles.driverItem, styles.driverItemWarning]}>
                  <View style={[styles.driverRank, styles.driverRankWarning]}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.driver_name}</Text>
                    <Text style={styles.driverStats}>{driver.review_count} reseñas</Text>
                  </View>
                  <RatingStars rating={driver.average_rating} size={16} showText={false} />
                </View>
              ))}
            </View>
          )}

          {/* Recent Reviews */}
          {stats.recent_reviews && stats.recent_reviews.length > 0 && (
            <View style={styles.reviewsCard}>
              <Text style={styles.sectionTitle}>Reseñas Recientes</Text>
              {stats.recent_reviews.slice(0, 5).map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewDriver}>{review.driver_name}</Text>
                    <RatingStars rating={review.rating} size={14} showText={false} />
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('es-CO')}
                  </Text>
                  {review.comment && (
                    <Text style={styles.reviewComment} numberOfLines={2}>
                      "{review.comment}"
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>Sin datos disponibles</Text>
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  overallCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  overallLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textInverse,
    opacity: 0.8,
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  overallRating: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textInverse,
  },
  totalReviews: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textInverse,
    opacity: 0.8,
  },
  distributionCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  ratingLabel: {
    width: 50,
    alignItems: 'center',
  },
  ratingLabelText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  barLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    minWidth: 60,
    textAlign: 'right',
  },
  driversCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
    gap: SPACING.md,
  },
  driverItemWarning: {
    backgroundColor: COLORS.error + '10',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 0,
    marginBottom: SPACING.md,
  },
  driverRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverRankWarning: {
    backgroundColor: COLORS.error + '20',
  },
  rankText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textInverse,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  driverStats: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reviewsCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    marginBottom: SPACING.xl,
  },
  reviewItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewDriver: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  reviewComment: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
})
