import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useDriverEarnings } from '../hooks/useDriverEarnings';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

const PAGE_SIZE = 20;

export function EarningsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { earnings, transactions, loading, loadEarnings } = useDriverEarnings(user?.id);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useFocusEffect(
    React.useCallback(() => {
      setVisibleCount(PAGE_SIZE);
      loadEarnings();
    }, [loadEarnings])
  );

  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading && !earnings) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Ganancias</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Card principal */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardIcon}>
            <Ionicons name="wallet-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.mainCardLabel}>ESTIMADO DE INGRESOS</Text>
          <Text style={styles.mainCardAmount}>
            {formatCOP(earnings?.totalEarnings ?? 0)}
          </Text>
          <View style={styles.mainCardStats}>
            <View style={styles.mainCardStat}>
              <Text style={styles.mainCardStatValue}>{earnings?.completedTrips ?? 0}</Text>
              <Text style={styles.mainCardStatLabel}>Viajes</Text>
            </View>
            <View style={styles.mainCardStatDivider} />
            <View style={styles.mainCardStat}>
              <Text style={styles.mainCardStatValue}>{earnings?.completedPassengers ?? 0}</Text>
              <Text style={styles.mainCardStatLabel}>Pasajeros</Text>
            </View>
            <View style={styles.mainCardStatDivider} />
            <View style={styles.mainCardStat}>
              <Text style={styles.mainCardStatValue}>{formatCOP(earnings?.averagePerTrip ?? 0)}</Text>
              <Text style={styles.mainCardStatLabel}>Promedio/viaje</Text>
            </View>
          </View>
        </View>

        {/* Este mes + Próximos */}
        <View style={styles.row}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.statCardLabel}>Este mes</Text>
            <Text style={[styles.statCardValue, { color: COLORS.primary }]}>
              {formatCOP(earnings?.thisMonthEarnings ?? 0)}
            </Text>
          </View>
          {(earnings?.upcomingAmount ?? 0) > 0 && (
            <View style={[styles.statCard, { borderLeftColor: '#0EA5E9' }]}>
              <Ionicons name="time-outline" size={20} color="#0EA5E9" style={{ marginBottom: 6 }} />
              <Text style={styles.statCardLabel}>Próximos</Text>
              <Text style={[styles.statCardValue, { color: '#0EA5E9' }]}>
                {formatCOP(earnings?.upcomingAmount ?? 0)}
              </Text>
              <Text style={styles.statCardHint}>Viajes pendientes</Text>
            </View>
          )}
        </View>

        {/* Nota aclaratoria */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.disclaimerText}>
            Los pagos son directos entre conductor y pasajero. Este resumen es un estimado basado en tus reservas.
          </Text>
        </View>

        {/* Balance Mensual */}
        {(earnings?.monthlyBalances?.length ?? 0) > 0 && (
          <View style={styles.monthlySection}>
            <Text style={styles.monthlySectionTitle}>Balance Mensual</Text>
            {earnings!.monthlyBalances.map((month) => (
              <View
                key={month.key}
                style={[styles.monthCard, month.isCurrentMonth && styles.monthCardCurrent]}
              >
                <View style={styles.monthHeader}>
                  <Text style={[styles.monthLabel, month.isCurrentMonth && styles.monthLabelCurrent]}>
                    {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                  </Text>
                  {month.isCurrentMonth && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>MES ACTUAL</Text>
                    </View>
                  )}
                </View>

                <View style={styles.monthStats}>
                  <View style={styles.monthStat}>
                    <Text style={styles.monthStatLabel}>Ingresos</Text>
                    <Text style={[styles.monthStatValue, { color: COLORS.success }]}>
                      {formatCOP(month.earned)}
                    </Text>
                    <Text style={styles.monthStatSub}>{month.tripsCompleted} viaje{month.tripsCompleted !== 1 ? 's' : ''}</Text>
                  </View>

                  <View style={styles.monthDivider} />

                  <View style={styles.monthStat}>
                    <Text style={styles.monthStatLabel}>Cancelaciones</Text>
                    <Text style={[styles.monthStatValue, { color: month.cancelledCount > 0 ? COLORS.error : COLORS.textTertiary }]}>
                      {month.cancelledCount > 0 ? `-${formatCOP(month.cancelledAmount)}` : '$0'}
                    </Text>
                    <Text style={styles.monthStatSub}>{month.cancelledCount} cancelac.</Text>
                  </View>

                  <View style={styles.monthDivider} />

                  <View style={styles.monthStat}>
                    <Text style={styles.monthStatLabel}>Balance</Text>
                    <Text style={[styles.monthStatValue, { color: COLORS.primary }]}>
                      {formatCOP(month.earned)}
                    </Text>
                    <Text style={styles.monthStatSub}>neto</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resumen de Reservas */}
        <View style={styles.card}>
          <View style={styles.txHeader}>
            <Text style={styles.cardTitle}>Resumen de Reservas</Text>
            {transactions.length > 0 && (
              <Text style={styles.txCount}>{transactions.length} total</Text>
            )}
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textTertiary} />
              <Text style={styles.emptyTxText}>Sin transacciones aún</Text>
            </View>
          ) : (
            <>
              {transactions.slice(0, visibleCount).map((tx, idx) => (
                <View key={tx.id}>
                  <View style={styles.txRow}>
                    <View style={[
                      styles.txIcon,
                      {
                        backgroundColor:
                          tx.type === 'cancellation' ? `${COLORS.error}15`
                          : tx.type === 'upcoming' ? '#0EA5E915'
                          : `${COLORS.success}15`
                      }
                    ]}>
                      <Ionicons
                        name={
                          tx.type === 'cancellation' ? 'close-circle-outline'
                          : tx.type === 'upcoming' ? 'time-outline'
                          : 'checkmark-circle-outline'
                        }
                        size={20}
                        color={
                          tx.type === 'cancellation' ? COLORS.error
                          : tx.type === 'upcoming' ? '#0EA5E9'
                          : COLORS.success
                        }
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc}>{tx.description}</Text>
                      <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                    </View>
                    <Text style={[
                      styles.txAmount,
                      {
                        color:
                          tx.type === 'cancellation' ? COLORS.error
                          : tx.type === 'upcoming' ? '#0EA5E9'
                          : COLORS.success
                      }
                    ]}>
                      {tx.type === 'cancellation' ? '-' : '+'}{formatCOP(tx.amount)}
                    </Text>
                  </View>
                  {idx < Math.min(visibleCount, transactions.length) - 1 && (
                    <View style={styles.txDivider} />
                  )}
                </View>
              ))}

              <View style={styles.loadMoreRow}>
                {visibleCount > PAGE_SIZE && (
                  <TouchableOpacity
                    style={[styles.loadMoreBtn, styles.loadMoreBtnHalf]}
                    onPress={() => setVisibleCount(PAGE_SIZE)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-up" size={16} color={COLORS.textSecondary} />
                    <Text style={[styles.loadMoreText, { color: COLORS.textSecondary }]}>Mostrar menos</Text>
                  </TouchableOpacity>
                )}
                {visibleCount < transactions.length && (
                  <TouchableOpacity
                    style={[styles.loadMoreBtn, styles.loadMoreBtnHalf]}
                    onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreText}>
                      Ver más ({transactions.length - visibleCount})
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  mainCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  mainCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mainCardLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  mainCardAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.lg,
  },
  mainCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  mainCardStat: {
    alignItems: 'center',
  },
  mainCardStatValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  mainCardStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainCardStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  statCardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statCardValue: {
    ...TYPOGRAPHY.h4,
    fontWeight: '800',
  },
  statCardHint: {
    ...TYPOGRAPHY.caption,
    color: '#FF9500',
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  cardSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  disclaimerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  txCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  emptyTx: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTxText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
  loadMoreRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  loadMoreBtnHalf: {
    flex: 1,
  },
  loadMoreText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  txDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  txDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 56,
  },

  // Balance Mensual
  monthlySection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  monthlySectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  monthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  monthCardCurrent: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  monthLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  monthLabelCurrent: {
    color: COLORS.primary,
  },
  currentBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  monthStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthStat: {
    flex: 1,
    alignItems: 'center',
  },
  monthDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.borderLight,
  },
  monthStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  monthStatValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    fontSize: 13,
  },
  monthStatSub: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
