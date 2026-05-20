import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { formatCOP } from '../utils/currency'
import { useDriverEarnings } from '../hooks/useDriverEarnings'

interface Transaction {
  id: string
  date: string
  type: 'trip' | 'cancellation' | 'upcoming' | 'withdrawal' | 'bonus' | 'refund'
  amount: number
  description: string
  tripId?: string
  bookingId?: string
  status: 'completed' | 'pending' | 'failed'
}

export default function DriverEarningsScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore(s => s.user)
  // ✅ USAR HOOK REAL PARA GANANCIAS
  const {
    earnings,
    transactions: earningsTransactions,
    loading,
    error,
    loadEarnings,
  } = useDriverEarnings(user?.id)

  // Recargar ganancias cuando la pantalla recibe enfoque
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadEarnings()
      }
    }, [user?.id, loadEarnings])
  )

  // Convertir transacciones del hook a formato de pantalla
  const transactions: Transaction[] = earningsTransactions.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description,
    tripId: t.tripId,
    bookingId: t.bookingId,
    status: t.status,
  }))

  // Funciones helper para iconos y colores de transacciones
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'trip':       return 'checkmark-circle-outline'
      case 'cancellation': return 'close-circle-outline'
      case 'upcoming':   return 'time-outline'
      default:           return 'wallet-outline'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'trip':         return COLORS.success
      case 'cancellation': return COLORS.error
      case 'upcoming':     return '#0EA5E9'
      default:             return COLORS.textSecondary
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centered]}>
          <Ionicons name="warning" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Error al cargar ganancias</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadEarnings()}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Validación de rol: Solo conductores pueden acceder
  if (!user || user.role !== 'driver') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          {/* Icon */}
          <View style={styles.restrictedIcon}>
            <Ionicons name="lock-closed" size={48} color={COLORS.error} />
          </View>

          {/* Title */}
          <Text style={styles.restrictedTitle}>Acceso restringido</Text>

          {/* Message */}
          <Text style={styles.restrictedText}>
            Esta sección solo está disponible para conductores. Por favor, cambia tu rol a conductor.
          </Text>

          {/* Current Role Badge */}
          {user && (
            <View style={styles.roleBadge}>
              <Ionicons 
                name={user.role === 'driver' ? 'car' : 'person'} 
                size={18} 
                color={COLORS.textInverse}
              />
              <Text style={styles.roleBadgeText}>
                Rol actual: {user.role === 'driver' ? 'Conductor' : 'Pasajero'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.restrictedButtonContainer}>
            <TouchableOpacity
              style={styles.restrictedPrimaryBtn}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Profile' } as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle" size={20} color={COLORS.textInverse} />
              <Text style={styles.restrictedPrimaryBtnText}>Ir a Perfil y cambiar rol</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restrictedSecondaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.restrictedSecondaryBtnText}>Volver atrás</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Ganancias</Text>
          <Text style={styles.subtitle}>Resumen de tu actividad</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Balance Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Estimado de Ingresos</Text>
              <Text style={styles.balanceAmount}>{formatCOP(earnings?.totalEarnings || 0)}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={40} color="#fff" />
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceBottom}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Este Mes</Text>
              <Text style={styles.balanceItemValue}>{formatCOP(earnings?.thisMonthEarnings || 0)}</Text>
            </View>
            {(earnings?.upcomingAmount || 0) > 0 && (
              <>
                <View style={styles.balanceItemDivider} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Próximos</Text>
                  <Text style={styles.balanceItemValue}>{formatCOP(earnings?.upcomingAmount || 0)}</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Nota aclaratoria */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.disclaimerText}>
            Los pagos son directos entre conductor y pasajero. Este resumen es un estimado basado en tus reservas.
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="car-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{earnings?.completedTrips || 0}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{formatCOP(earnings?.averagePerTrip || 0)}</Text>
            <Text style={styles.statLabel}>Por Viaje</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{earnings?.totalRideHours || 0}h</Text>
            <Text style={styles.statLabel}>Conducción</Text>
          </View>
        </View>

        {/* Balance Mensual */}
        {(earnings?.monthlyBalances?.length ?? 0) > 0 && (
          <View style={styles.monthlySection}>
            <Text style={styles.sectionTitle}>Balance Mensual</Text>
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

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Resumen de Reservas</Text>

          {transactions.map((transaction, index) => {
            const color = getTransactionColor(transaction.type)
            const date = new Date(transaction.date)

            return (
              <View key={transaction.id}>
                <View style={styles.transactionItem}>
                  <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type) as any}
                      size={20}
                      color={color}
                    />
                  </View>

                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>
                      {date.toLocaleDateString('es-CO')} · {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: getTransactionColor(transaction.type) },
                    ]}
                  >
                    {transaction.type === 'cancellation' ? '-' : '+'}{formatCOP(transaction.amount)}
                  </Text>
                </View>

                {index < transactions.length - 1 && <View style={styles.divider} />}
              </View>
            )
          })}
        </View>

        <View style={{ height: SPACING.lg }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Restricted Access Screen
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  restrictedIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  restrictedTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  restrictedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  roleBadgeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  restrictedButtonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  restrictedPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  restrictedPrimaryBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  restrictedSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedSecondaryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  balanceCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    ...TYPOGRAPHY.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    ...TYPOGRAPHY.bold,
    fontSize: 28,
    color: '#fff',
  },
  walletIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: SPACING.lg,
  },
  balanceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemLabel: {
    ...TYPOGRAPHY.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  balanceItemValue: {
    ...TYPOGRAPHY.semibold,
    fontSize: 14,
    color: '#fff',
  },
  balanceItemDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary + '20',
  },
  periodBtnText: {
    ...TYPOGRAPHY.semibold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  periodBtnTextActive: {
    color: COLORS.primary,
  },
  transactionsSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    ...TYPOGRAPHY.semibold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  transactionDate: {
    ...TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  transactionAmount: {
    ...TYPOGRAPHY.bold,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  disclaimerText: {
    ...TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // Balance Mensual
  monthlySection: {
    marginBottom: SPACING.lg,
  },
  monthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
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
    ...TYPOGRAPHY.bold,
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
    ...TYPOGRAPHY.bold,
    fontSize: 13,
  },
  monthStatSub: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
})
