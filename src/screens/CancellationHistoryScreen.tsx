import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useLayoutEffect, useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { useCancellationHistory } from '../hooks/useCancellationHistory'
import { formatCOP } from '../utils/currency'

interface CancellationRecord {
  id: string
  route_id: string
  cancelled_at: string
  cancellation_reason: string
  refund_amount: number
  refund_percentage: number
  origin: string
  destination: string
}

export default function CancellationHistoryScreen() {
  const navigation = useNavigation()
  const { user: authUser } = useAuth()
  const { history, stats, loading } = useCancellationHistory(authUser?.id)
  const [filterType, setFilterType] = useState<'all' | 'full' | 'partial' | 'none'>('all')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

  const filteredHistory = history.filter((item) => {
    if (filterType === 'all') return true
    if (filterType === 'full') return item.refund_percentage === 100
    if (filterType === 'partial') return item.refund_percentage > 0 && item.refund_percentage < 100
    if (filterType === 'none') return item.refund_percentage === 0
    return true
  })

  const getRefundBadgeColor = (percentage: number) => {
    if (percentage === 100) return COLORS.success
    if (percentage > 0) return COLORS.warning
    return COLORS.error
  }

  const renderCancellationCard = ({ item }: { item: CancellationRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.origin}>{item.origin}</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.textTertiary} />
          <Text style={styles.destination}>{item.destination}</Text>
        </View>
        <View
          style={[
            styles.refundBadge,
            { backgroundColor: getRefundBadgeColor(item.refund_percentage) + '20' },
          ]}
        >
          <Text style={[styles.refundText, { color: getRefundBadgeColor(item.refund_percentage) }]}>
            {item.refund_percentage}%
          </Text>
        </View>
      </View>

      <Text style={styles.reason}>{item.cancellation_reason}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.date}>
            {new Date(item.cancelled_at).toLocaleDateString('es-CO')}
          </Text>
        </View>
        <Text style={styles.refundAmount}>{formatCOP(item.refund_amount)}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Cancelaciones</Text>
      </View>

      {/* Empty State */}
      {history.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
          <Text style={styles.emptyTitle}>Sin cancelaciones</Text>
          <Text style={styles.emptyText}>¡Excelente! No has cancelado viajes</Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Stats & History */}
      {!loading && history.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Cancelado</Text>
              <Text style={styles.statValue}>{stats?.total_cancellations || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Reembolsado</Text>
              <Text style={styles.statValue}>{formatCOP(stats?.total_refunded || 0)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Promedio</Text>
              <Text style={styles.statValue}>{formatCOP(stats?.average_refund || 0)}</Text>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            {(['all', 'full', 'partial', 'none'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    filterType === type && styles.filterBtnTextActive,
                  ]}
                >
                  {type === 'all' && 'Todas'}
                  {type === 'full' && '100%'}
                  {type === 'partial' && 'Parcial'}
                  {type === 'none' && 'Sin refund'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* History List */}
          <View style={styles.listContainer}>
            <FlatList
              data={filteredHistory}
              renderItem={renderCancellationCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceHover,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  filterBtnTextActive: {
    color: COLORS.textInverse,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  origin: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    flex: 1,
  },
  destination: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    flex: 1,
  },
  refundBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  refundText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  reason: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceHover,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  date: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
  },
  refundAmount: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.error,
  },
})
