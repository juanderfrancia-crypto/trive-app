import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { getUserReviews, getUserAverageRating } from '../services/reviews'

interface ReviewWithDetails {
  id: string
  rating: number
  comment?: string
  createdAt: string
  reviewerName: string
  reviewerId: string
  revieweeName: string
  revieweeId: string
  bookingId: string
  type: 'given' | 'received'
}

export default function ReviewsScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAppStore()
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'given' | 'received'>('all')
  const [avgRating, setAvgRating] = useState<number>(0)
  const [totalReviews, setTotalReviews] = useState<number>(0)

  useEffect(() => {
    if (user?.id) {
      loadReviews()
    }
  }, [user?.id])

  const loadReviews = async () => {
    try {
      setLoading(true)
      if (!user?.id) {
        setReviews([])
        return
      }

      // Obtener reviews recibidos
      const receivedReviews = await getUserReviews(user.id)

      // Obtener reviews dados
      const { data: givenData, error: givenError } = await supabase
        .from('reviews')
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          booking_id,
          reviewer_id,
          reviewee_id,
          profiles!reviews_reviewee_id_fkey(
            id,
            name
          )
        `
        )
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false })

      if (givenError) throw givenError

      // Obtener detalles del reviewer para reviews recibidos
      const enrichedReceived = await Promise.all(
        receivedReviews.map(async (review) => {
          const { data: reviewer } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', review.reviewer_id)
            .single()

          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at,
            reviewerName: reviewer?.name || 'Usuario',
            reviewerId: review.reviewer_id,
            revieweeName: user.name || 'Yo',
            revieweeId: review.reviewee_id,
            bookingId: review.booking_id,
            type: 'received' as const,
          }
        })
      )

      // Enriquecer reviews dados
      const enrichedGiven = await Promise.all(
        (givenData as any[])?.map(async (review) => {
          const { data: reviewee } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', review.reviewee_id)
            .single()

          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at,
            reviewerName: user.name || 'Yo',
            reviewerId: review.reviewer_id,
            revieweeName: reviewee?.name || 'Usuario',
            revieweeId: review.reviewee_id,
            bookingId: review.booking_id,
            type: 'given' as const,
          }
        }) || []
      )

      const allReviews = [...enrichedReceived, ...enrichedGiven].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setReviews(allReviews)
      setTotalReviews(allReviews.length)

      // Obtener rating promedio
      const avgRating = await getUserAverageRating(user.id)
      setAvgRating(avgRating)
    } catch (error) {
      console.error('Error loading reviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadReviews()
  }

  const filteredReviews = reviews.filter((review) => {
    if (filterType === 'all') return true
    if (filterType === 'given') return review.type === 'given'
    if (filterType === 'received') return review.type === 'received'
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`

    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const RatingStars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? COLORS.warning : COLORS.textTertiary}
        />
      ))}
    </View>
  )

  const ReviewCard = ({ review }: { review: ReviewWithDetails }) => {
    const isReceived = review.type === 'received'

    return (
      <View style={[styles.reviewCard, isReceived && styles.reviewCardReceived]}>
        {/* Encabezado */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(isReceived ? review.reviewerName : review.revieweeName).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {isReceived ? review.reviewerName : review.revieweeName}
                </Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {isReceived ? '← Recibido' : 'Dado →'}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateText}>{formatDate(review.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <RatingStars rating={review.rating} size={18} />
          <Text style={styles.ratingNumber}>
            {review.rating.toFixed(1)} / 5
          </Text>
        </View>

        {/* Comentario */}
        {review.comment && (
          <View style={styles.commentSection}>
            <Text style={styles.commentText}>{review.comment}</Text>
          </View>
        )}

        {/* Badge de contexto */}
        <View style={styles.contextBadge}>
          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
          <Text style={styles.contextText}>Verificado después de viaje completado</Text>
        </View>
      </View>
    )
  }

  const StatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Rating Promedio</Text>
        <View style={styles.statValue}>
          <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
          <Ionicons name="star" size={20} color={COLORS.warning} />
        </View>
      </View>

      <View style={[styles.statItem, styles.statItemBorder]}>
        <Text style={styles.statLabel}>Total de Reseñas</Text>
        <Text style={styles.statNumber}>{totalReviews}</Text>
      </View>

      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Dadas vs Recibidas</Text>
        <View style={styles.ratioContainer}>
          <View style={styles.ratioItem}>
            <Text style={styles.ratioLabel}>Dadas</Text>
            <Text style={styles.ratioNumber}>
              {reviews.filter((r) => r.type === 'given').length}
            </Text>
          </View>
          <View style={[styles.ratioItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
            <Text style={styles.ratioLabel}>Recibidas</Text>
            <Text style={styles.ratioNumber}>
              {reviews.filter((r) => r.type === 'received').length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Reseñas y Ratings</Text>
          <Text style={styles.subtitle}>Tus evaluaciones</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando reseñas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {/* Estadísticas */}
              <StatsCard />

              {/* Filtros */}
              <View style={styles.filterTabs}>
                {(['all', 'given', 'received'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterTab, filterType === f && styles.filterTabActive]}
                    onPress={() => setFilterType(f)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterType === f && styles.filterTextActive,
                      ]}
                    >
                      {f === 'all' ? 'Todas' : f === 'given' ? 'Dadas' : 'Recibidas'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mensaje si no hay reseñas */}
              {filteredReviews.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="star-outline" size={48} color={COLORS.textTertiary} />
                  <Text style={styles.emptyTitle}>
                    {filterType === 'given'
                      ? 'No has dejado reseñas'
                      : filterType === 'received'
                      ? 'Sin reseñas recibidas'
                      : 'Sin reseñas'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {filterType === 'given'
                      ? 'Califica a los conductores después de tus viajes'
                      : 'Las reseñas aparecerán aquí cuando otros usuarios te evalúen'}
                  </Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => <ReviewCard review={item} />}
          contentContainerStyle={styles.listContainer}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filteredReviews.length > 0}
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
    paddingBottom: 100,
    gap: SPACING.md,
  },

  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },

  statItem: {
    paddingVertical: SPACING.md,
  },

  statItemBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  statLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  statNumber: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },

  ratioContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  ratioItem: {
    flex: 1,
    paddingLeft: SPACING.md,
  },

  ratioLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  ratioNumber: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  filterTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },

  filterTabActive: {
    backgroundColor: COLORS.primary,
  },

  filterText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  filterTextActive: {
    color: '#fff',
  },

  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
    ...SHADOWS.sm,
  },

  reviewCardReceived: {
    borderLeftColor: COLORS.warning,
    backgroundColor: COLORS.primary + '08',
  },

  cardHeader: {
    marginBottom: SPACING.md,
  },

  userInfo: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
    fontWeight: '700',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  userName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
  },

  typeBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },

  ratingNumber: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  commentSection: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
  },

  commentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.success + '15',
    borderRadius: RADIUS.md,
  },

  contextText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
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
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },

  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
})
