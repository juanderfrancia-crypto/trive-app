import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useSuggestedRoutes } from '../hooks/useSuggestedRoutes'

// Mock data - rutas favoritas guardadas
const mockFavoriteRoutes = [
  {
    id: '1',
    origin: 'Cali',
    destination: 'Puerto Tejada',
    price: 5500,
    frequency: 'Muy frecuente',
    avgTime: '45 min',
    icon: 'star',
  },
  {
    id: '2',
    origin: 'Jamundí',
    destination: 'Cali',
    price: 4200,
    frequency: 'Frecuente',
    avgTime: '35 min',
    icon: 'star-outline',
  },
]

export default function FavoriteRoutesScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore(s => s.user)
  const { suggestedRoutes, loading: suggestedLoading, fetchSuggestedRoutes } = useSuggestedRoutes(user?.id)
  const [favoriteRoutes, setFavoriteRoutes] = useState(mockFavoriteRoutes)
  const [savedSuggested, setSavedSuggested] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.id) {
      fetchSuggestedRoutes()
    }
  }, [user?.id, fetchSuggestedRoutes])

  const handleSaveSuggestedRoute = (origin: string, destination: string) => {
    const key = `${origin}|${destination}`
    const newRoute = {
      id: `suggested-${Date.now()}`,
      origin,
      destination,
      price: 0,
      frequency: 'Sugerida',
      avgTime: '—',
      icon: 'star',
    }

    setFavoriteRoutes([...favoriteRoutes, newRoute])
    setSavedSuggested((prev) => new Set([...prev, key]))

    Alert.alert(
      '✓ Guardada',
      `${origin} → ${destination} agregada a favoritos`,
      [{ text: 'Aceptar', style: 'default' }]
    )
  }

  const handleRemoveFavorite = (routeId: string, origin: string, destination: string) => {
    Alert.alert(
      'Quitar de favoritos',
      `¿Eliminar ${origin} → ${destination} de tus favoritos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => {} },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Rutas Favoritas</Text>
            <Text style={styles.subtitle}>Tus rutas más usadas</Text>
          </View>
        </View>

        {favoriteRoutes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="heart-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
            <Text style={styles.emptyText}>
              Guarda tus rutas frecuentes para acceder más rápido
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Search' as never)}
            >
              <Ionicons name="search" size={20} color={COLORS.textInverse} />
              <Text style={styles.searchBtnText}>Buscar rutas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* SECCIÓN: RUTAS SUGERIDAS DEL HISTORIAL */}
            {suggestedRoutes.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Rutas Sugeridas</Text>
                <Text style={styles.sectionSubtitle}>
                  Basadas en tu historial de viajes
                </Text>

                {suggestedLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : (
                  suggestedRoutes.map((route, index) => {
                    const key = `${route.origin}|${route.destination}`
                    const isSaved = savedSuggested.has(key)

                    return (
                      <View key={`suggested-${index}`} style={styles.suggestedRouteCard}>
                        <View style={styles.routeContent}>
                          <View style={styles.routeRow}>
                            <View style={styles.routePoint}>
                              <View style={styles.routeDot} />
                              <Text style={styles.routeText}>{route.origin}</Text>
                            </View>
                            <View style={styles.routeArrow}>
                              <Ionicons name="arrow-forward" size={14} color={COLORS.textTertiary} />
                            </View>
                            <View style={styles.routePoint}>
                              <View style={[styles.routeDot, styles.routeDotEnd]} />
                              <Text style={styles.routeText}>{route.destination}</Text>
                            </View>
                          </View>

                          <View style={styles.suggestedStats}>
                            <View style={styles.statBadge}>
                              <Ionicons name="repeat-outline" size={12} color={COLORS.primary} />
                              <Text style={styles.statText}>{route.frequency}x</Text>
                            </View>
                            {route.avgPrice && (
                              <View style={styles.statBadge}>
                                <Ionicons name="cash-outline" size={12} color={COLORS.success} />
                                <Text style={styles.statText}>
                                  ${route.avgPrice.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.saveSuggestedBtn,
                            isSaved && styles.saveSuggestedBtnSaved,
                          ]}
                          onPress={() =>
                            !isSaved && handleSaveSuggestedRoute(route.origin, route.destination)
                          }
                          disabled={isSaved}
                        >
                          <Ionicons
                            name={isSaved ? 'checkmark' : 'add'}
                            size={18}
                            color={isSaved ? COLORS.success : COLORS.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  })
                )}

                {suggestedRoutes.length > 0 && favoriteRoutes.length > 0 && (
                  <View style={styles.divider} />
                )}
              </View>
            )}

            {/* SECCIÓN: RUTAS FAVORITAS GUARDADAS */}
            {favoriteRoutes.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Mis Favoritas</Text>
                <Text style={styles.sectionInfo}>
                  {favoriteRoutes.length} ruta{favoriteRoutes.length > 1 ? 's' : ''} guardada{favoriteRoutes.length > 1 ? 's' : ''}
                </Text>

                {favoriteRoutes.map((route) => (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.starBadge}>
                    <Ionicons name={route.icon as any} size={16} color={COLORS.warning} />
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveFavorite(route.id, route.origin, route.destination)}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routePoint}>
                    <View style={styles.routeDot} />
                    <Text style={styles.routeText}>{route.origin}</Text>
                  </View>
                  <View style={styles.routeArrow}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.textTertiary} />
                  </View>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotEnd]} />
                    <Text style={styles.routeText}>{route.destination}</Text>
                  </View>
                </View>

                <View style={styles.routeDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>~{route.avgTime}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>${route.price.toLocaleString('es-CO')}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="repeat-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{route.frequency}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
                >
                  <Ionicons name="arrow-forward" size={18} color={COLORS.textInverse} />
                  <Text style={styles.bookBtnText}>Reservar ahora</Text>
                </TouchableOpacity>
              </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
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
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sectionInfo: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  searchBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  starBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    padding: SPACING.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routeDotEnd: {
    backgroundColor: COLORS.accent,
  },
  routeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  routeArrow: {
    paddingHorizontal: SPACING.md,
  },
  routeDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  bookBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Nueva sección: Rutas sugeridas
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  suggestedRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  routeContent: {
    flex: 1,
    gap: SPACING.md,
  },
  suggestedStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
  },
  statText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  saveSuggestedBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  saveSuggestedBtnSaved: {
    backgroundColor: COLORS.success + '15',
    borderColor: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
  },
  loadingContainer: {
    paddingVertical: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

