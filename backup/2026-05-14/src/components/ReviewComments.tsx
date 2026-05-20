import React from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { ReviewComment } from '../services/driverReputation'

interface ReviewCommentsProps {
  comments: ReviewComment[]
  loading?: boolean
  driverName?: string
}

export default function ReviewComments({
  comments,
  loading = false,
  driverName = 'Conductor',
}: ReviewCommentsProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando comentarios...</Text>
      </View>
    )
  }

  if (comments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>Sin comentarios aún</Text>
        <Text style={styles.emptyText}>
          Los comentarios de los pasajeros aparecerán cuando completes viajes
        </Text>
      </View>
    )
  }

  const RatingStars = ({ rating }: { rating: number }) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={12}
          color={star <= rating ? COLORS.warning : COLORS.textTertiary}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
  }

  const renderComment = ({ item }: { item: ReviewComment }) => (
    <View style={styles.commentCard}>
      {/* Header */}
      <View style={styles.commentHeader}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.reviewerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.reviewerName}
            </Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {/* Recommend Badge */}
        {item.recommend && (
          <View style={styles.recommendBadge}>
            <Ionicons name="heart" size={12} color={COLORS.error} />
            <Text style={styles.recommendText}>Recomendado</Text>
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={styles.commentRatingSection}>
        <RatingStars rating={item.rating} />
        <Text style={styles.ratingText}>{item.rating.toFixed(1)} / 5</Text>
      </View>

      {/* Comment Text */}
      <Text style={styles.commentText}>{item.comment}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Lo que dicen de {driverName}</Text>
        <Text style={styles.subtitle}>{comments.length} comentarios públicos</Text>
      </View>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },

  // Header
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Loading & Empty
  loadingText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },

  // Comment Card
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },

  // Comment Header
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },

  // Recommend Badge
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  recommendText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontWeight: '600',
  },

  // Rating
  commentRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Comment Text
  commentText: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
})
