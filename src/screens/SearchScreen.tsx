import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
import DriverDetailsBottomSheet from '../components/DriverDetailsBottomSheet'
import { useDriverReputation } from '../hooks/useDriverReputation'
import { useFavoriteRoutes } from '../hooks/useFavoriteRoutes'

type SortOption = 'departure' | 'price' | 'rating' | 'available'
type TransportFilter = 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'
type AvailabilityFilter = 'all' | 'available'

const { width: SCREEN_W } = Dimensions.get('window')

function routeMatchesLocalSearch(r: Route, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const parts = q
    .split(/\s*→\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    const originQ = parts[0]
    const destQ = parts[parts.length - 1]
    return (
      r.origin.toLowerCase().includes(originQ) &&
      r.destination.toLowerCase().includes(destQ)
    )
  }
  return (
    r.origin.toLowerCase().includes(q) ||
    r.destination.toLowerCase().includes(q)
  )
}

// ── Driver Card ───────────────────────────────────────────────────────────────
function formatCardTime(dt: string) {
  const d = new Date(dt)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatCardDate(dt: string) {
  const d = new Date(dt)
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatPrice(n: number) {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function DriverCard({
  route,
  onReserve,
  onDetails,
  onToggleFavorite,
  isFav,
}: {
  route: Route
  onReserve: (r: Route) => void
  onDetails: (driverId: string) => void
  onToggleFavorite?: (r: Route) => void
  isFav?: boolean
}) {
  const occupied     = (route.total_seats ?? 0) - (route.available_seats ?? 0)
  const total        = route.total_seats ?? 1
  const pct          = Math.min((occupied / total) * 100, 100)
  const isAlmostFull = pct >= 70 && route.available_seats > 0
  const isFull       = route.available_seats === 0
  const isPreparing  = route.status && route.status !== 'active' && route.status !== 'completed'
  const initials     = (route.driver_name ?? 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const vehicleName  = [route.vehicle_make, route.vehicle_model].filter(Boolean).join(' ') || route.vehicle_type || 'Vehículo'

  return (
    <View style={card.wrap}>
      {/* ── Ruta + precio ── */}
      <View style={card.routeSection}>
        <View style={card.routeTrack}>
          <View style={card.trackDot} />
          <View style={card.trackLine} />
          <View style={[card.trackDot, card.trackDotEnd]} />
        </View>
        <View style={card.routeNames}>
          <Text style={card.originText} numberOfLines={1}>{route.origin}</Text>
          <Text style={card.destText} numberOfLines={1}>{route.destination}</Text>
        </View>
        <View style={card.routeMeta}>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(route)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              style={card.favBtn}
            >
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#E03131' : '#CBD5E1'} />
            </TouchableOpacity>
          )}
          <Text style={card.priceText}>{formatPrice(route.price_per_seat)}</Text>
          <Text style={card.timeText}>{formatCardDate(route.departure_time)} · {formatCardTime(route.departure_time)}</Text>
        </View>
      </View>

      <View style={card.divider} />

      {/* ── Conductor ── */}
      <View style={card.driverSection}>
        <TouchableOpacity style={card.avatarWrap} onPress={() => onDetails(route.driver_id)} activeOpacity={0.85}>
          {route.driver_avatar_url ? (
            <Image source={{ uri: route.driver_avatar_url }} style={card.avatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.primaryDark, '#0a2a6e']}
              style={card.avatarPlaceholder}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={card.avatarInitials}>{initials}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
        <View style={card.driverInfo}>
          <Text style={card.driverNameText} numberOfLines={1}>{route.driver_name ?? 'Conductor'}</Text>
          <View style={card.driverMetaRow}>
            <View style={card.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#1D4ED8" />
              <Text style={card.verifiedText}>VERIFICADO</Text>
            </View>
            <Text style={card.vehicleText} numberOfLines={1}>{vehicleName}</Text>
            {route.vehicle_plate ? (
              <View style={card.platePill}>
                <Text style={card.plateText}>{route.vehicle_plate}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={card.ratingWrap}>
          <Ionicons name="star" size={13} color="#FBBF24" />
          <Text style={card.ratingVal}>{(route.driver_rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>

      {/* ── Vía (opcional) ── */}
      {!!route.description && (
        <View style={card.viaStrip}>
          <Ionicons name="git-branch-outline" size={11} color={COLORS.accent} />
          <Text style={card.viaText} numberOfLines={1}>{route.description}</Text>
        </View>
      )}

      {/* ── Preparando salida ── */}
      {isPreparing && (
        <View style={card.preparingBadge}>
          <Ionicons name="time-outline" size={11} color="#4B5563" />
          <Text style={card.preparingText}>PREPARANDO SALIDA</Text>
        </View>
      )}

      <View style={card.divider} />

      {/* ── Ocupación + botón ── */}
      <View style={card.bottomRow}>
        <View style={card.occupancyWrap}>
          {isAlmostFull && <Text style={card.almostFullText}>¡CASI LLENO!</Text>}
          <View style={card.occupancyLabelRow}>
            <Text style={[card.occupancyFraction, isFull && { color: COLORS.error }]}>{occupied}/{total}</Text>
            <Text style={card.occupancyWord}> cupos</Text>
          </View>
          <View style={card.progressBg}>
            <View
              style={[
                card.progressFill,
                { width: `${pct}%` as any },
                isAlmostFull && { backgroundColor: '#D97706' },
                isFull && { backgroundColor: COLORS.error },
              ]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[card.reserveBtn, isFull && card.reserveBtnDisabled]}
          onPress={() => onReserve(route)}
          disabled={isFull}
          activeOpacity={0.85}
        >
          {isFull ? (
            <Text style={card.reserveTextDisabled}>Sin cupos</Text>
          ) : (
            <LinearGradient
              colors={['#0E2699', '#1230B8', '#1A3FCC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={card.reserveBtnInner}
            >
              <Text style={card.reserveText}>Reservar</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Info Cards (bottom) ───────────────────────────────────────────────────────
function InfoCards() {
  return (
    <View style={info.row}>
      <View style={info.card}>
        <Image source={require('../../assets/banners/frecuente.png')} style={info.img} resizeMode="cover" />
        <View style={info.overlay}>
          <Text style={info.titleDark}>Viaja{'\n'}seguido</Text>
          <Text style={info.subtitleDark}>Rutas diarias con{'\n'}conductores de confianza</Text>
        </View>
      </View>
      <View style={info.card}>
        <Image source={require('../../assets/banners/pago.png')} style={info.img} resizeMode="cover" />
        <View style={info.overlay}>
          <Text style={info.titleDark}>Paga como{'\n'}prefieras</Text>
          <Text style={info.subtitleDark}>Digital o en efectivo{'\n'}al conductor</Text>
        </View>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const navigation = useNavigation()
  const routeNav   = useRoute()
  const { routes, loading, error, fetchRoutes } = useRoutes()
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const user             = useAppStore((s) => s.user)
  const { isFavorite, addFavorite, removeFavorite } = useFavoriteRoutes(user?.id)

  const routeTransportType = useMemo(() => {
    if (routeNav.params && typeof routeNav.params === 'object' && 'transportType' in routeNav.params)
      return routeNav.params.transportType as TransportFilter
    return 'all'
  }, [routeNav.params])

  const routeDestination = useMemo(() => {
    if (routeNav.params && typeof routeNav.params === 'object' && 'destination' in routeNav.params)
      return String(routeNav.params.destination)
    return ''
  }, [routeNav.params])

  const routeOrigin = useMemo(() => {
    if (routeNav.params && typeof routeNav.params === 'object' && 'origin' in routeNav.params)
      return String(routeNav.params.origin)
    return ''
  }, [routeNav.params])

  const [search, setSearch]               = useState(() => {
    if (routeOrigin && routeDestination) return `${routeOrigin} → ${routeDestination}`
    return routeDestination || routeOrigin || ''
  })
  const [filter, setFilter]               = useState<AvailabilityFilter>('all')
  const [transportType, setTransportType] = useState<TransportFilter>(routeTransportType)
  const [sortBy, setSortBy]               = useState<SortOption>('departure')
  const [refreshing, setRefreshing]       = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [selectedDriver, setSelectedDriver]   = useState<{ id: string; name: string; route: Route } | null>(null)
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false)

  const { reputation, loading: reputationLoading } = useDriverReputation(selectedDriver?.id || '')

  useEffect(() => {
    if (routeOrigin && routeDestination) {
      setSearch(`${routeOrigin} → ${routeDestination}`)
    } else if (routeDestination) {
      setSearch(routeDestination)
    } else if (routeOrigin) {
      setSearch(routeOrigin)
    }
  }, [routeOrigin, routeDestination])

  const loadRoutes = useCallback(async (
    type: TransportFilter = transportType,
    origin?: string,
    destination?: string,
  ) => {
    try {
      await fetchRoutes(
        origin?.length ? origin : undefined,
        destination?.length ? destination : undefined,
        type,
      )
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'search_routes' })
      } else {
        errorHandler.handle(err, ErrorType.DATABASE, ErrorSeverity.MEDIUM, true, { context: 'search_routes_error' })
      }
    }
  }, [fetchRoutes, transportType])

  useFocusEffect(
    useCallback(() => {
      loadRoutes(routeTransportType, routeOrigin, routeDestination)
    }, [loadRoutes, routeTransportType, routeOrigin, routeDestination])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await loadRoutes(routeTransportType, routeOrigin, routeDestination) }
    finally { setRefreshing(false) }
  }, [loadRoutes, routeTransportType, routeOrigin, routeDestination])

  const displayRoutes = useMemo(() => {
    const filtered = routes.filter((r) => {
      const matchSearch = routeMatchesLocalSearch(r, search)
      const matchAvail  = filter === 'all' || r.available_seats > 0
      const matchType   = transportType === 'all' || r.vehicle_type === transportType
      return matchSearch && matchAvail && matchType
    })
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':     return a.price_per_seat - b.price_per_seat
        case 'available': return b.available_seats - a.available_seats
        case 'rating':    return (b.driver_rating || 0) - (a.driver_rating || 0)
        default:          return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
      }
    })
  }, [routes, search, filter, transportType, sortBy])

  const handleSelectRoute = (r: Route) => {
    setSelectedRoute(r)
    navigation.navigate('SeatSelection' as never)
  }

  const handleOpenDetails = (driverId: string) => {
    const r = displayRoutes.find((x) => x.driver_id === driverId)
    if (r) { setSelectedDriver({ id: driverId, name: r.driver_name || 'Conductor', route: r }); setBottomSheetVisible(true) }
  }

  const handleReserveFromSheet = () => {
    if (selectedDriver?.route) { setSelectedRoute(selectedDriver.route); setBottomSheetVisible(false); navigation.navigate('SeatSelection' as never) }
  }

  const handleToggleFavorite = useCallback(async (route: Route) => {
    if (isFavorite(route.id)) {
      await removeFavorite(route.id)
    } else {
      await addFavorite(route)
    }
  }, [isFavorite, addFavorite, removeFavorite])

  const showLoading = loading && routes.length === 0

  const renderCard = useCallback(({ item }: { item: Route }) => (
    <DriverCard
      route={item}
      onReserve={handleSelectRoute}
      onDetails={handleOpenDetails}
      onToggleFavorite={handleToggleFavorite}
      isFav={isFavorite(item.id)}
    />
  ), [handleSelectRoute, handleOpenDetails, handleToggleFavorite, isFavorite])

  const listHeader = useMemo(() => (
    showLoading ? (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.centerText}>Buscando vehículos...</Text>
      </View>
    ) : error ? (
      <View style={s.center}>
        <View style={s.errorIcon}><Ionicons name="alert-circle-outline" size={40} color={COLORS.error} /></View>
        <Text style={s.centerText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => loadRoutes()}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={s.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    ) : displayRoutes.length > 0 ? (
      <Text style={s.resultCount}>{displayRoutes.length} vehículo{displayRoutes.length !== 1 ? 's' : ''} disponible{displayRoutes.length !== 1 ? 's' : ''}</Text>
    ) : null
  ), [showLoading, error, displayRoutes.length, loadRoutes])

  const listEmpty = useMemo(() => (
    !showLoading && !error ? (
      <View style={s.center}>
        <View style={s.emptyIcon}><Ionicons name="car-outline" size={48} color={COLORS.primary} /></View>
        <Text style={s.emptyTitle}>No hay vehículos disponibles</Text>
        <Text style={s.emptySub}>
          {search || filter === 'available'
            ? 'Intenta con otros criterios de búsqueda'
            : 'Revisa de nuevo en unos minutos'}
        </Text>
      </View>
    ) : null
  ), [showLoading, error, search, filter])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <OfflineBanner />

      {/* ══ STICKY HEADER ═══════════════════════════════════════════════════ */}
      <View style={[s.header, isSearchFocused && s.headerFocused]}>
        {/* Title */}
        <Text style={s.screenTitle}>Rutas Disponibles</Text>
        <Text style={s.screenSub}>
          {user?.role === 'driver'
            ? 'Aquí ves tu ruta activa tal como la ven los pasajeros.'
            : 'Elige un vehículo y reserva tu asiento al instante.'}
        </Text>

        {/* Search + sort row */}
        <View style={s.searchRow}>
          <View style={[s.searchBox, isSearchFocused && s.searchBoxFocused]}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Origen, destino o Ciudad A → Ciudad B"
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
              accessibilityLabel="Filtrar por origen o destino"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={s.sortBtn}
            onPress={() => setShowSortModal(true)}
            accessibilityLabel="Ordenar resultados"
          >
            <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersContent}>
          {/* Availability */}
          <TouchableOpacity
            style={[s.chip, filter === 'available' && s.chipActive]}
            onPress={() => setFilter(filter === 'available' ? 'all' : 'available')}
          >
            <Ionicons name="checkmark-circle" size={14} color={filter === 'available' ? '#fff' : '#1230B8'} />
            <Text style={[s.chipText, filter === 'available' && s.chipTextActive]}>Con puestos</Text>
          </TouchableOpacity>

          <View style={s.chipSep} />

          {(['all', 'auto', 'taxi', 'busetica', 'buseta'] as TransportFilter[]).map((t) => {
            const icons: Record<TransportFilter, string> = { all: 'grid', auto: 'car-sport', taxi: 'car', busetica: 'bus', buseta: 'bus' }
            const labels: Record<TransportFilter, string> = { all: 'Todos', auto: 'Auto', taxi: 'Taxi', busetica: 'Minivan', buseta: 'Buseta' }
            const activeColors: Record<TransportFilter, string> = {
              all:      '#1230B8',
              auto:     '#1230B8',
              taxi:     '#F5C518',
              busetica: '#111111',
              buseta:   '#111111',
            }
            const isActive   = transportType === t
            const activeBg   = activeColors[t]
            const iconColor  = isActive ? (t === 'taxi' ? '#111111' : '#fff') : COLORS.textSecondary
            const textColor  = isActive ? (t === 'taxi' ? '#111111' : '#fff') : COLORS.textSecondary
            return (
              <TouchableOpacity
                key={t}
                style={[s.chip, isActive && { backgroundColor: activeBg, borderColor: activeBg }]}
                onPress={() => setTransportType(t)}
              >
                <Ionicons name={icons[t] as any} size={14} color={iconColor} />
                <Text style={[s.chipText, { color: textColor }]}>{labels[t]}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* ══ LIST ════════════════════════════════════════════════════════════ */}
      <FlatList
        data={showLoading || error ? [] : displayRoutes}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<InfoCards />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      />

      {/* ══ SORT MODAL ══════════════════════════════════════════════════════ */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Ordenar por</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {([
              { key: 'departure', label: 'Hora de salida',         icon: 'time-outline' },
              { key: 'price',     label: 'Precio (menor primero)', icon: 'cash-outline' },
              { key: 'available', label: 'Más puestos',            icon: 'people-outline' },
              { key: 'rating',    label: 'Mejor valorados',        icon: 'star-outline' },
            ] as { key: SortOption; label: string; icon: string }[]).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortOpt, sortBy === opt.key && s.sortOptActive]}
                onPress={() => { setSortBy(opt.key); setShowSortModal(false) }}
              >
                <Ionicons name={opt.icon as any} size={20} color={sortBy === opt.key ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[s.sortOptText, sortBy === opt.key && s.sortOptTextActive]}>{opt.label}</Text>
                {sortBy === opt.key && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ DRIVER BOTTOM SHEET ═════════════════════════════════════════════ */}
      <DriverDetailsBottomSheet
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        onReserve={handleReserveFromSheet}
        reputation={reputation}
        driverName={selectedDriver?.name || 'Conductor'}
        loading={reputationLoading}
        route={selectedDriver?.route}
      />
    </SafeAreaView>
  )
}

// ── Card styles ───────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.lg,
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
    gap: 4,
  },
  favBtn: {
    marginBottom: 2,
  },
  priceText: {
    fontSize: 17, fontWeight: '800', color: '#0E2699', letterSpacing: -0.3,
  },
  timeText: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '500',
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
  driverInfo: {
    flex: 1, gap: 4,
  },
  driverNameText: {
    fontSize: 14, fontWeight: '700', color: '#0E1C4E',
  },
  driverMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap',
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#EFF6FF', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  verifiedText: { fontSize: 9, fontWeight: '700', color: '#1D4ED8', letterSpacing: 0.3 },
  vehicleText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500' },
  platePill: {
    backgroundColor: '#F0F4FF', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#D6E0FF',
  },
  plateText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  ratingWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#FDE68A',
    flexShrink: 0,
  },
  ratingVal: { fontSize: 12, fontWeight: '700', color: '#92400E' },

  // ── Vía ──
  viaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: SPACING.md, marginBottom: 8,
    backgroundColor: `${COLORS.accent}10`,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, borderLeftWidth: 2, borderLeftColor: COLORS.accent,
  },
  viaText: { flex: 1, fontSize: 11, color: COLORS.accent, fontWeight: '500' },

  // ── Preparando ──
  preparingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderLeftWidth: 3, borderLeftColor: '#9CA3AF',
    marginBottom: 2,
  },
  preparingText: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 0.4 },

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
    alignItems: 'center',
  },
  reserveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  reserveTextDisabled: { fontSize: 13, fontWeight: '600', color: COLORS.textTertiary },
})

