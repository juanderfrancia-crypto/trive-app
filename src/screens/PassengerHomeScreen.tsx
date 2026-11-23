import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, RefreshControl } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '../components/AppText'
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import DepthCard from '../components/DepthCard'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { useUpcomingTrip, formatCountdown } from '../hooks/useUpcomingTrip'
import { useRecentRoutes } from '../hooks/useRecentRoutes'
import { supabase } from '../services/supabase'
import { showSuccess, showError } from '../utils/showError'
import { AppAlert } from '../components/AppAlert'
import { toEmergencyContact } from '../utils/emergencyContact'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { COLOMBIA_MUNICIPALITIES, Municipality } from '../data/colombiaMunicipalities'
import { normalizeText } from '../utils/textMatch'
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
  const setUser = useAppStore((s) => s.setUser)
  const setSearchParams = useAppStore((s) => s.setSearchParams)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const viewingAsPassenger = useAppStore((s) => s.viewingAsPassenger)
  const setViewingAsPassenger = useAppStore((s) => s.setViewingAsPassenger)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  // Autocompletado con la lista oficial de municipios de Colombia (ya existe
  // en la app, no depende de ningún servicio externo) -- ayuda a escribir el
  // nombre correcto sin tener que adivinar exactamente cómo lo puso el
  // conductor. Null = no mostrar sugerencias (campo vacío o sin foco).
  const [suggestionField, setSuggestionField] = useState<'origin' | 'destination' | null>(null)
  const originSuggestions = useMemo(() => {
    if (suggestionField !== 'origin' || !origin.trim()) return []
    const q = normalizeText(origin)
    // Algunos nombres se repiten en departamentos distintos (ej. "Caldas" en
    // Antioquia y en Boyacá) -- al tocar una sugerencia solo se usa el nombre,
    // así que mostrar las dos por separado no aporta, se deja solo la primera.
    const seen = new Set<string>()
    return COLOMBIA_MUNICIPALITIES.filter((m) => {
      if (!normalizeText(m.name).includes(q)) return false
      if (seen.has(m.name)) return false
      seen.add(m.name)
      return true
    }).slice(0, 5)
  }, [suggestionField, origin])
  const destinationSuggestions = useMemo(() => {
    if (suggestionField !== 'destination' || !destination.trim()) return []
    const q = normalizeText(destination)
    const seen = new Set<string>()
    return COLOMBIA_MUNICIPALITIES.filter((m) => {
      if (!normalizeText(m.name).includes(q)) return false
      if (seen.has(m.name)) return false
      seen.add(m.name)
      return true
    }).slice(0, 5)
  }, [suggestionField, destination])
  const preferredMunicipality = user?.preferred_municipality ?? null
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false)

  const { trip: upcomingTrip } = useUpcomingTrip(user?.id)
  const { routes: recentRoutes } = useRecentRoutes(user?.id)
  const { bookings, refetch: refetchBookings } = usePassengerBookings(user?.id)
  const { rides: salidasHoy, reload: reloadDepartures, hasMore: masSalidasHoy } = useTodayDepartures(preferredMunicipality)
  const [refreshing, setRefreshing] = useState(false)

  // El conteo de "Sale en" de cada salida de hoy se recalcula en el render leyendo
  // Date.now() -- correcto, pero sin esto nada vuelve a dibujar la pantalla mientras
  // el pasajero se queda quieto en Inicio, así que se veía congelado igual que le
  // pasaba a "Tu próximo viaje" (arreglado en useUpcomingTrip.ts). Esto solo fuerza
  // un re-render local cada 30s, sin pedir nada al servidor.
  const [, forceCountdownTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceCountdownTick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchBookings(), reloadDepartures()])
    setRefreshing(false)
  }

  const reservaPorConfirmar = bookings.find((b) => b.bookingStatus === 'awaiting_confirmation') ?? null

  useFocusEffect(
    useCallback(() => {
      refetchBookings()
      if (preferredMunicipality) setOrigin((prev) => prev || preferredMunicipality)
    }, [preferredMunicipality, refetchBookings])
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
    setOrigin((prev) => prev || m.name)
    if (user?.id) {
      setUser({ ...user, preferred_municipality: m.name })
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
    AppAlert.confirm({
      title: 'Enviar SOS',
      message: '¿Enviar tu ubicación y datos del viaje a tu contacto de emergencia por WhatsApp?',
      confirmText: 'Enviar SOS',
      destructive: true,
      onConfirm: async () => {
        try {
          const userId = useAppStore.getState().user?.id
          const { data: prof } = userId
            ? await supabase.from('profiles').select('emergency_contact').eq('id', userId).single()
            : { data: null }
          const contact = toEmergencyContact(prof?.emergency_contact)
          if (!contact) {
            AppAlert.confirm({
              title: 'Sin contacto de emergencia',
              message: 'Configura un contacto en Ajustes → Privacidad y Seguridad.',
              confirmText: 'Ir a Ajustes',
              onConfirm: () => navigation.navigate('Settings' as never),
            })
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
            showError('Instala WhatsApp para usar esta función.')
          }
        } catch {
          showError('No se pudo enviar el SOS. Intenta de nuevo.')
        }
      },
    })
  }

  const goToTripStatus = () => {
    if (!upcomingTrip) return
    setSelectedRoute(upcomingTrip.routeObj)
    navigation.navigate('TripStatus' as never)
  }

  const canSearch = !!origin.trim() && !!destination.trim()
  const fullName = user?.name ?? 'Usuario'
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const [avatarBroken, setAvatarBroken] = useState(false)
  const confirmarHoy = reservaPorConfirmar ? formatDia(reservaPorConfirmar.departureTime) === 'Hoy' : false

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {viewingAsPassenger && (
          <TouchableOpacity
            style={styles.modeBanner}
            onPress={() => setViewingAsPassenger(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.modeBannerText}>Viendo como pasajero</Text>
            <Text style={styles.modeBannerAction}>Volver a conductor</Text>
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: SPACING.md }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
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
            {/* El ícono hace de atajo: llena el origen con el municipio guardado
                en un toque. Si todavía no hay uno guardado, abre el mismo
                selector que ya usa "Salidas de hoy". */}
            <TouchableOpacity
              onPress={() => {
                if (preferredMunicipality) { setOrigin(preferredMunicipality); setSuggestionField(null) }
                else setShowMunicipalityPicker(true)
              }}
              hitSlop={8}
              accessibilityLabel="Usar mi municipio como origen"
            >
              <Icon name="CircleDot" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="¿De dónde sales?"
              placeholderTextColor={COLORS.textTertiary}
              value={origin}
              onChangeText={(t) => { setOrigin(t); setSuggestionField('origin') }}
              onFocus={() => setSuggestionField('origin')}
              accessibilityLabel="Origen"
            />
            {!!origin && (
              <TouchableOpacity
                onPress={() => { setOrigin(''); setSuggestionField(null) }}
                accessibilityLabel="Limpiar origen"
                hitSlop={8}
              >
                <Icon name="CircleX" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          {originSuggestions.length > 0 && (
            <View style={styles.suggestionList}>
              {originSuggestions.map((m, idx) => (
                <TouchableOpacity
                  key={`${m.department}-${m.name}`}
                  style={[styles.suggestionItem, idx === 0 && styles.suggestionItemFirst]}
                  onPress={() => { setOrigin(m.name); setSuggestionField(null) }}
                  activeOpacity={0.7}
                >
                  <Icon name="MapPin" size={13} color={COLORS.textTertiary} />
                  <Text style={styles.suggestionText}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.searchDivider} />
          <View style={styles.searchRow}>
            <Icon name="MapPin" size={18} color={COLORS.danger} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿A dónde vas?"
              placeholderTextColor={COLORS.textTertiary}
              value={destination}
              onChangeText={(t) => { setDestination(t); setSuggestionField('destination') }}
              onFocus={() => setSuggestionField('destination')}
              accessibilityLabel="Destino"
            />
            {!!destination && (
              <TouchableOpacity
                onPress={() => { setDestination(''); setSuggestionField(null) }}
                accessibilityLabel="Limpiar destino"
                hitSlop={8}
              >
                <Icon name="CircleX" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          {destinationSuggestions.length > 0 && (
            <View style={styles.suggestionList}>
              {destinationSuggestions.map((m, idx) => (
                <TouchableOpacity
                  key={`${m.department}-${m.name}`}
                  style={[styles.suggestionItem, idx === 0 && styles.suggestionItemFirst]}
                  onPress={() => { setDestination(m.name); setSuggestionField(null) }}
                  activeOpacity={0.7}
                >
                  <Icon name="MapPin" size={13} color={COLORS.textTertiary} />
                  <Text style={styles.suggestionText}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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

        {upcomingTrip && (
          <TouchableOpacity style={styles.tripCard} onPress={goToTripStatus} activeOpacity={0.92}>
            <View style={styles.tripHeaderRow}>
              <Svg width={56} height={44} viewBox="0 0 56 40" style={styles.tripIcon}>
                <Ellipse cx="28" cy="36" rx="22" ry="2.5" fill={COLORS.primary} opacity={0.15} />
                <Path d="M6 26 Q6 20 12 19 L18 13 Q21 9 28 9 L36 9 Q41 9 44 13 L49 19 Q53 20 53 26 L53 30 Q53 33 50 33 L9 33 Q6 33 6 30 Z" fill={COLORS.primary} />
                <Path d="M20 19 Q23 14 28 14 L36 14 Q40 14 42 19 Z" fill={COLORS.primaryTint} />
                <Circle cx="16" cy="33" r="5" fill={COLORS.textPrimary} />
                <Circle cx="16" cy="33" r="2" fill={COLORS.primaryTint} />
                <Circle cx="43" cy="33" r="5" fill={COLORS.textPrimary} />
                <Circle cx="43" cy="33" r="2" fill={COLORS.primaryTint} />
                <Ellipse cx="50" cy="24" rx="2" ry="1.5" fill={COLORS.white} />
              </Svg>
              <View style={styles.tripHeaderText}>
                <Text style={styles.tripRouteTitle} numberOfLines={1}>{upcomingTrip.origin} → {upcomingTrip.destination}</Text>
                <Text style={styles.tripCountdownSub}>
                  {upcomingTrip.minutesUntil <= 1 ? 'En camino' : `Sale en ${formatCountdown(upcomingTrip.minutesUntil)}`}
                </Text>
              </View>
            </View>

            <View style={styles.tripDetails}>
              <View style={styles.tripVehicleRow}>
                <Text style={styles.tripDriverLine} numberOfLines={1}>
                  {upcomingTrip.driverName} te lleva · ★ {upcomingTrip.driverRating.toFixed(1)} · Asiento {upcomingTrip.seatNumber}
                </Text>
                {!(upcomingTrip.vehicleMake || upcomingTrip.vehiclePlate) && (
                  <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.85}>
                    <Text style={styles.sosBtnText}>Enviar SOS</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(upcomingTrip.vehicleMake || upcomingTrip.vehiclePlate) && (
                <View style={styles.tripVehicleRow}>
                  {upcomingTrip.vehiclePhotoUrl ? (
                    <Image source={{ uri: upcomingTrip.vehiclePhotoUrl }} style={styles.tripVehicleThumb} />
                  ) : (
                    <Icon name="Car" size={16} color={COLORS.primary} />
                  )}
                  <Text style={styles.tripVehicleText} numberOfLines={1}>
                    {[upcomingTrip.vehicleMake, upcomingTrip.vehicleModel, upcomingTrip.vehicleColor].filter(Boolean).join(' ')}
                    {upcomingTrip.vehiclePlate ? ` · Placa ${upcomingTrip.vehiclePlate}` : ''}
                  </Text>
                  <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.85}>
                    <Text style={styles.sosBtnText}>Enviar SOS</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Salidas de hoy</Text>
          {preferredMunicipality && (
            <TouchableOpacity onPress={handleAvailableRidesPress} hitSlop={8}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.ridesList}>
          {!preferredMunicipality ? (
            // Sin municipio, useTodayDepartures no filtra nada — mostrar esas rutas aquí
            // confunde al usuario haciéndole creer que le aplican. Mejor pedir el municipio.
            <TouchableOpacity style={styles.ridesEmpty} onPress={() => setShowMunicipalityPicker(true)} activeOpacity={0.75}>
              <Text style={styles.ridesEmptyText}>Elige tu municipio para ver las salidas cerca de ti</Text>
            </TouchableOpacity>
          ) : salidasHoy.length === 0 ? (
            <View style={styles.ridesEmpty}>
              <Text style={styles.ridesEmptyText}>Aún no hay salidas publicadas para hoy</Text>
            </View>
          ) : salidasHoy.map((ride) => {
            const hora = formatHoraPartes(ride.departure_time)
            return (
              <TouchableOpacity key={ride.id} style={styles.rideRow} onPress={handleAvailableRidesPress} activeOpacity={0.8}>
                <View style={styles.rideTime}>
                  {ride.vehicle_photo ? (
                    <>
                      <Image source={{ uri: ride.vehicle_photo }} style={styles.rideTimePhoto} contentFit="cover" />
                      <View style={styles.rideTimeOverlay} />
                    </>
                  ) : (
                    <LinearGradient
                      colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.rideTimeShadow}
                    />
                  )}
                  <Text style={styles.rideHour}>{hora.hora}</Text>
                  <Text style={styles.ridePeriod}>{hora.periodo}</Text>
                </View>
                <View style={styles.rideMiddle}>
                  <Text style={styles.rideDestination} numberOfLines={1}>Hacia {ride.destination}</Text>
                  <Text style={styles.rideDriver} numberOfLines={1}>{ride.driver_name} · {ride.driver_rating ? `★ ${Number(ride.driver_rating).toFixed(1)}` : 'Nuevo'}</Text>
                  <Text style={styles.rideSeats} numberOfLines={1}>
                    {ride.available_seats} {ride.available_seats === 1 ? 'cupo libre' : 'cupos libres'} ·{' '}
                    {(() => {
                      const mins = Math.max(0, Math.round((new Date(ride.departure_time).getTime() - Date.now()) / 60000))
                      return mins <= 0 ? 'En camino' : `Sale en ${formatCountdown(mins)}`
                    })()}
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

        <View style={styles.airportRow}>
          <Text style={styles.airportText}>¿Vas a otro lugar?</Text>
          <TouchableOpacity style={styles.airportLink} onPress={() => navigation.navigate('AirportRequest' as never)} activeOpacity={0.75}>
            <Text style={styles.airportLinkText} numberOfLines={1}>Pide un viaje a donde quieras</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingScreen>

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

  modeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md,
  },
  modeBannerText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modeBannerAction: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  name: {
    fontSize: 21,
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
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 11,
  },

  searchCardWrap: {
    marginTop: SPACING.lg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 13,
  },
  searchCardContent: { padding: SPACING.lg, backgroundColor: '#FAFBFE' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, height: 48,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  searchDivider: { height: SPACING.sm },
  suggestionList: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, marginTop: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  suggestionItemFirst: { borderTopWidth: 0 },
  suggestionText: { fontSize: 14, color: COLORS.textPrimary },
  searchBtn: {
    marginTop: SPACING.md, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.primaryDark,
  },
  // Sin borderStyle: 'dashed' a propósito -- Android a veces no lo vuelve a
  // pintar bien al activarse el botón (se queda "pegado" aunque el estilo ya
  // cambió), un bug conocido de React Native con bordes punteados.
  searchBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
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
  tripHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  tripIcon: { flexShrink: 0 },
  tripHeaderText: { flex: 1 },
  tripRouteTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  tripCountdownSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sosBtn: {
    marginLeft: 'auto', flexShrink: 0,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.primary,
  },
  sosBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  tripDetails: { marginTop: SPACING.md, gap: SPACING.xs },
  tripDriverLine: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  tripVehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  tripVehicleThumb: { width: 28, height: 22, borderRadius: RADIUS.sm, flexShrink: 0 },
  tripVehicleText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  sectionHead: { marginTop: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sectionLink: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    textShadowColor: 'rgba(18, 48, 184, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
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
    position: 'relative',
    overflow: 'hidden',
  },
  rideTimeShadow: { position: 'absolute', top: 0, right: -10, bottom: 0, width: 10 },
  // Cuando hay foto real del vehículo, se usa como fondo del bloque de la hora,
  // con rideTimeOverlay encima para que la hora en blanco siga siendo legible.
  rideTimePhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  rideTimeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: `${COLORS.textPrimary}94` },
  rideHour: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  ridePeriod: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  rideMiddle: { flex: 1, justifyContent: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  rideDestination: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.3 },
  rideDriver: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 1 },
  rideSeats: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  ridePrice: {
    fontSize: 16, fontWeight: '800', color: COLORS.primary,
    alignSelf: 'center', paddingRight: SPACING.lg,
  },
  ridesEmpty: { paddingVertical: SPACING.lg, alignItems: 'center' },
  ridesEmptyText: { fontSize: 13, color: COLORS.textSecondary },
  moreRidesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm },
  moreRidesText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Misma posición/margen que antes (fila única, alineada a la izquierda) --
  // solo cambia que la parte de acción ahora es una pastilla con fondo en vez
  // de texto azul suelto, para que se sienta como un botón.
  // Texto más largo a propósito (pidió más peso de CTA) -- se deja envolver a
  // una segunda línea si no cabe en una sola, en vez de forzarlo/truncarlo.
  airportRow: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: SPACING.xs,
    columnGap: 6,
  },
  airportText: { fontSize: 13, color: COLORS.textSecondary },
  airportLink: {},
  airportLinkText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '800',
    textShadowColor: 'rgba(18, 48, 184, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
})
