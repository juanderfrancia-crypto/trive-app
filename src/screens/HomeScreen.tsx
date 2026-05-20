import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Alert,
  Linking,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { usePassengerHomeStats } from '../hooks/usePassengerHomeStats'
import { useProfile } from '../hooks/useProfile'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useUpcomingTrip, formatCountdown } from '../hooks/useUpcomingTrip'
import { useRecentRoutes } from '../hooks/useRecentRoutes'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - SPACING.lg * 2

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const MEMBERSHIP_CFG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  free:    { bg: 'rgba(107,114,128,0.12)', text: '#4B5563', icon: 'shield-outline',   label: 'Gratis'  },
  basic:   { bg: 'rgba(59,130,246,0.12)',  text: '#1D4ED8', icon: 'shield-checkmark', label: 'Básico'  },
  premium: { bg: 'rgba(168,85,247,0.12)',  text: '#6D28D9', icon: 'star',             label: 'Premium' },
  vip:     { bg: 'rgba(217,70,39,0.12)',   text: '#92400E', icon: 'crown',            label: 'VIP'     },
}

export default function HomeScreen() {
  const navigation   = useNavigation<any>()
  const insets       = useSafeAreaInsets()
  const [origin, setOrigin]           = useState('')
  const [destination, setDestination] = useState('')
  const [originFocused, setOriginFocused]           = useState(false)
  const [destinationFocused, setDestinationFocused] = useState(false)
  const [topRoutes, setTopRoutes]   = useState<Route[]>([])
  const [fetchingRoutes, setFetchingRoutes] = useState(false)
  const [activeDot, setActiveDot]   = useState(0)
  const pulseAnim    = useRef(new Animated.Value(1)).current
  const skeletonAnim = useRef(new Animated.Value(0.4)).current

  const user       = useAppStore((s) => s.user)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const { loading: routesLoading, error: routesError, fetchRoutes } = useRoutes()

  const isDriver = user?.role === 'driver'

  const { stats: passengerStats, loading: statsLoading }           = usePassengerHomeStats(isDriver ? undefined : user?.id)
  const { profile: driverProfile }                                  = useProfile(isDriver ? user?.id : undefined)
  const { trip: upcomingTrip, loading: tripLoading }               = useUpcomingTrip(isDriver ? undefined : user?.id)
  const { routes: recentRoutes }                                    = useRecentRoutes(isDriver ? undefined : user?.id)

  const showRoutesLoading = (fetchingRoutes || routesLoading) && topRoutes.length === 0
  const showRoutesError   = routesError && topRoutes.length === 0


  // ── Load top routes ────────────────────────────────────────────────────────
  const loadTopRoutes = useCallback(async () => {
    setFetchingRoutes(true)
    setTopRoutes([])
    try {
      const routes = await fetchRoutes(undefined, undefined, 'all', 'driver_rating', false, 6)
      setTopRoutes(routes)
    } catch { /* silently ignore */ } finally {
      setFetchingRoutes(false)
    }
  }, [fetchRoutes])

  useFocusEffect(useCallback(() => { loadTopRoutes() }, [loadTopRoutes]))

  // ── Pulse animation ────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.025, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,     duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
    return () => pulseAnim.setValue(1)
  }, [pulseAnim])

  // ── Skeleton shimmer ───────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
    return () => skeletonAnim.setValue(0.4)
  }, [skeletonAnim])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const membershipBadge = () => {
    const type   = user?.membership_type ?? 'free'
    const expiry = user?.membership_expiry ? new Date(user.membership_expiry) : null
    const days   = expiry && expiry > new Date() ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : 0
    const cfg    = MEMBERSHIP_CFG[type] ?? MEMBERSHIP_CFG.free
    return (
      <View style={styles.pillGlass}>
        <Ionicons name={cfg.icon as any} size={13} color="rgba(255,255,255,0.9)" />
        <Text style={styles.pillTextWhite}>
          {cfg.label}{days > 0 ? ` · ${days}d` : ''}
        </Text>
      </View>
    )
  }

  const metricValue = isDriver
    ? `$${(user?.balance ?? 0).toLocaleString('es-CO')}`
    : `$${(passengerStats?.spentThisMonth ?? 0).toLocaleString('es-CO')}`
  const metricLabel = isDriver ? 'Mi billetera' : 'Gastado este mes'
  const metricLoading = isDriver ? false : statsLoading

  // ── SOS ────────────────────────────────────────────────────────────────────
  const handleSOS = () => {
    if (!upcomingTrip) return
    Alert.alert(
      '🆘 Enviar SOS',
      '¿Enviar tu ubicación y datos del viaje a tu contacto de emergencia por WhatsApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('emergency_contact')
              if (!raw) {
                Alert.alert(
                  'Sin contacto de emergencia',
                  'Configura un contacto en Ajustes → Privacidad y Seguridad.',
                  [
                    { text: 'Ir a Ajustes', onPress: () => navigation.navigate('Settings' as never) },
                    { text: 'Cancelar', style: 'cancel' },
                  ]
                )
                return
              }
              const contact: { name: string; phone: string } = JSON.parse(raw)

              let lat = 3.4372
              let lng = -76.5197
              let hasLocation = false
              try {
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status === 'granted') {
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                  lat = pos.coords.latitude
                  lng = pos.coords.longitude
                  hasLocation = true
                }
              } catch {}

              const route = upcomingTrip.routeObj as any
              const parts = [route?.vehicle_color, route?.vehicle_make, route?.vehicle_plate].filter(Boolean)
              const vehicleStr = parts.length ? parts.join(' · ') : 'sin datos'
              const mapsLink = `https://maps.google.com/?q=${lat},${lng}`

              const message =
                `🆘 *EMERGENCIA — Estoy en un viaje con Trive*\n\n` +
                `Conductor: ${upcomingTrip.driverName}\n` +
                `Vehículo: ${vehicleStr}\n` +
                `Ruta: ${upcomingTrip.origin} → ${upcomingTrip.destination}\n` +
                `Asiento: ${upcomingTrip.seatNumber}\n\n` +
                `📍 Mi ubicación${hasLocation ? '' : ' (aprox.)'}:\n${mapsLink}\n\n` +
                `Por favor contáctame o reporta esta situación.`

              const digits = contact.phone.replace(/\D/g, '')
              const fullPhone = digits.length === 10 ? `57${digits}` : digits
              const waUrl = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(message)}`

              const canOpen = await Linking.canOpenURL(waUrl)
              if (canOpen) {
                await Linking.openURL(waUrl)
              } else {
                Alert.alert('WhatsApp no disponible', 'Instala WhatsApp para usar esta función.')
              }
            } catch {
              Alert.alert('Error', 'No se pudo enviar el SOS. Intenta de nuevo.')
            }
          },
        },
      ]
    )
  }

  // ── Navigate to upcoming trip ──────────────────────────────────────────────
  const goToTripStatus = () => {
    if (!upcomingTrip) return
    setSelectedRoute(upcomingTrip.routeObj)
    navigation.navigate('TripStatus' as never)
  }

  // ── Route card (carousel item) ─────────────────────────────────────────────
  const renderRouteCard = ({ item: route }: { item: Route }) => (
    <TouchableOpacity
      style={styles.routeCard}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
    >
      <LinearGradient
        colors={['#1535BE', '#1130B0', '#0C2490']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.routeCardInner}
      >
        {/* Route */}
        <View style={styles.routeTop}>
          <View style={styles.routeRouteWrap}>
            <View style={styles.routeDot} />
            <View style={styles.routeNames}>
              <Text style={styles.routeOrigin} numberOfLines={1}>{route.origin}</Text>
              <Text style={styles.routeDest}   numberOfLines={1}>→ {route.destination}</Text>
            </View>
          </View>
          <View style={styles.seatPill}>
            <Ionicons name="people-outline" size={12} color="#fff" />
            <Text style={styles.seatPillText}>
              {route.available_seats} {route.available_seats === 1 ? 'puesto' : 'puestos'}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.routeMeta}>
          <View style={styles.routeMetaItem}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.routeMetaText}>
              {new Date(route.departure_time).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <View style={styles.routeMetaItem}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.routeMetaText}>
              {new Date(route.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.routeMetaItem}>
            <Ionicons name="cash-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.routeMetaText}>${route.price_per_seat.toLocaleString('es-CO')}</Text>
          </View>
        </View>

        <View style={styles.routeDivider} />

        {/* Nota de ruta */}
        {!!route.description && (
          <View style={styles.routeViaRow}>
            <Ionicons name="git-branch-outline" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={styles.routeViaText} numberOfLines={2}>{route.description}</Text>
          </View>
        )}

        {/* Driver */}
        <View style={styles.routeDriver}>
          <View style={styles.driverAvatar}>
            {route.driver_avatar_url ? (
              <Image
                source={{ uri: route.driver_avatar_url }}
                style={styles.driverAvatarImg}
              />
            ) : (
              <Text style={styles.driverInitials}>
                {route.driver_name
                  ? route.driver_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'DR'}
              </Text>
            )}
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} numberOfLines={1}>{route.driver_name ?? 'Conductor'}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.ratingText}>{route.driver_rating?.toFixed(1) ?? '0.0'}</Text>
            </View>
          </View>
          {route.vehicle_type && (
            <View style={styles.vehicleTag}>
              <Text style={styles.vehicleTagText}>
                {route.vehicle_type.charAt(0).toUpperCase() + route.vehicle_type.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces>

        {/* ══ BANNER HERO SECTION ═══════════════════════════════════════════ */}
        <View style={styles.heroBgWrap}>
          <ImageBackground
            source={isDriver
              ? require('../../assets/banners/condu.png')
              : require('../../assets/banners/bannerper.png')
            }
            style={styles.heroBg}
            resizeMode="cover"
            imageStyle={{ transform: [{ scale: 1.1 }, { translateY: -10 }] }}
          >
            {/* ── Header ───────────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={[styles.wordmark, { color: '#fff' }]}>TRIVE</Text>
            </View>

            {/* ── Hero content ─────────────────────────────────────────────── */}
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <Text style={styles.heroGreetingWhite}>
                  {getGreeting()},{' '}
                  <Text style={{ fontWeight: '700', color: '#fff' }}>{user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Usuario'}</Text>
                </Text>
                {metricLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />}
              </View>
              {metricLoading ? (
                <>
                  <Animated.View style={[styles.skeletonAmountWhite, { opacity: skeletonAnim }]} />
                  <Animated.View style={[styles.skeletonLabelWhite, { opacity: skeletonAnim }]} />
                </>
              ) : (
                <>
                  <TouchableOpacity activeOpacity={isDriver ? 0.8 : 1} onPress={isDriver ? () => navigation.navigate('Wallet' as never) : undefined}>
                    <Text style={styles.heroAmountWhite}>{metricValue}</Text>
                  </TouchableOpacity>
                  <View style={styles.heroLabelRow}>
                    <Text style={styles.heroLabelWhite}>{metricLabel}</Text>
                    {isDriver && (
                      <TouchableOpacity style={styles.walletShortcut} onPress={() => navigation.navigate('Wallet' as never)} activeOpacity={0.8}>
                        <Ionicons name="wallet-outline" size={12} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.walletShortcutText}>Ver billetera</Text>
                        <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.7)" />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              <View style={styles.pillRow}>
                {!isDriver && membershipBadge()}
                {isDriver && (
                  <>
                    <View style={styles.pillGlass}>
                      <Ionicons name="car-outline" size={13} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.pillTextWhite}>{driverProfile?.total_trips ?? 0} viajes</Text>
                    </View>
                    <View style={styles.pillGlass}>
                      <Ionicons name="star" size={13} color="#FBBF24" />
                      <Text style={styles.pillTextWhite}>{user?.rating ?? '--'}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* ══ PRÓXIMO VIAJE (solo pasajeros) ════════════════════════════════ */}
        {!isDriver && (
          tripLoading ? null : upcomingTrip ? (
            <TouchableOpacity style={styles.upcomingCard} onPress={goToTripStatus} activeOpacity={0.92}>
              {/* Header strip */}
              <View style={styles.upcomingHeader}>
                <View style={styles.upcomingHeaderLeft}>
                  <View style={styles.upcomingDot} />
                  <Text style={styles.upcomingTitle}>Tu próximo viaje</Text>
                </View>
                <View style={styles.countdownBadge}>
                  <Ionicons name="time-outline" size={12} color={COLORS.success} />
                  <Text style={styles.countdownText}>Sale en {formatCountdown(upcomingTrip.minutesUntil)}</Text>
                </View>
              </View>

              {/* Route visualization */}
              <View style={styles.upcomingRoute}>
                <View style={styles.upcomingRoutePoints}>
                  <View style={styles.routePointBlue} />
                  <View style={styles.routePointLine} />
                  <View style={styles.routePointRed} />
                </View>
                <View style={styles.upcomingRouteLabels}>
                  <Text style={styles.upcomingCity} numberOfLines={1}>{upcomingTrip.origin}</Text>
                  <Text style={styles.upcomingCity} numberOfLines={1}>{upcomingTrip.destination}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.upcomingFooter}>
                <View style={styles.upcomingDriver}>
                  <View style={styles.upcomingAvatar}>
                    <Text style={styles.upcomingAvatarText}>{upcomingTrip.driverName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.upcomingDriverName}>{upcomingTrip.driverName}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={11} color="#FBBF24" />
                      <Text style={[styles.ratingText, { color: COLORS.textSecondary }]}>{upcomingTrip.driverRating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.seatBadge}>
                  <Ionicons name="person-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.seatBadgeText}>Asiento {upcomingTrip.seatNumber}</Text>
                </View>
              </View>

              {/* SOS row */}
              <TouchableOpacity style={styles.sosRow} onPress={handleSOS} activeOpacity={0.75}>
                <View style={styles.sosIconWrap}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                </View>
                <Text style={styles.sosRowText}>SOS · Enviar mi ubicación</Text>
                <Ionicons name="chevron-forward" size={13} color="#EF4444" />
              </TouchableOpacity>

              <View style={styles.upcomingCta}>
                <Text style={styles.upcomingCtaText}>Ver detalles del viaje</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ) : null
        )}

        {/* ══ BUSCAR VIAJE ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buscar viaje</Text>

          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <View style={styles.dotCol}>
                <View style={styles.dotBlue} />
                <View style={styles.dotLine} />
              </View>
              <View style={styles.searchField}>
                <Text style={styles.searchLabel}>DESDE</Text>
                <TextInput
                  style={[styles.searchInput, originFocused && styles.searchInputFocused]}
                  placeholder="Ej: Armenia, Cali..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={origin}
                  onChangeText={setOrigin}
                  onFocus={() => setOriginFocused(true)}
                  onBlur={() => setOriginFocused(false)}
                  accessibilityLabel="Origen"
                />
              </View>
            </View>

            <View style={styles.searchDividerRow}>
              <View style={styles.searchDivider} />
              <TouchableOpacity
                style={styles.swapBtn}
                onPress={() => { setOrigin(destination); setDestination(origin) }}
                accessibilityLabel="Intercambiar origen y destino"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.dotCol}>
                <View style={styles.dotRed} />
              </View>
              <View style={styles.searchField}>
                <Text style={styles.searchLabel}>HACIA</Text>
                <TextInput
                  style={[styles.searchInput, destinationFocused && styles.searchInputFocused]}
                  placeholder="Ej: Cali, Puerto Tejada..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={destination}
                  onChangeText={setDestination}
                  onFocus={() => setDestinationFocused(true)}
                  onBlur={() => setDestinationFocused(false)}
                  accessibilityLabel="Destino"
                />
              </View>
            </View>
          </View>

          {/* Rutas recientes */}
          {!isDriver && recentRoutes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll} contentContainerStyle={styles.recentContent}>
              {recentRoutes.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.recentChip}
                  onPress={() => { setOrigin(r.origin); setDestination(r.destination) }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.recentChipText} numberOfLines={1}>{r.origin} → {r.destination}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.searchBtn, (!origin || !destination) && styles.searchBtnDisabled]}
            disabled={!origin || !destination}
            onPress={() =>
              navigation.navigate('Main' as never, {
                screen: 'Search',
                params: { origin: origin.trim(), destination: destination.trim() },
              } as never)
            }
            accessibilityLabel="Buscar rutas"
            activeOpacity={0.85}
          >
            {origin && destination && (
              <LinearGradient
                colors={['#0E2699', '#1230B8', '#1A3FCC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Ionicons name="search" size={18} color={origin && destination ? '#fff' : COLORS.textTertiary} />
            <Text style={[styles.searchBtnText, (!origin || !destination) && styles.searchBtnTextDisabled]}>
              Buscar rutas
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══ VIAJES AHORA CTA ══════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.ctaWrapper}
              onPress={() => navigation.navigate('AvailableRides' as never)}
              accessibilityLabel="Viajes disponibles ahora"
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#0E2699', '#1230B8', '#1A3FCC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <View style={styles.ctaIconWrap}>
                  <Ionicons name="flash" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.ctaTextWrap}>
                  <Text style={styles.ctaTitle}>Viajes Ahora</Text>
                  <Text style={styles.ctaSubtitle}>Disponibles en tiempo real</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.65)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ══ AEROPUERTO — pasajero ════════════════════════════════════════ */}
        {!isDriver && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.airportBanner}
              onPress={() => navigation.navigate('AirportRequest' as never)}
              activeOpacity={0.88}
            >
              <View style={styles.airportIconWrap}>
                <Ionicons name="airplane" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.airportTextWrap}>
                <Text style={styles.airportBannerTitle}>¿Necesitas ir al aeropuerto?</Text>
                <Text style={styles.airportBannerSub}>Publica tu solicitud y un conductor te lleva</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ AEROPUERTO — conductor ════════════════════════════════════════ */}
        {isDriver && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.airportBanner}
              onPress={() => navigation.navigate('AirportFeed' as never)}
              activeOpacity={0.88}
            >
              <View style={styles.airportIconWrap}>
                <Ionicons name="airplane" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.airportTextWrap}>
                <Text style={styles.airportBannerTitle}>Solicitudes de aeropuerto</Text>
                <Text style={styles.airportBannerSub}>Ver pasajeros que necesitan conductor</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ RUTAS DESTACADAS (carrusel) ════════════════════════════════════ */}
        <View style={styles.sectionNoBottom}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Rutas destacadas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)} activeOpacity={0.7}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showRoutesLoading ? (
          <View style={[styles.section, styles.loadingBox]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando rutas...</Text>
          </View>
        ) : showRoutesError ? (
          <View style={[styles.section, styles.emptyBox]}>
            <Ionicons name="alert-circle-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No se pudieron cargar las rutas</Text>
          </View>
        ) : topRoutes.length > 0 ? (
          <>
            {/* Break out of section padding for full-bleed carousel */}
            <View style={styles.carouselWrapper}>
              <FlatList
                data={topRoutes}
                keyExtractor={(item) => item.id}
                renderItem={renderRouteCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_W + SPACING.md}
                decelerationRate="fast"
                contentContainerStyle={styles.carouselContent}
                ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + SPACING.md))
                  setActiveDot(Math.min(idx, topRoutes.length - 1))
                }}
              />
            </View>

            {/* Dot indicators */}
            {topRoutes.length > 1 && (
              <View style={styles.dotsRow}>
                {topRoutes.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeDot && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={[styles.section, styles.emptyBox]}>
            <Ionicons name="map-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No hay rutas destacadas</Text>
            <Text style={styles.emptySubtitle}>Revisa más tarde o busca manualmente</Text>
          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 32 },

  // ── Gradient Hero Background ─────────────────────────────────────────────────
  heroBgWrap: {
    borderRadius: 32,
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  heroBg: {
    width: '100%',
    minHeight: 220,
    paddingBottom: SPACING.xl,
  },
  decorCircle1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60,
  },
  decorCircle2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -40,
  },
  decorCircle3: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)', top: 55, right: 70,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  wordmark: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  avatarBtnGlass: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#fff' },
  avatarImage: { width: 40, height: 40, borderRadius: RADIUS.md },

  // ── Hero Content (floating on gradient) ──────────────────────────────────────
  heroContent: { paddingHorizontal: SPACING.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  heroGreetingWhite: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  heroGreetingDark: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  heroAmountWhite: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 2 },
  heroAmountDark: { fontSize: 34, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1, marginBottom: 2 },
  heroLabelWhite: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  walletShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  walletShortcutText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroLabelDark: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  pillSolid: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  pillTextDark: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  skeletonAmountWhite: {
    height: 40, width: 160, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 6,
  },
  skeletonLabelWhite: {
    height: 14, width: 110, borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: SPACING.md,
  },
  pillRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  pillGlass: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  pillTextWhite: { fontSize: 12, fontWeight: '600', color: '#fff' },
  // legacy (kept for safety)
  heroCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.lg, backgroundColor: '#EEF4FF', borderRadius: RADIUS.lg, padding: SPACING.lg },
  heroGreeting: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  heroName: { fontWeight: '700', color: COLORS.primary },
  heroAmount: { fontSize: 36, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1, marginBottom: 2 },
  heroLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  skeletonAmount: { height: 40, width: 160, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.primary}20`, marginBottom: 6 },
  skeletonLabel: { height: 14, width: 110, borderRadius: RADIUS.xs, backgroundColor: `${COLORS.primary}15`, marginBottom: SPACING.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(21,74,168,0.10)', paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // ── Upcoming Trip Card ───────────────────────────────────────────────────────
  upcomingCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 6,
  },
  upcomingHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  upcomingHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  upcomingTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  countdownBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  countdownText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  upcomingRoute: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  upcomingRoutePoints: { alignItems: 'center', gap: 0 },
  routePointBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routePointLine: { width: 2, height: 24, backgroundColor: COLORS.borderLight, marginVertical: 3 },
  routePointRed:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  upcomingRouteLabels: { flex: 1, gap: 22 },
  upcomingCity: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  upcomingFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  upcomingDriver: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  upcomingAvatar: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center',
  },
  upcomingAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  upcomingDriverName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  seatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full,
  },
  seatBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  sosRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  sosIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  sosRowText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#EF4444' },
  upcomingCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}08`,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  upcomingCtaText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionNoBottom: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm, overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  dotCol: { alignItems: 'center', width: 20, marginRight: SPACING.md },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  dotLine: { width: 2, minHeight: 18, backgroundColor: COLORS.borderLight, marginTop: 3 },
  dotRed:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  searchField: { flex: 1 },
  searchLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.8, marginBottom: 3 },
  searchInput: { fontSize: 15, color: COLORS.textPrimary, padding: 0 },
  searchInputFocused: { color: COLORS.primary },
  searchDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52,
    marginRight: SPACING.md,
  },
  searchDivider: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  swapBtn: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },

  // Recent route chips
  recentScroll: { marginBottom: SPACING.sm },
  recentContent: { gap: SPACING.sm, paddingVertical: 2 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full,
    maxWidth: 220,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  recentChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  searchBtn: {
    backgroundColor: '#1230B8', borderRadius: RADIUS.md, height: 50,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 10,
    overflow: 'hidden',
  },
  searchBtnDisabled: { backgroundColor: COLORS.borderLight, shadowOpacity: 0, elevation: 0 },
  searchBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  searchBtnTextDisabled: { color: COLORS.textTertiary },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  ctaWrapper: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  ctaIconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: '#EEF4FF', justifyContent: 'center', alignItems: 'center' },
  ctaTextWrap: { flex: 1 },
  ctaTitle:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  ctaSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // ── Airport banner ───────────────────────────────────────────────────────────
  airportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  airportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  airportTextWrap: { flex: 1 },
  airportBannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  airportBannerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // ── Carousel ──────────────────────────────────────────────────────────────────
  carouselWrapper: { marginBottom: SPACING.md },
  carouselContent: { paddingHorizontal: SPACING.lg },
  routeCard: {
    width: CARD_W, borderRadius: RADIUS.md, overflow: 'hidden',
    shadowColor: '#082D66', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.42, shadowRadius: 28, elevation: 18,
  },
  routeCardInner: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  routeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  routeRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginRight: SPACING.sm },
  routeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginTop: 5,
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 5,
  },
  routeNames: { flex: 1 },
  routeOrigin: {
    fontSize: 15, fontWeight: '700', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },
  routeDest: {
    fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  seatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  seatPillText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  routeMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: {
    fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  routeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: SPACING.sm },
  routeViaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: SPACING.sm },
  routeViaText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 15 },
  routeDriver: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  driverAvatar: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.32)',
    justifyContent: 'center', alignItems: 'center',
  },
  driverAvatarImg: { width: 34, height: 34, borderRadius: RADIUS.sm },
  driverInitials: {
    fontSize: 13, fontWeight: '700', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 13, fontWeight: '600', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },
  vehicleTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  vehicleTagText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },

  // Dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.borderLight },
  dotActive: { width: 18, backgroundColor: COLORS.primary },

  // ── Loading / Empty ───────────────────────────────────────────────────────────
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  emptyBox: { alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, gap: SPACING.sm },
  emptyTitle:    { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center' },
})