// ── Info card styles ──────────────────────────────────────────────────────────
const info = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    marginTop: SPACING.xl,
  },
  card: {
    flex: 1, borderRadius: RADIUS.xl,
    height: 120,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  titleDark: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.1, lineHeight: 18 },
  subtitleDark: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 3, lineHeight: 13 },
  cardLight: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1, borderColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 0,
  },
  iconWrapLight: { backgroundColor: `${COLORS.primary}15`, width: 44, height: 44, borderRadius: RADIUS.md },
  titleDark: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.1, lineHeight: 18 },
  subDark:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 14 },
  titleLight: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3, lineHeight: 22, textAlign: 'center' },
  subLight:   { fontSize: 11, color: COLORS.textSecondary, lineHeight: 14 },
})

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  headerFocused: { borderBottomColor: `${COLORS.primary}30` },

  screenTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: 6, marginTop: SPACING.sm },
  screenSub:   { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: SPACING.lg },

  searchRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, alignItems: 'center' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  searchBoxFocused: { backgroundColor: COLORS.surface, borderColor: COLORS.primary },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },
  sortBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },

  filtersContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  chipActive: { backgroundColor: '#1230B8', borderColor: '#1230B8' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },
  chipSep: { width: 1, height: 20, backgroundColor: COLORS.borderLight },

  // List
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  resultCount: {
    fontSize: 12, fontWeight: '600', color: COLORS.textTertiary,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, letterSpacing: 0.3,
  },

  // States
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  centerText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  errorIcon: {
    width: 64, height: 64, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.error}12`,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Sort modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  sortOpt: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
    gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  sortOptActive: { borderBottomColor: 'transparent' },
  sortOptText: { flex: 1, fontSize: 15, color: COLORS.textSecondary },
  sortOptTextActive: { color: COLORS.primary, fontWeight: '600' },
})
