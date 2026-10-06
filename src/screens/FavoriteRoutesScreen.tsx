import { useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rutas favoritas</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

        {!loading && favorites.length === 0 && (
          <View style={styles.empty}>
            <Illustration name="sharingArticles" width={170} />
            <Text style={styles.emptyTitle}>Sin rutas favoritas</Text>
            <Text style={styles.emptyText}>
              Guarda una ruta desde los resultados de búsqueda y aparecerá aquí para reservar más rápido.
            </Text>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
              activeOpacity={0.85}
            >
              <Icon name="Search" size={18} color={COLORS.white} />
              <Text style={styles.searchBtnText}>Buscar rutas</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && favorites.map((fav) => (
          <View key={fav.route_id} style={styles.card}>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot} />
                <Text style={styles.routeText} numberOfLines={1}>{fav.origin}</Text>
              </View>
              <Icon name="ArrowRight" size={16} color={COLORS.textTertiary} />
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
                <Icon name="Search" size={16} color={COLORS.white} />
                <Text style={styles.bookBtnText}>Buscar esta ruta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFavorite(fav.route_id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityLabel="Quitar de favoritas"
              >
                <Icon name="Trash2" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  loader: { marginTop: SPACING.xxl },

  empty: { alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  searchBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 50,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  searchBtnText: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },

  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routeDotEnd: { backgroundColor: COLORS.accent },
  routeText: { ...TYPOGRAPHY.bodyMedium, flex: 1, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  savedDate: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginBottom: SPACING.md },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  bookBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  bookBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
  removeBtn: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
