import { useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, FlatList } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { parseServerDate } from '../utils/serverDate'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { getUserAverageRating } from '../services/reviews'

interface ReviewWithDetails {
  id: string
  rating: number
  comment?: string
  recommend?: boolean
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
  const user = useAppStore((s) => s.user)
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'given' | 'received'>('all')
  const [avgRating, setAvgRating] = useState<number>(0)
  const [totalReviews, setTotalReviews] = useState<number>(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (user?.id) {
      loadReviews()
    }
  }, [user?.id])

  // Cambiar de filtro vuelve a la página 1 -- si no, se podía quedar en una
  // página que ya no existe para el nuevo subconjunto filtrado.
  // Cambia de filtro y vuelve a la página 1 en el mismo toque (no en un
  // useEffect aparte) -- si no, se alcanza a pintar un instante la página
  // vieja sobre los datos del filtro nuevo antes de corregirse, y ese
  // parpadeo se siente como que tarda en cambiar.
  const selectFilterType = (f: 'all' | 'given' | 'received') => {
    setFilterType(f)
    setPage(1)
  }

  const loadReviews = async () => {
    try {
      setLoading(true)
      if (!user?.id) {
        setReviews([])
        return
      }

      // Dos queries batch — cada una hace join de perfiles en la misma llamada
      const [receivedResult, givenResult, avg] = await Promise.all([
        supabase
          .from('reviews')
          .select(`
            id, rating, comment, recommend, created_at, booking_id, reviewer_id, reviewee_id,
            profiles!reviews_reviewer_id_fkey(name)
          `)
          .eq('reviewee_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select(`
            id, rating, comment, recommend, created_at, booking_id, reviewer_id, reviewee_id,
            profiles!reviews_reviewee_id_fkey(name)
          `)
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),
        getUserAverageRating(user.id),
      ])

      if (receivedResult.error) throw receivedResult.error
      if (givenResult.error) throw givenResult.error

      const enrichedReceived: ReviewWithDetails[] = (receivedResult.data || []).map((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          recommend: r.recommend,
          createdAt: r.created_at,
          reviewerName: profile?.name || 'Usuario',
          reviewerId: r.reviewer_id,
          revieweeName: user.name || 'Yo',
          revieweeId: r.reviewee_id,
          bookingId: r.booking_id,
          type: 'received' as const,
        }
      })

      const enrichedGiven: ReviewWithDetails[] = (givenResult.data || []).map((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          recommend: r.recommend,
          createdAt: r.created_at,
          reviewerName: user.name || 'Yo',
          reviewerId: r.reviewer_id,
          revieweeName: profile?.name || 'Usuario',
          revieweeId: r.reviewee_id,
          bookingId: r.booking_id,
          type: 'given' as const,
        }
      })

      const allReviews = [...enrichedReceived, ...enrichedGiven].sort(
        (a, b) => parseServerDate(b.createdAt).getTime() - parseServerDate(a.createdAt).getTime()
      )

      setReviews(allReviews)
      setTotalReviews(allReviews.length)
      setAvgRating(avg)
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

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE))
  const pagedReviews = filteredReviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const formatDate = (dateStr: string) => {
    const date = parseServerDate(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // diffDays puede salir negativo por un desfase mínimo de reloj entre el
    // teléfono y el servidor (una reseña creada hace segundos) -- cualquier
    // diferencia de 0 o menos cuenta como "Hoy", nunca "-1 días".
    if (diffDays <= 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`

    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const RatingStars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name={star <= rating ? 'Star' : 'Star'}
          size={size}
          color={star <= rating ? COLORS.warning : COLORS.textTertiary}
        />
      ))}
    </View>
  )

  const ReviewCard = ({ review }: { review: ReviewWithDetails }) => {
    const isReceived = review.type === 'received'

    return (
      <View style={styles.reviewCard}>
        {/* Encabezado */}
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
              <Text style={[styles.typeText, isReceived && styles.typeTextReceived]}>
                {isReceived ? 'Recibida' : 'Dada'}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <RatingStars rating={review.rating} size={15} />
          <Text style={styles.ratingNumber}>{review.rating.toFixed(1)}</Text>
        </View>

        {/* Comentario */}
        {review.comment && (
          <Text style={styles.commentText}>{review.comment}</Text>
        )}

        {review.recommend && (
          <View style={styles.recommendRow}>
            <Icon name="ThumbsUp" size={13} color={COLORS.primary} />
            <Text style={styles.recommendText}>Recomendado</Text>
          </View>
        )}
      </View>
    )
  }

  const StatsCard = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
        <Text style={styles.statLabel}>Promedio</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{totalReviews}</Text>
        <Text style={styles.statLabel}>Reseñas</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{reviews.filter((r) => r.type === 'given').length}</Text>
        <Text style={styles.statLabel}>Dadas</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{reviews.filter((r) => r.type === 'received').length}</Text>
        <Text style={styles.statLabel}>Recibidas</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
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
          data={pagedReviews}
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
                    style={styles.filterTab}
                    onPress={() => selectFilterType(f)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterType === f && styles.filterTextActive,
                      ]}
                    >
                      {f === 'all' ? 'Todas' : f === 'given' ? 'Dadas' : 'Recibidas'}
                    </Text>
                    {filterType === f && <View style={styles.filterIndicator} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mensaje si no hay reseñas */}
              {filteredReviews.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Illustration name="noData" width={170} />
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
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="ChevronLeft" size={18} color={page === 1 ? COLORS.textTertiary : COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Icon name="ChevronRight" size={18} color={page === totalPages ? COLORS.textTertiary : COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            ) : null
          }
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
  },

  statsRow: {
    flexDirection: 'row',
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },

  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  statNumber: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },

  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
  },

  filterTab: {
    alignItems: 'center',
  },

  filterText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  filterTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  filterIndicator: {
    marginTop: 5,
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },

  reviewCard: {
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  userInfo: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
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

  typeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  typeTextReceived: {
    color: COLORS.primary,
  },

  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },

  ratingNumber: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  commentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  recommendText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
  },

  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageBtnDisabled: {
    opacity: 0.4,
  },

  pageText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
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
