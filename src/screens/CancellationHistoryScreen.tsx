import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { useCancellationHistory } from '../hooks/useCancellationHistory'
import { parseServerDate } from '../utils/serverDate'

export default function CancellationHistoryScreen() {
  const navigation = useNavigation()
  const { user: authUser } = useAuth()
  const { history, loading } = useCancellationHistory(authUser?.id)

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
          <Text style={styles.emptyText}>Aquí verás los viajes que has cancelado.</Text>
        </View>
      )}

      {!loading && history.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {history.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.routeText}>
                  <Text style={styles.origin} numberOfLines={1}>{item.origin}</Text>
                  <Icon name="ArrowRight" size={14} color={COLORS.textTertiary} />
                  <Text style={styles.destination} numberOfLines={1}>{item.destination}</Text>
                </View>
              </View>

              {!!item.cancellation_reason && <Text style={styles.reason}>{item.cancellation_reason}</Text>}

              <View style={styles.cardFooter}>
                <View style={styles.dateRow}>
                  <Icon name="Calendar" size={14} color={COLORS.textTertiary} />
                  <Text style={styles.date}>{parseServerDate(item.cancelled_at).toLocaleDateString('es-CO')}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
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

  card: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  routeText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  origin: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, flexShrink: 1 },
  destination: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, flexShrink: 1 },
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
})
