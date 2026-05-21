import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAvailableRides } from '../hooks/useAvailableRides'
import { SkeletonRideCard } from '../components/Skeleton'
import { useAppStore } from '../store/useAppStore'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'
import { supabase } from '../services/supabase'

type TabFilter = 'todos' | 'saliendo' | 'llegando'

export default function AvailableRidesScreen() {
  const navigation = useNavigation()
  const route      = useRoute<any>()
  const { rides, loading, error, refetch } = useAvailableRides()
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const authUser         = useAppStore((s) => s.authUser)
  const user             = useAppStore((s) => s.user)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<TabFilter>('todos')
  const [municipality, setMunicipality] = useState<string | null>(route.params?.municipality ?? null)
  const [showPicker, setShowPicker] = useState(false)

  // 🔄 Refetch whenever the screen is focused (e.g., returning from SeatSelection)
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleMunicipalitySelect = async (m: Municipality) => {
    setShowPicker(false)
    setMunicipality(m.name)
    if (user?.id) {
      await supabase.from('profiles').update({ preferred_municipality: m.name }).eq('id', user.id)
    }
  }

  const filteredRides = useMemo(() => {
    if (!municipality) return rides
    const mun = municipality.toLowerCase()
    return rides.filter((r: any) => {
      const origin = (r.origin ?? '').toLowerCase()
      const dest   = (r.destination ?? '').toLowerCase()
      if (tab === 'saliendo') return origin.includes(mun)
      if (tab === 'llegando') return dest.includes(mun)
      return origin.includes(mun) || dest.includes(mun)
    })
  }, [rides, municipality, tab])

  const handleReserve = (ride: any) => {
    if (!authUser) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reservar un viaje.', [
        { text: 'Aceptar', onPress: () => navigation.navigate('Login' as never) },
      ])
      return
    }

    // Set selected route in store
    setSelectedRoute(ride)

    // Navigate to seat selection
    navigation.navigate('SeatSelection' as never)
  }

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }, [])

  const getMinutesUntilDeparture = useCallback((dateString: string) => {
    const diffMins = Math.round((new Date(dateString).getTime() - Date.now()) / 60000)
    if (diffMins < 60) return `en ${diffMins} min`
    if (diffMins < 1440) return `en ${Math.round(diffMins / 60)}h`
    return `en ${Math.round(diffMins / 1440)}d`
  }, [])

  const renderRideCard = ({ item: ride }: any) => {
    const occupied     = (ride.total_seats ?? 0) - (ride.seats_available_count ?? 0)
    const total        = ride.total_seats ?? 1
    const pct          = Math.min((occupied / total) * 100, 100)
    const isAlmostFull = pct >= 70 && ride.seats_available_count > 0
    const isFull       = ride.seats_available_count === 0
    const initials     = (ride.driver_name ?? 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

    return (
      <View style={styles.rideCard}>
        {/* ── Ruta + precio ── */}
        <View style={styles.routeSection}>
          <View style={styles.routeTrack}>
            <View style={styles.trackDot} />
            <View style={styles.trackLine} />
            <View style={[styles.trackDot, styles.trackDotEnd]} />
          </View>
          <View style={styles.routeNames}>
            <Text style={styles.originText} numberOfLines={1}>{ride.origin}</Text>
            <Text style={styles.destText} numberOfLines={1}>{ride.destination}</Text>
          </View>
          <View style={styles.routeMeta}>
            <Text style={styles.priceText}>${Math.round(ride.price_per_seat).toLocaleString('es-CO')}</Text>
            <Text style={styles.departureLine}>
              {new Date(ride.departure_time).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}{formatTime(ride.departure_time)}
            </Text>
            <Text style={styles.minutesText}>{getMinutesUntilDeparture(ride.departure_time)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Conductor ── */}
        <View style={styles.driverSection}>
          <View style={styles.avatarWrap}>
            {ride.driver_photo ? (
              <Image source={{ uri: ride.driver_photo }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <LinearGradient
                colors={[COLORS.primaryDark, '#0a2a6e']}
                style={styles.avatarPlaceholder}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName} numberOfLines={1}>{ride.driver_name}</Text>
            <View style={styles.driverMetaRow}>
              <Text style={styles.vehicleText}>{ride.vehicle_type || 'Auto'}</Text>
              {!!ride.vehicle_color && <Text style={styles.vehicleText}>· {ride.vehicle_color}</Text>}
              {!!ride.vehicle_plate && (
                <View style={styles.platePill}>
                  <Text style={styles.plateText}>{ride.vehicle_plate}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={13} color="#FBBF24" />
            <Text style={styles.ratingVal}>{ride.driver_rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* ── Vía (opcional) ── */}
        {!!ride.description && (
          <View style={styles.viaStrip}>
            <Ionicons name="git-branch-outline" size={11} color={COLORS.accent} />
            <Text style={styles.viaText} numberOfLines={1}>{ride.description}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* ── Ocupación + botón ── */}
        <View style={styles.bottomRow}>
          <View style={styles.occupancyWrap}>
            {isAlmostFull && <Text style={styles.almostFullText}>¡CASI LLENO!</Text>}
            <View style={styles.occupancyLabelRow}>
              <Text style={[styles.occupancyFraction, isFull && { color: COLORS.error }]}>{occupied}/{total}</Text>
              <Text style={styles.occupancyWord}> cupos</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${pct}%` as any },
                isAlmostFull && { backgroundColor: '#D97706' },
                isFull && { backgroundColor: COLORS.error },
              ]} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.reserveBtn, isFull && styles.reserveBtnDisabled]}
            onPress={() => handleReserve(ride)}
            disabled={isFull}
            activeOpacity={0.85}
          >
            {isFull ? (
              <Text style={styles.reserveTextDisabled}>Sin cupos</Text>
            ) : (
              <LinearGradient
                colors={['#0E2699', '#1230B8', '#1A3FCC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.reserveBtnInner}
              >
                <Text style={styles.reserveText}>Reservar</Text>
                <Ionicons name="arrow-forward" size={13} color="#fff" />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No hay viajes disponibles</Text>
      <Text style={styles.emptyText}>
        Prueba con diferentes ciudades o horarios
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
        <Text style={styles.emptyButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  )

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={COLORS.error} />
      <Text style={styles.errorTitle}>Error cargando viajes</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={onRefresh}>
        <Text style={styles.errorButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Viajes Ahora</Text>
          {municipality ? (
            <TouchableOpacity style={styles.municipalityBadge} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
              <Ionicons name="location" size={11} color={COLORS.primary} />
              <Text style={styles.municipalityText} numberOfLines={1}>{municipality}</Text>
              <Ionicons name="chevron-down" size={11} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7}>
              <Text style={styles.municipalityEmpty}>Toca para elegir tu municipio</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['todos', 'saliendo', 'llegando'] as TabFilter[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'todos' ? 'Todos' : t === 'saliendo' ? `Saliendo de aquí` : `Llegando aquí`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && rides.length === 0 ? (
        <View style={styles.listContent}>
          <SkeletonRideCard />
          <SkeletonRideCard />
          <SkeletonRideCard />
        </View>
      ) : error && rides.length === 0 ? (
        renderError()
      ) : filteredRides.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRideCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}

      <MunicipalityPickerModal
        visible={showPicker}
        current={municipality}
        onSelect={handleMunicipalitySelect}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  municipalityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 2,
  },
  municipalityText: {
    fontSize: 12, fontWeight: '600', color: COLORS.primary,
    maxWidth: 180,
  },
  municipalityEmpty: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2,
  },
  filterBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, gap: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: '#F4F6FB',
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  loaderContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  loaderText: {
    fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14, color: COLORS.textSecondary,
    marginTop: SPACING.sm, textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.lg, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    fontSize: 14, fontWeight: '600', color: COLORS.surface,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.error, marginTop: SPACING.md,
  },
  errorText: {
    fontSize: 14, color: COLORS.textSecondary,
    marginTop: SPACING.sm, textAlign: 'center',
  },
  errorButton: {
    marginTop: SPACING.lg, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg, backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
  },
  errorButtonText: {
    fontSize: 14, fontWeight: '600', color: COLORS.surface,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E8EDFF',
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },

  // ── Sección ruta ──
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 12,
    gap: 10,
  },
  routeTrack: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  trackDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: '#fff',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
  },
  trackLine: {
    width: 1.5, height: 14, backgroundColor: '#CBD5E1',
  },
  trackDotEnd: {
    backgroundColor: '#fff',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  routeNames: {
    flex: 1,
    gap: 8,
  },
  originText: {
    fontSize: 15, fontWeight: '800', color: '#0E1C4E', letterSpacing: -0.3,
  },
  destText: {
    fontSize: 15, fontWeight: '700', color: '#334155', letterSpacing: -0.2,
  },
  routeMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  priceText: {
    fontSize: 17, fontWeight: '800', color: '#0E2699', letterSpacing: -0.3,
  },
  departureLine: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '500',
  },
  minutesText: {
    fontSize: 11, color: COLORS.success, fontWeight: '700',
  },

  divider: {
    height: 1, backgroundColor: '#F1F5F9', marginHorizontal: SPACING.md,
  },

  // ── Sección conductor ──
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    flexShrink: 0,
  },
  avatar: { width: 46, height: 46 },
  avatarPlaceholder: {
    width: 46, height: 46, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3,
  },
  driverDetails: {
    flex: 1, gap: 4,
  },
  driverName: {
    fontSize: 14, fontWeight: '700', color: '#0E1C4E',
  },
  driverMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap',
  },
  vehicleText: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '500',
  },
  platePill: {
    backgroundColor: '#F0F4FF', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#D6E0FF',
  },
  plateText: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5,
  },
  ratingWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#FDE68A',
    flexShrink: 0,
  },
  ratingVal: {
    fontSize: 12, fontWeight: '700', color: '#92400E',
  },

  // ── Vía ──
  viaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: SPACING.md, marginBottom: 8,
    backgroundColor: `${COLORS.accent}10`,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, borderLeftWidth: 2, borderLeftColor: COLORS.accent,
  },
  viaText: { flex: 1, fontSize: 11, color: COLORS.accent, fontWeight: '500' },

  // ── Fila inferior ──
  bottomRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    gap: SPACING.md,
  },
  occupancyWrap: { flex: 1, gap: 5 },
  almostFullText: {
    fontSize: 10, fontWeight: '800', color: '#92400E', letterSpacing: 0.4,
  },
  occupancyLabelRow: {
    flexDirection: 'row', alignItems: 'baseline',
  },
  occupancyFraction: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  occupancyWord: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  progressBg: {
    height: 5, backgroundColor: '#E8EDFF', borderRadius: RADIUS.full, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
  },
  reserveBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  reserveBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  reserveBtnDisabled: {
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 16,
    shadowOpacity: 0, elevation: 0,
    alignItems: 'center' as const,
  },
  reserveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  reserveTextDisabled: { fontSize: 13, fontWeight: '600', color: COLORS.textTertiary },
})
