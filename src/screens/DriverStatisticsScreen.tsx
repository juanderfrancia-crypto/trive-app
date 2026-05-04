import { useState, useEffect } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'

interface Statistic {
  label: string
  value: string | number
  unit?: string
  icon: string
  color: string
  trend?: 'up' | 'down'
  trendValue?: string
}

export default function DriverStatisticsScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore(s => s.user)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    // In a real app, fetch statistics from backend
    setLoading(false)
  }, [])

  const statistics: Statistic[] = [
    {
      label: 'Calificación Promedio',
      value: 4.8,
      unit: '/5.0',
      icon: 'star',
      color: COLORS.warning,
      trend: 'up',
      trendValue: '+0.2',
    },
    {
      label: 'Viajes Completados',
      value: 45,
      icon: 'car-outline',
      color: COLORS.primary,
      trend: 'up',
      trendValue: '+12',
    },
    {
      label: 'Tasa de Cancelación',
      value: 2,
      unit: '%',
      icon: 'close-circle-outline',
      color: COLORS.error,
      trend: 'down',
      trendValue: '-0.5%',
    },
    {
      label: 'Tiempo Promedio',
      value: 52,
      unit: 'min',
      icon: 'time-outline',
      color: COLORS.info,
    },
    {
      label: 'Distancia Total',
      value: 2850,
      unit: 'km',
      icon: 'locate-outline',
      color: COLORS.success,
    },
    {
      label: 'Pasajeros Satisfechos',
      value: 98,
      unit: '%',
      icon: 'happy-outline',
      color: COLORS.success,
    },
  ]

  const reviews = [
    {
      id: '1',
      rating: 5,
      comment: 'Excelente conductor, muy seguro y puntual',
      passengerInitial: 'A',
      date: '2026-04-05',
    },
    {
      id: '2',
      rating: 4,
      comment: 'Buen viaje, aunque se tardó un poco en llegar',
      passengerInitial: 'M',
      date: '2026-04-03',
    },
    {
      id: '3',
      rating: 5,
      comment: 'Vehículo limpio y conductor muy amable',
      passengerInitial: 'J',
      date: '2026-04-01',
    },
  ]

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>Tu desempeño como conductor</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodBtn, selectedPeriod === 'week' && styles.periodBtnActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodBtnText, selectedPeriod === 'week' && styles.periodBtnTextActive]}>
              Semana
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, selectedPeriod === 'month' && styles.periodBtnActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodBtnText, selectedPeriod === 'month' && styles.periodBtnTextActive]}>
              Mes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, selectedPeriod === 'year' && styles.periodBtnActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodBtnText, selectedPeriod === 'year' && styles.periodBtnTextActive]}>
              Año
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Stats */}
        <LinearGradient
          colors={[COLORS.primary + 'F5', COLORS.primary + 'A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainStatsCard}
        >
          <View style={styles.ratingContainer}>
            <View style={styles.ratingCircle}>
              <Text style={styles.ratingValue}>4.8</Text>
              <Text style={styles.ratingMax}>/5.0</Text>
            </View>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < 4 ? 'star' : 'star-half'}
                  size={20}
                  color={COLORS.warning}
                  style={{ marginRight: SPACING.xs }}
                />
              ))}
            </View>
          </View>
          <Text style={styles.mainStatsLabel}>Basado en 45 viajes</Text>
        </LinearGradient>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          {statistics.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>
                    {stat.value}
                    {stat.unit && <Text style={styles.statUnit}>{stat.unit}</Text>}
                  </Text>
                  {stat.trend && (
                    <View
                      style={[
                        styles.trendBadge,
                        {
                          backgroundColor:
                            stat.trend === 'up' ? COLORS.success + '20' : COLORS.error + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name={stat.trend === 'up' ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={stat.trend === 'up' ? COLORS.success : COLORS.error}
                      />
                      <Text
                        style={[
                          styles.trendText,
                          {
                            color: stat.trend === 'up' ? COLORS.success : COLORS.error,
                          },
                        ]}
                      >
                        {stat.trendValue}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reseñas Recientes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {reviews.map((review, index) => (
            <View key={review.id}>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerInitial}>{review.passengerInitial}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <View style={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={COLORS.warning}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.date).toLocaleDateString('es-CO')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>

              {index < reviews.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Performance Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={24} color={COLORS.warning} />
            <Text style={styles.tipsTitle}>Consejos para Mejorar</Text>
          </View>
          <Text style={styles.tipsText}>
            • Mantén una puntuación superior a 4.5 para más oportunidades\n
            • Completa viajes a su hora para aumentar confiabilidad\n
            • Sé cortés y profesional con los pasajeros
          </Text>
        </View>
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
  mainStatsCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ratingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ratingValue: {
    ...TYPOGRAPHY.bold,
    fontSize: 32,
    color: '#fff',
  },
  ratingMax: {
    ...TYPOGRAPHY.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  mainStatsLabel: {
    ...TYPOGRAPHY.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    ...TYPOGRAPHY.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  statUnit: {
    ...TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trendText: {
    ...TYPOGRAPHY.semibold,
    fontSize: 10,
  },
  reviewsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    ...TYPOGRAPHY.semibold,
    fontSize: 12,
    color: COLORS.primary,
  },
  reviewCard: {
    paddingVertical: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  reviewerInitial: {
    ...TYPOGRAPHY.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  reviewInfo: {
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  reviewDate: {
    ...TYPOGRAPHY.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    ...TYPOGRAPHY.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 56,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  tipsCard: {
    backgroundColor: COLORS.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tipsTitle: {
    ...TYPOGRAPHY.semibold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  tipsText: {
    ...TYPOGRAPHY.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
})
