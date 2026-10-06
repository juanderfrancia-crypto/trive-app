import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { useCancellationHistory } from '../hooks/useCancellationHistory'
import { formatCOP } from '../utils/currency'

type RefundFilter = 'all' | 'full' | 'partial' | 'none'

const FILTERS: { value: RefundFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'full', label: 'Reembolso total' },
  { value: 'partial', label: 'Parcial' },
  { value: 'none', label: 'Sin reembolso' },
]

const refundColor = (percentage: number) => {
  if (percentage === 100) return COLORS.success
  if (percentage > 0) return COLORS.warningDark
  return COLORS.error
}

export default function CancellationHistoryScreen() {
  const navigation = useNavigation()
  const { user: authUser } = useAuth()
  const { history, stats, loading } = useCancellationHistory(authUser?.id)
  const [filterType, setFilterType] = useState<RefundFilter>('all')

  const filteredHistory = history.filter((item) => {
    if (filterType === 'all') return true
    if (filterType === 'full') return item.refund_percentage === 100
    if (filterType === 'partial') return item.refund_percentage > 0 && item.refund_percentage < 100
    if (filterType === 'none') return item.refund_percentage === 0
    return true
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cancelaciones</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

      {!loading && history.length === 0 && (
        <View style={styles.empty}>
          <Illustration name="noData" width={170} />
          <Text style={styles.emptyTitle}>Sin cancelaciones</Text>
          <Text style={styles.emptyText}>Aquí verás tus cancelaciones y los reembolsos asociados.</Text>
        </View>
      )}

      {!loading && history.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.statsRow}>
            <StatCard label="Cancelaciones" value={String(stats?.total_cancellations || 0)} />
            <StatCard label="Reembolsado" value={formatCOP(stats?.total_refunded || 0)} />
            <StatCard label="Promedio" value={formatCOP(stats?.average_refund || 0)} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((filter) => {
              const active = filterType === filter.value
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filter, active && styles.filterActive]}
                  onPress={() => setFilterType(filter.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {filteredHistory.map((item) => {
            const color = refundColor(item.refund_percentage)
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.routeText}>
                    <Text style={styles.origin} numberOfLines={1}>{item.origin}</Text>
                    <Icon name="ArrowRight" size={14} color={COLORS.textTertiary} />
                    <Text style={styles.destination} numberOfLines={1}>{item.destination}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.badgeText, { color }]}>{item.refund_percentage}%</Text>
                  </View>
                </View>

                {!!item.cancellation_reason && <Text style={styles.reason}>{item.cancellation_reason}</Text>}

                <View style={styles.cardFooter}>
                  <View style={styles.dateRow}>
                    <Icon name="Calendar" size={14} color={COLORS.textTertiary} />
                    <Text style={styles.date}>{new Date(item.cancelled_at).toLocaleDateString('es-CO')}</Text>
                  </View>
                  <Text style={styles.amount}>{formatCOP(item.refund_amount)}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  loader: { marginTop: SPACING.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    ...SHADOWS.sm,
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  statValue: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.primary, textAlign: 'center' },

  filterRow: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  filter: {
    paddingHorizontal: SPACING.lg,
    height: 38,
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },

  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  routeText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  origin: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, flexShrink: 1 },
  destination: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, flexShrink: 1 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  badgeText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.extrabold },
  reason: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  date: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  amount: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
})
