import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useFavoriteRoutes } from '../hooks/useFavoriteRoutes'

export default function FavoriteRoutesScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore(s => s.user)
  const { favorites, loading, removeFavorite, reloadFavorites } = useFavoriteRoutes(user?.id)

  useEffect(() => {
    if (user?.id) reloadFavorites()
  }, [user?.id, reloadFavorites])

  const handleSearch = (origin: string, destination: string) => {
    navigation.navigate('Main', { screen: 'Search', params: { origin, destination } })
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
            <Text style={styles.title}>Mis Rutas Favoritas</Text>
            <Text style={styles.subtitle}>Rutas guardadas desde los resultados de búsqueda</Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        {!loading && favorites.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="heart-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin rutas favoritas</Text>
            <Text style={styles.emptyText}>
              Toca el ícono ♡ en la esquina de cualquier card en la búsqueda para guardar una ruta aquí
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
            >
              <Ionicons name="search" size={20} color={COLORS.textInverse} />
              <Text style={styles.searchBtnText}>Ir a buscar rutas</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && favorites.length > 0 && (
          <View style={styles.content}>
            {favorites.map((fav) => (
              <View key={fav.route_id} style={styles.routeCard}>
                <View style={styles.routeRow}>
                  <View style={styles.routePoint}>
                    <View style={styles.routeDot} />
                    <Text style={styles.routeText} numberOfLines={1}>{fav.origin}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textTertiary} style={{ paddingHorizontal: SPACING.sm }} />
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotEnd]} />
                    <Text style={styles.routeText} numberOfLines={1}>{fav.destination}</Text>
                  </View>
                </View>

                <Text style={styles.savedDate}>
                  Guardada el {new Date(fav.saved_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleSearch(fav.origin, fav.destination)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search" size={16} color={COLORS.textInverse} />
                    <Text style={styles.bookBtnText}>Buscar esta ruta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFavorite(fav.route_id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  loadingContainer: {
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
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
    lineHeight: 22,
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
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    paddingTop: SPACING.sm,
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
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
    flex: 1,
  },
  savedDate: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textTertiary,
    marginBottom: SPACING.lg,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  bookBtn: {
    flex: 1,
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
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.error}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
