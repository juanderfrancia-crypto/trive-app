import React, { useState, useCallback } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, RefreshControl, Image } from 'react-native'
import { Text } from '../components/AppText'
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import DepthCard from '../components/DepthCard'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { useUpcomingTrip, formatCountdown } from '../hooks/useUpcomingTrip'
import { useRecentRoutes } from '../hooks/useRecentRoutes'
import { supabase } from '../services/supabase'
import { showSuccess, showError } from '../utils/showError'
import { toEmergencyContact } from '../utils/emergencyContact'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'
import { usePassengerBookings, confirmPassengerTrip } from './passenger/usePassengerBookings'
import { useTodayDepartures } from './passenger/useTodayDepartures'
import { formatDia, formatHoraPartes, formatPrecio } from './passenger/passengerFormat'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function PassengerHomeScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const setSearchParams = useAppStore((s) => s.setSearchParams)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [preferredMunicipality, setPreferredMunicipality] = useState<string | null>(null)
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false)

  const { trip: upcomingTrip, loading: tripLoading } = useUpcomingTrip(user?.id)
  const { routes: recentRoutes } = useRecentRoutes(user?.id)
  const { bookings, refetch: refetchBookings } = usePassengerBookings(user?.id)
  const { rides: salidasHoy, reload: reloadDepartures, hasMore: masSalidasHoy } = useTodayDepartures(preferredMunicipality, user?.id)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchBookings(), reloadDepartures()])
    setRefreshing(false)
  }

  const reservaPorConfirmar = bookings.find((b) => b.bookingStatus === 'awaiting_confirmation') ?? null

  useFocusEffect(
    useCallback(() => {
      refetchBookings()
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
    }, [user?.id, refetchBookings])
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

  const handleSearch = () => {
    navigation.navigate('AvailableRides' as never, { origin: origin.trim(), destination: destination.trim(), passengers: 1 } as never)
  }

  const handleConfirmTrip = async () => {
    if (!reservaPorConfirmar) return
    try {
      await confirmPassengerTrip(reservaPorConfirmar.bookingId)
      showSuccess('¡Gracias por confirmar!')
      refetchBookings()
    } catch (err: any) {
      showError(err?.message || 'No se pudo registrar tu respuesta')
    }
  }

  const handleSOS = () => {
    if (!upcomingTrip) return
    Alert.alert(
      'Enviar SOS',
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
              const contact = toEmergencyContact(prof?.emergency_contact)
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

              try {
                await Linking.openURL(waUrl)
              } catch {
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

  const goToTripStatus = () => {
    if (!upcomingTrip) return
    setSelectedRoute(upcomingTrip.routeObj)
    navigation.navigate('TripStatus' as never)
  }

  const canSearch = !!origin.trim() && !!destination.trim()
  const firstName = user?.name?.split(' ')[0] ?? 'Usuario'
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const [avatarBroken, setAvatarBroken] = useState(false)
  const confirmarHoy = reservaPorConfirmar ? formatDia(reservaPorConfirmar.departureTime) === 'Hoy' : false

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile' as never)}
            activeOpacity={0.75}
            accessibilityLabel="Ir a mi perfil"
          >
            {user?.avatar_url && !avatarBroken ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImg}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Illustration name="routePlanning" width={220} />
        </View>

        <Text style={styles.headline}>¿A dónde vas hoy?</Text>

        <DepthCard style={styles.searchCardWrap} contentStyle={styles.searchCardContent} borderColor={COLORS.textPrimary}>
          <View style={styles.searchRow}>
            <Icon name="CircleDot" size={18} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿De dónde sales?"
              placeholderTextColor={COLORS.textTertiary}
              value={origin}
              onChangeText={setOrigin}
              accessibilityLabel="Origen"
            />
          </View>
          <View style={styles.searchDivider} />
          <View style={styles.searchRow}>
            <Icon name="MapPin" size={18} color={COLORS.textPrimary} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿A dónde vas?"
              placeholderTextColor={COLORS.textTertiary}
              value={destination}
              onChangeText={setDestination}
              accessibilityLabel="Destino"
            />
            {!!(origin || destination) && (
              <TouchableOpacity
                onPress={() => { setOrigin(''); setDestination('') }}
                accessibilityLabel="Limpiar"
                hitSlop={8}
              >
                <Icon name="CircleX" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSearch}
            onPress={handleSearch}
            style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
          >
            <Icon name="Search" size={18} color={canSearch ? COLORS.white : COLORS.textTertiary} />
            <Text style={[styles.searchBtnText, !canSearch && styles.searchBtnTextDisabled]}>Buscar cupos</Text>
          </TouchableOpacity>
        </DepthCard>

        {recentRoutes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
            {recentRoutes.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => { setOrigin(r.origin); setDestination(r.destination) }}
                activeOpacity={0.75}
              >
                <Icon name="Clock" size={13} color={COLORS.textSecondary} />
                <Text style={styles.chipText} numberOfLines={1}>{r.origin} → {r.destination}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {reservaPorConfirmar && (
          <View style={styles.confirmCard}>
            <Svg width={56} height={44} viewBox="0 0 56 40" style={styles.confirmIcon}>
              <Ellipse cx="28" cy="36" rx="22" ry="2.5" fill={COLORS.primary} opacity={0.15} />
              <Path d="M6 26 Q6 20 12 19 L18 13 Q21 9 28 9 L36 9 Q41 9 44 13 L49 19 Q53 20 53 26 L53 30 Q53 33 50 33 L9 33 Q6 33 6 30 Z" fill={COLORS.primary} />
              <Path d="M20 19 Q23 14 28 14 L36 14 Q40 14 42 19 Z" fill={COLORS.primaryTint} />
              <Circle cx="16" cy="33" r="5" fill={COLORS.textPrimary} />
              <Circle cx="16" cy="33" r="2" fill={COLORS.primaryTint} />
              <Circle cx="43" cy="33" r="5" fill={COLORS.textPrimary} />
              <Circle cx="43" cy="33" r="2" fill={COLORS.primaryTint} />
              <Ellipse cx="50" cy="24" rx="2" ry="1.5" fill={COLORS.white} />
            </Svg>
            <View style={styles.confirmText}>
              <Text style={styles.confirmTitle}>{confirmarHoy ? 'Confirma tu viaje de hoy' : 'Confirma tu viaje'}</Text>
              <Text style={styles.confirmSub}>Tienes 24 h para confirmar. Si no, se confirma solo.</Text>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmTrip} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!tripLoading && upcomingTrip && (
          <TouchableOpacity style={styles.tripCard} onPress={goToTripStatus} activeOpacity={0.92}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripLabel}>Tu próximo viaje</Text>
              <View style={styles.countdown}>
                <Icon name="Clock" size={12} color={COLORS.success} />
                <Text style={styles.countdownText}>Sale en {formatCountdown(upcomingTrip.minutesUntil)}</Text>
              </View>
            </View>
            <Text style={styles.tripRoute} numberOfLines={1}>{upcomingTrip.origin} → {upcomingTrip.destination}</Text>
            <View style={styles.tripFooter}>
              <Text style={styles.tripDriver} numberOfLines={1}>{upcomingTrip.driverName} · ★ {upcomingTrip.driverRating.toFixed(1)}</Text>
              <View style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>Asiento {upcomingTrip.seatNumber}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sosRow} onPress={handleSOS} activeOpacity={0.75}>
              <Icon name="CircleAlert" size={16} color={COLORS.error} />
              <Text style={styles.sosText}>Enviar mi ubicación por SOS</Text>
              <Icon name="ChevronRight" size={14} color={COLORS.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Salidas de hoy</Text>
          <TouchableOpacity onPress={handleAvailableRidesPress} hitSlop={8}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ridesList}>
          {salidasHoy.length === 0 ? (
            <View style={styles.ridesEmpty}>
              <Text style={styles.ridesEmptyText}>Aún no hay salidas publicadas para hoy</Text>
            </View>
          ) : salidasHoy.map((ride) => {
            const hora = formatHoraPartes(ride.departure_time)
            return (
              <TouchableOpacity key={ride.id} style={styles.rideRow} onPress={handleAvailableRidesPress} activeOpacity={0.8}>
                <View style={styles.rideTime}>
                  <Text style={styles.rideHour}>{hora.hora}</Text>
                  <Text style={styles.ridePeriod}>{hora.periodo}</Text>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rideTimeShadow}
                  />
                </View>
                <View style={styles.rideMiddle}>
                  <Text style={styles.rideDriver} numberOfLines={1}>{ride.driver_name} · {ride.driver_rating ? `★ ${Number(ride.driver_rating).toFixed(1)}` : 'Nuevo'}</Text>
                  <Text style={styles.rideSeats}>
                    {ride.available_seats} {ride.available_seats === 1 ? 'cupo libre' : 'cupos libres'} · Sale en {formatCountdown(Math.max(0, Math.round((new Date(ride.departure_time).getTime() - Date.now()) / 60000)))}
                  </Text>
                </View>
                <Text style={styles.ridePrice}>{formatPrecio(ride.price_per_seat)}</Text>
              </TouchableOpacity>
            )
          })}
          {masSalidasHoy && (
            <TouchableOpacity style={styles.moreRidesRow} onPress={handleAvailableRidesPress} activeOpacity={0.75}>
              <Text style={styles.moreRidesText}>Hay más rutas saliendo hoy</Text>
              <Icon name="ChevronRight" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.airportLink} onPress={() => navigation.navigate('AirportRequest' as never)} activeOpacity={0.75}>
          <Text style={styles.airportText}>
            ¿Vas a otro lugar? <Text style={styles.airportLinkText}>Publica una ruta personalizada</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <MunicipalityPickerModal
        visible={showMunicipalityPicker}
        current={preferredMunicipality}
        onSelect={handleMunicipalitySelect}
        onClose={() => setShowMunicipalityPicker(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
    textShadowColor: COLORS.shadowBlue,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  avatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
    marginTop: SPACING.xl,
    lineHeight: 42,
    textShadowColor: COLORS.shadowBlue,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },

  searchCardWrap: { marginTop: SPACING.lg },
  searchCardContent: { padding: SPACING.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, height: 48 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  searchDivider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 30 },
  searchBtn: {
    marginTop: SPACING.md, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.primaryDark,
  },
  searchBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  searchBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  searchBtnTextDisabled: { color: COLORS.textSecondary },

  chipsScroll: { marginTop: SPACING.md },
  chipsContent: { gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, maxWidth: 220 },

  confirmCard: {
    marginTop: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, backgroundColor: COLORS.primaryTint,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
  },
  confirmIcon: { flexShrink: 0 },
  confirmText: { flex: 1 },
  confirmTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  confirmSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  confirmBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 1, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  tripCard: {
    marginTop: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, backgroundColor: COLORS.primaryTint,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  countdown: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full,
  },
  countdownText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  tripRoute: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
  tripDriver: { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: SPACING.sm },
  seatBadge: { backgroundColor: COLORS.white, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  seatBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  sosRow: {
    marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.white,
  },
  sosText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.error },

  sectionHead: { marginTop: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sectionLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  ridesList: { marginTop: SPACING.sm + 2, gap: SPACING.sm + 2 },
  rideRow: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.textPrimary,
    overflow: 'hidden',
  },
  rideTime: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  rideTimeShadow: { position: 'absolute', top: 0, right: -10, bottom: 0, width: 10 },
  rideHour: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  ridePeriod: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  rideMiddle: { flex: 1, justifyContent: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  rideDriver: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  rideSeats: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  ridePrice: {
    fontSize: 16, fontWeight: '800', color: COLORS.primary,
    alignSelf: 'center', paddingRight: SPACING.lg,
  },
  ridesEmpty: { paddingVertical: SPACING.lg, alignItems: 'center' },
  ridesEmptyText: { fontSize: 13, color: COLORS.textSecondary },
  moreRidesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm },
  moreRidesText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  airportLink: { marginTop: SPACING.lg },
  airportText: { fontSize: 13, color: COLORS.textSecondary },
  airportLinkText: { color: COLORS.primary, fontWeight: '700' },
})
