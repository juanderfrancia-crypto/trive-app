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
  Pressable,
} from 'react-native'
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { usePassengerHomeStats } from '../hooks/usePassengerHomeStats'
import { useProfile } from '../hooks/useProfile'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useUpcomingTrip, formatCountdown } from '../hooks/useUpcomingTrip'
import { useRecentRoutes } from '../hooks/useRecentRoutes'
import { SkeletonRouteCard } from '../components/Skeleton'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { supabase } from '../services/supabase'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'

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
  const setSearchParams = useAppStore((s) => s.setSearchParams)
  const [origin, setOrigin]           = useState('')
  const [destination, setDestination] = useState('')
  const [originFocused, setOriginFocused]           = useState(false)
  const [destinationFocused, setDestinationFocused] = useState(false)
  const [topRoutes, setTopRoutes]   = useState<Route[]>([])
  const [fetchingRoutes, setFetchingRoutes] = useState(false)
  const [activeDot, setActiveDot]   = useState(0)
  const [pendingAirportCount, setPendingAirportCount] = useState(0)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false)
  const [preferredMunicipality, setPreferredMunicipality] = useState<string | null>(null)
  const pulseAnim    = useRef(new Animated.Value(1)).current
  const skeletonAnim = useRef(new Animated.Value(0.4)).current
  const heroEnterAnim = useRef(new Animated.Value(0)).current
  const upcomingEnterAnim = useRef(new Animated.Value(0)).current
  const countdownPulseAnim = useRef(new Animated.Value(1)).current

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


  // ── Cargar municipio preferido ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return
      supabase
        .from('profiles')
        .select('preferred_municipality')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const mun = data?.preferred_municipality ?? null
          setPreferredMunicipality(mun)
          if (mun) setOrigin((prev) => prev || mun)
        })
    }, [user?.id])
  )

  const handleAvailableRidesPress = () => {
    if (!preferredMunicipality) {
      setShowMunicipalityPicker(true)
    } else {
      navigation.navigate('AvailableRides' as never, { municipality: preferredMunicipality } as never)
    }
  }

  const handleMunicipalitySelect = async (m: Municipality) => {
    setShowMunicipalityPicker(false)
    setPreferredMunicipality(m.name)
    setOrigin((prev) => prev || m.name)
    if (user?.id) {
      await supabase.from('profiles').update({ preferred_municipality: m.name }).eq('id', user.id)
    }
    navigation.navigate('AvailableRides' as never, { municipality: m.name } as never)
  }

  const getMinutesUntilDeparture = (dateString: string) => {
    const diffMins = Math.round((new Date(dateString).getTime() - Date.now()) / 60000)
    if (diffMins < 60) return `en ${diffMins} min`
    if (diffMins < 1440) return `en ${Math.round(diffMins / 60)}h`
    return `en ${Math.round(diffMins / 1440)}d`
  }

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

  useFocusEffect(useCallback(() => {
    loadTopRoutes()
    if (isDriver) {
      supabase
        .from('airport_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }) => setPendingAirportCount(count ?? 0))
    }
  }, [loadTopRoutes, isDriver]))

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

  // ── Hero entrance animation ────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(heroEnterAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
    return () => heroEnterAnim.setValue(0)
  }, [heroEnterAnim])

  // ── Upcoming trip entrance animation ───────────────────────────────────────
  useEffect(() => {
    if (upcomingTrip) {
      Animated.timing(upcomingEnterAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }
    return () => upcomingEnterAnim.setValue(0)
  }, [upcomingTrip, upcomingEnterAnim])

  // ── Countdown badge pulse animation ───────────────────────────────────────
  useEffect(() => {
    if (upcomingTrip) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownPulseAnim, { toValue: 1.1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(countdownPulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start()
    }
    return () => countdownPulseAnim.setValue(1)
  }, [upcomingTrip, countdownPulseAnim])

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

  // ── Vehicle image selector ─────────────────────────────────────────────────
  const getVehicleImage = (vehicleType: string | null) => {
    if (!vehicleType) return null
    const type = vehicleType.toLowerCase()
    if (type.includes('van')) return require('../../assets/vehicles/van.png')
    if (type.includes('sedan')) return require('../../assets/vehicles/sedanblanco.png')
    return require('../../assets/vehicles/sedanblanco.png')
  }

  const metricValue = isDriver
    ? `$${(user?.balance ?? 0).toLocaleString('es-CO')}`
    : `${passengerStats?.tripsThisMonth ?? 0}`
  const metricLabel = isDriver ? 'Mi billetera' : 'Viajes este mes'
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
              const userId = useAppStore.getState().user?.id
              const { data: prof } = userId
                ? await supabase.from('profiles').select('emergency_contact').eq('id', userId).single()
                : { data: null }
              const contact: { name: string; phone: string } | null = prof?.emergency_contact ?? null
              if (!contact) {
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
      onPress={() => {
        console.log('[HomeScreen] Navegando a Search desde ruta destacada')
        navigation.navigate('Search', {})
      }}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.routeCardInner}
      >
        {/* Route */}
        <View style={styles.routeTop}>
          <View style={styles.routeRouteWrap}>
            <View style={styles.routeTrack}>
              <View style={styles.routeDot} />
              <View style={styles.routeTrackLine} />
              <View style={[styles.routeDot, { backgroundColor: '#fff', borderColor: COLORS.primary, borderWidth: 2 }]} />
            </View>
            <View style={styles.routeNames}>
              <Text style={styles.routeOrigin} numberOfLines={1}>{route.origin}</Text>
              <Text style={styles.routeDest} numberOfLines={1}>{route.destination}</Text>
            </View>
          </View>
          <View style={styles.routeMeta}>
            <Text style={styles.priceText}>${route.price_per_seat.toLocaleString('es-CO')}</Text>
            <Text style={styles.timeText}>
              {new Date(route.departure_time).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(route.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.minutesText}>{getMinutesUntilDeparture(route.departure_time)}</Text>
          </View>
        </View>

        <View style={styles.routeDivider} />

        {/* Nota de ruta */}
        {!!route.description && (
          <View style={styles.routeViaRow}>
            <Ionicons name="git-branch-outline" size={11} color={COLORS.accent} />
            <Text style={styles.routeViaText} numberOfLines={1}>{route.description}</Text>
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
              <Text style={[styles.driverInitials, { color: COLORS.primary, textShadowColor: 'transparent' }]}>
                {route.driver_name
                  ? route.driver_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'DR'}
              </Text>
            )}
          </View>
          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: COLORS.textPrimary }]} numberOfLines={1}>{route.driver_name ?? 'Conductor'}</Text>
            <View style={styles.ratingRow}>
              {route.vehicle_plate && (
                <View style={styles.platePill}>
                  <Text style={styles.plateText}>{route.vehicle_plate}</Text>
                </View>
              )}
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.ratingText}>{route.driver_rating?.toFixed(1) ?? '0.0'}</Text>
            </View>
          </View>
          {route.vehicle_type && getVehicleImage(route.vehicle_type) && (
            <Image
              source={getVehicleImage(route.vehicle_type)!}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDriver ? "light-content" : "dark-content"} translucent={false} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces>

        {/* ══ BANNER HERO SECTION ═══════════════════════════════════════════ */}
        <Animated.View
          style={[
            styles.heroBgWrap,
            {
              opacity: heroEnterAnim,
              transform: [
                {
                  translateY: heroEnterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ImageBackground
            source={isDriver
              ? require('../../assets/banners/condu.png')
              : require('../../assets/banners/bannerper.png')
            }
            style={styles.heroBg}
            resizeMode="cover"
            imageStyle={{ transform: [{ scale: 1.0 }, { translateY: 0 }] }}
          >
            {/* ── Header ───────────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={[styles.wordmark, { color: '#fff' }, isDriver && { textShadowColor: 'rgba(14, 38, 153, 0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }]}>TRIVE</Text>
            </View>

            {/* ── Hero content ─────────────────────────────────────────────── */}
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <Text style={isDriver ? styles.heroGreetingDark : styles.heroGreetingWhite}>
                  {getGreeting()},{' '}
                  <Text style={{ fontWeight: '700', color: isDriver ? COLORS.textPrimary : '#fff' }}>{user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Usuario'}</Text>
                </Text>
                {metricLoading && <ActivityIndicator size="small" color={isDriver ? COLORS.textSecondary : 'rgba(255,255,255,0.7)'} />}
              </View>
              {metricLoading ? (
                <>
                  <Animated.View style={[isDriver ? styles.skeletonAmountDark : styles.skeletonAmountWhite, { opacity: skeletonAnim }]} />
                  <Animated.View style={[isDriver ? styles.skeletonLabelDark : styles.skeletonLabelWhite, { opacity: skeletonAnim }]} />
                </>
              ) : (
                <>
                  <TouchableOpacity activeOpacity={isDriver ? 0.8 : 1} onPress={isDriver ? () => navigation.navigate('Wallet' as never) : undefined}>
                    <Text style={isDriver ? styles.heroAmountDark : styles.heroAmountWhite}>{metricValue}</Text>
                  </TouchableOpacity>
                  <View style={styles.heroLabelRow}>
                    {!isDriver && <Text style={styles.heroLabelWhite}>{metricLabel}</Text>}
                    {isDriver && (
                      <TouchableOpacity style={[styles.walletShortcut, isDriver && styles.walletShortcutDark]} onPress={() => navigation.navigate('Wallet' as never)} activeOpacity={0.8}>
                        <Ionicons name="wallet-outline" size={12} color={isDriver ? COLORS.textPrimary : 'rgba(255,255,255,0.9)'} />
                        <Text style={isDriver ? styles.walletShortcutTextDark : styles.walletShortcutText}>Ver billetera</Text>
                        <Ionicons name="chevron-forward" size={11} color={isDriver ? COLORS.textSecondary : 'rgba(255,255,255,0.7)'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              <View style={styles.pillRow}>
                {!isDriver && membershipBadge()}
                {isDriver && (
                  <>
                    <View style={isDriver ? styles.pillGlassDark : styles.pillGlass}>
                      <Ionicons name="car-outline" size={13} color={isDriver ? COLORS.textPrimary : 'rgba(255,255,255,0.9)'} />
                      <Text style={isDriver ? styles.pillTextDark : styles.pillTextWhite}>{driverProfile?.total_trips ?? 0} viajes</Text>
                    </View>
                    <View style={isDriver ? styles.pillGlassDark : styles.pillGlass}>
                      <Ionicons name="star" size={13} color="#FBBF24" />
                      <Text style={isDriver ? styles.pillTextDark : styles.pillTextWhite}>{user?.rating ?? '--'}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* ══ PRÓXIMO VIAJE (solo pasajeros) ════════════════════════════════ */}
        {!isDriver && (
          tripLoading ? null : upcomingTrip ? (
            <Animated.View
              style={{
                opacity: upcomingEnterAnim,
                transform: [
                  {
                    translateY: upcomingEnterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity style={styles.upcomingCard} onPress={goToTripStatus} activeOpacity={0.92}>
              {/* Header strip */}
              <View style={styles.upcomingHeader}>
                <View style={styles.upcomingHeaderLeft}>
                  <View style={styles.upcomingDot} />
                  <Text style={styles.upcomingTitle}>Tu próximo viaje</Text>
                </View>
                <Animated.View
                  style={[
                    styles.countdownBadge,
                    {
                      transform: [{ scale: countdownPulseAnim }],
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={12} color={COLORS.success} />
                  <Text style={styles.countdownText}>Sale en {formatCountdown(upcomingTrip.minutesUntil)}</Text>
                </Animated.View>
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
            </Animated.View>
          ) : null
        )}

        {/* ══ BUSCAR VIAJE ══════════════════════════════════════════════════ */}
        <View style={[styles.section, styles.searchSection]}>
          <View style={[
            styles.searchBox,
            (originFocused || destinationFocused) && styles.searchBoxFocused
          ]}>
            {/* Input Section */}
            <View style={styles.searchInputsContainer}>
              {/* Origen */}
              <View style={styles.searchInputRowVertical}>
                <View style={styles.dotOrigin} />
                <TextInput
                  style={styles.searchInputHorizontal}
                  placeholder="Origen"
                  placeholderTextColor={COLORS.textTertiary}
                  value={origin}
                  onChangeText={setOrigin}
                  onFocus={() => setOriginFocused(true)}
                  onBlur={() => setOriginFocused(false)}
                  accessibilityLabel="Origen"
                />
              </View>

              {/* Divider */}
              <View style={styles.searchDividerHorizontal} />

              {/* Destino */}
              <View style={styles.searchInputRowVertical}>
                <View style={styles.dotDestino} />
                <TextInput
                  style={styles.searchInputHorizontal}
                  placeholder="Destino"
                  placeholderTextColor={COLORS.textTertiary}
                  value={destination}
                  onChangeText={setDestination}
                  onFocus={() => setDestinationFocused(true)}
                  onBlur={() => setDestinationFocused(false)}
                  accessibilityLabel="Destino"
                />
              </View>
            </View>

            {/* Right Actions */}
            <View style={styles.searchActionsContainer}>
              {/* Swap Button */}
              <TouchableOpacity
                onPress={() => {
                  const temp = origin;
                  setOrigin(destination);
                  setDestination(temp);
                }}
                style={styles.searchActionButton}
              >
                <Ionicons name="swap-vertical" size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>

              {/* Clear Button */}
              <TouchableOpacity
                onPress={() => {
                  setOrigin('');
                  setDestination('');
                }}
                style={styles.searchActionButton}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
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

          {/* Botón Buscar Rutas */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!origin || !destination}
            onPress={() => {
              const o = origin.trim()
              const d = destination.trim()
              
              // Guardar parámetros en Zustand
              setSearchParams(o, d)
              
              // Cambiar a la pestaña Search
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'Search',
                })
              )
            }}
            style={[
              styles.searchBtn,
              (!origin || !destination) && styles.searchBtnDisabled,
              { marginTop: 0 },
            ]}
          >
            <Ionicons 
              name="search" 
              size={18} 
              color={origin && destination ? '#fff' : COLORS.textTertiary} 
            />
            <Text style={[styles.searchBtnText, (!origin || !destination) && styles.searchBtnTextDisabled]}>
              Buscar rutas
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══ CUPOS DISPONIBLES HOY ═════════════════════════════════════════ */}
        <View style={[styles.section, styles.ctaSection]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.ctaWrapper}
              onPress={handleAvailableRidesPress}
              accessibilityLabel="Ver cupos disponibles en tu municipio"
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#0E2699', '#1230B8', '#1A3FCC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <View style={styles.ctaIconWrap}>
                  <Ionicons name="flash" size={18} color="#fff" />
                </View>
                <View style={styles.ctaTextWrap}>
                  <Text style={styles.ctaTitle} numberOfLines={1}>Cupos Disponibles</Text>
                  <Text style={styles.ctaSubtitle} numberOfLines={1}>Hoy en {preferredMunicipality || 'tu municipio'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.65)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ══ SOLICITAR VIAJE PRIVADO — pasajero ═════════════════════════════ */}
        {!isDriver && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.airportBanner}
              onPress={() => navigation.navigate('AirportRequest' as never)}
              activeOpacity={0.88}
            >
              <View style={styles.airportIconWrap}>
                <Ionicons name="document-text" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.airportTextWrap}>
                <Text style={styles.airportBannerTitle}>Solicitar Viaje</Text>
                <Text style={styles.airportBannerSub}>Publica y negocia el precio</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ PUBLICAR RUTA + SOLICITUDES — conductor ════════════════════════ */}
        {isDriver && (
          <>
            {/* Publicar Ruta - Principal */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.airportBanner}
                onPress={() => setShowAddMenu(true)}
                activeOpacity={0.88}
              >
                <View style={styles.airportIconWrap}>
                  <Ionicons name="add-circle" size={22} color="#fff" />
                </View>
                <View style={styles.airportTextWrap}>
                  <Text style={[styles.airportBannerTitle, { color: '#fff' }]}>Publicar Ruta</Text>
                  <Text style={[styles.airportBannerSub, { color: 'rgba(255,255,255,0.8)' }]}>Vende cupos hoy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
              </TouchableOpacity>
            </View>

            {/* Solicitudes Especiales - Secundaria */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.airportBanner, pendingAirportCount > 0 && styles.airportBannerActive]}
                onPress={() => navigation.navigate('AirportFeed' as never)}
                activeOpacity={0.88}
              >
                <View style={styles.airportIconWrap}>
                  <Ionicons name="document-text" size={20} color={COLORS.primary} />
                  {pendingAirportCount > 0 && (
                    <View style={styles.airportBadge}>
                      <Text style={styles.airportBadgeText}>
                        {pendingAirportCount > 99 ? '99+' : pendingAirportCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.airportTextWrap}>
                  <Text style={styles.airportBannerTitle} numberOfLines={2}>Viajes Especiales</Text>
                  <Text style={[styles.airportBannerSub, pendingAirportCount > 0 && styles.airportBannerSubActive]} numberOfLines={1}>
                    {pendingAirportCount > 0
                      ? `${pendingAirportCount} solicitudes`
                      : 'Ver solicitudes'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={pendingAirportCount > 0 ? COLORS.primary : COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </>
        )}



      </ScrollView>

      <MunicipalityPickerModal
        visible={showMunicipalityPicker}
        current={preferredMunicipality}
        onSelect={handleMunicipalitySelect}
        onClose={() => setShowMunicipalityPicker(false)}
      />

      {/* ── Menú publicar ── */}
      {showAddMenu && (
        <View style={styles.addMenuOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowAddMenu(false)}
          />
          <View style={styles.addMenuSheet}>
            <View style={styles.addMenuHandle} />
            <Text style={styles.addMenuTitle}>¿Qué quieres hacer?</Text>

            <TouchableOpacity
              style={styles.addMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddMenu(false)
                setTimeout(() => navigation.navigate('DriverRegister' as never), 150)
              }}
            >
              <LinearGradient colors={['#0E2699', '#1A3FCC']} style={styles.addMenuItemIcon}>
                <Ionicons name="add-circle" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.addMenuItemTitle}>Crear ruta</Text>
                <Text style={styles.addMenuItemSub}>Publica un viaje nuevo ahora</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.addMenuDivider} />

            <TouchableOpacity
              style={styles.addMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddMenu(false)
                setTimeout(() => navigation.navigate('RecurringRoutes' as never), 150)
              }}
            >
              <LinearGradient colors={['#6C1FC6', '#8B5CF6']} style={styles.addMenuItemIcon}>
                <Ionicons name="repeat" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.addMenuItemTitle}>Plantillas de ruta</Text>
                <Text style={styles.addMenuItemSub}>Publica tus rutas habituales rápido</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: SPACING.md,
    marginTop: 0,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  heroBg: {
    width: '100%',
    minHeight: 126,
    paddingBottom: SPACING.xs,
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
    paddingTop: SPACING.xs,
    paddingBottom: 0,
  },
  wordmark: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 },
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
  heroContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  heroGreetingWhite: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  heroGreetingDark: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  heroAmountWhite: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  heroAmountDark: { fontSize: 34, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1, marginBottom: 4 },
  heroLabelWhite: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  walletShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  walletShortcutText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroLabelDark: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  pillSolid: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.xs, paddingVertical: 3, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  pillTextDark: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  skeletonAmountWhite: {
    height: 32, width: 140, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 4,
  },
  skeletonLabelWhite: {
    height: 12, width: 100, borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: SPACING.sm,
  },
  pillRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  pillGlass: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.xs, paddingVertical: 3, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  pillTextWhite: { fontSize: 11, fontWeight: '600', color: '#fff' },
  // Dark variants for conductor banner (white background)
  skeletonAmountDark: {
    height: 32, width: 140, borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}15`, marginBottom: 4,
  },
  skeletonLabelDark: {
    height: 12, width: 100, borderRadius: RADIUS.xs,
    backgroundColor: `${COLORS.primary}10`, marginBottom: SPACING.sm,
  },
  walletShortcutDark: {
    backgroundColor: `${COLORS.primary}12`,
    borderColor: `${COLORS.primary}20`,
  },
  walletShortcutTextDark: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  pillGlassDark: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}08`,
    paddingHorizontal: SPACING.xs, paddingVertical: 3, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: `${COLORS.primary}15`,
  },
  // legacy (kept for safety)
  heroCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.lg, backgroundColor: '#EEF4FF', borderRadius: RADIUS.lg, padding: SPACING.lg },
  heroGreeting: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  heroName: { fontWeight: '700', color: COLORS.primary },
  heroAmount: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1, marginBottom: 1 },
  heroLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  skeletonAmount: { height: 32, width: 140, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.primary}20`, marginBottom: 4 },
  skeletonLabel: { height: 12, width: 100, borderRadius: RADIUS.xs, backgroundColor: `${COLORS.primary}15`, marginBottom: SPACING.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(21,74,168,0.10)', paddingHorizontal: SPACING.xs, paddingVertical: 3, borderRadius: RADIUS.full },
  pillText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

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
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  upcomingHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  upcomingTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  countdownBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  countdownText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  upcomingRoute: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
  },
  upcomingRoutePoints: { alignItems: 'center', gap: 0 },
  routePointBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routePointLine: { width: 2, height: 28, backgroundColor: COLORS.borderLight, marginVertical: 3 },
  routePointRed:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  upcomingRouteLabels: { flex: 1, gap: 22 },
  upcomingCity: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  upcomingFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg,
  },
  upcomingDriver: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  upcomingAvatar: {
    width: 38, height: 38, borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center',
  },
  upcomingAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  upcomingDriverName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
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
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionNoBottom: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  ctaSection: { marginTop: SPACING.xs },
  searchSection: { marginTop: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3, marginBottom: SPACING.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 13, fontWeight: '500', color: COLORS.primary },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchBox: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    gap: 0,
    backgroundColor: '#EEEEEE',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingRight: 50,
    height: 160,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: SPACING.xl,
  },
  searchBoxFocused: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  searchInputsContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  searchInputRowVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  dotOrigin: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
    flexShrink: 0,
  },
  dotDestino: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    opacity: 0.5,
    flexShrink: 0,
  },
  searchDividerHorizontal: {
    height: 1,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 0,
  },
  searchInputHorizontal: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    padding: 0,
  },
  searchActionsContainer: {
    position: 'absolute',
    right: SPACING.md,
    top: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  searchActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md, overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  dotCol: { alignItems: 'center', width: 20, marginRight: SPACING.md },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  dotLine: { width: 2, minHeight: 18, backgroundColor: COLORS.borderLight, marginTop: 3 },
  dotRed:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  searchField: { flex: 1 },
  searchLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 2 },
  searchInput: { 
    fontSize: 14, 
    color: COLORS.textPrimary, 
    padding: 0,
    fontWeight: '500'
  },
  searchInputFocused: { 
    color: COLORS.primary,
    fontWeight: '600'
  },
  searchDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 48,
    marginRight: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  searchDivider: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  swapBtn: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },

  // Recent route chips
  recentScroll: { marginBottom: SPACING.sm, marginTop: -SPACING.md },
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
    elevation: 1,
  },
  recentChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  searchBtn: {
    backgroundColor: '#1230B8', borderRadius: RADIUS.md, height: 48,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    overflow: 'hidden',
    paddingHorizontal: SPACING.xl,
    width: '95%',
    alignSelf: 'center',
  },
  searchBtnDisabled: { backgroundColor: COLORS.borderLight, shadowOpacity: 0, elevation: 0 },
  searchBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchBtnTextDisabled: { color: COLORS.textTertiary },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  ctaWrapper: {
    borderRadius: RADIUS.lg, overflow: 'hidden',
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    width: '82%',
    alignSelf: 'center',
  },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.md, height: 48 },
  ctaIconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: '#EEF4FF', justifyContent: 'center', alignItems: 'center' },
  ctaTextWrap: { flex: 1 },
  ctaTitle:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  ctaSubtitle: { fontSize: 8.5, color: 'rgba(255,255,255,0.8)', marginTop: 0 },

  // ── Airport banner ───────────────────────────────────────────────────────────
  airportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  airportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  airportBannerActive: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  airportTextWrap: { flex: 1 },
  airportBannerTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  airportBannerTitleSm: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 17 },
  airportBannerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  airportBannerSubActive: { color: COLORS.primary, fontWeight: '600' },
  airportBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  airportBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },

  // ── Carousel ──────────────────────────────────────────────────────────────────
  carouselWrapper: { marginBottom: SPACING.md },
  carouselContent: { paddingHorizontal: SPACING.lg },
  carouselEdgeFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 5,
  },
  routeCard: {
    width: CARD_W, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDFF',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  routeCardInner: { paddingHorizontal: 0, paddingVertical: 0, gap: 0, backgroundColor: '#fff' },
  routeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 12, gap: 10, marginBottom: 0 },
  routeRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 0 },
  routeTrack: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  routeTrackLine: {
    width: 1.5, height: 14, backgroundColor: '#CBD5E1',
  },
  routeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 0,
    borderWidth: 1.5, borderColor: '#fff',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
  },
  routeNames: { flex: 1, gap: 8 },
  priceText: {
    fontSize: 17, fontWeight: '800', color: '#0E2699', letterSpacing: -0.3,
  },
  timeText: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '500',
  },
  routeOrigin: {
    fontSize: 15, fontWeight: '800', color: '#0E1C4E', letterSpacing: -0.3,
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },
  routeDest: {
    fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 0,
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  seatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
    paddingHorizontal: SPACING.xs, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  seatPillText: { fontSize: 10, fontWeight: '600', color: COLORS.textPrimary },
  routeMeta: { flexDirection: 'column', gap: 4, marginBottom: 0, alignItems: 'flex-end', justifyContent: 'flex-start' },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: {
    fontSize: 11, fontWeight: '500', color: COLORS.textTertiary,
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  routeDivider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: SPACING.md, marginBottom: 0, marginTop: 0 },
  routeViaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: SPACING.md, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: `${COLORS.accent}10`, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: COLORS.accent },
  routeViaText: { flex: 1, fontSize: 11, color: COLORS.accent, fontWeight: '500' },
  routeDriver: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 12, gap: SPACING.sm },
  driverAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 0,
    borderColor: `${COLORS.primary}20`,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  driverAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  driverInitials: {
    fontSize: 17, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3,
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  driverInfo: { flex: 1, gap: 4 },
  driverName: {
    fontSize: 14, fontWeight: '700', color: '#0E1C4E',
  },
  ratingRow:  { 
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#FDE68A',
    alignSelf: 'flex-start', flexShrink: 0
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  minutesText: { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  platePill: {
    backgroundColor: '#F0F4FF', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#D6E0FF',
  },
  plateText: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5,
  },
  vehicleTag: {
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
    paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  vehicleTagText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  vehicleImage: { width: 70, height: 50, flexShrink: 0 },

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

  // ── Publicar ruta (botón redondo junto a aeropuerto) ─────────────────────────
  publishRoundBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#0E2699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  publishRoundBtnInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add menu
  addMenuOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
    zIndex: 999,
  },
  addMenuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingBottom: 36, paddingTop: 10,
  },
  addMenuHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D6E0FF', alignSelf: 'center', marginBottom: 16,
  },
  addMenuTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    letterSpacing: 0.3, marginBottom: SPACING.md, textTransform: 'uppercase',
  },
  addMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
  },
  addMenuItemIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  addMenuItemTitle: {
    fontSize: 15, fontWeight: '700', color: '#0E1C4E',
  },
  addMenuItemSub: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2,
  },
  addMenuDivider: {
    height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 58,
  },
})
