import React, { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native'
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { usePassengerHomeStats } from '../hooks/usePassengerHomeStats'
import { useUpcomingTrip, formatCountdown } from '../hooks/useUpcomingTrip'
import { useRecentRoutes } from '../hooks/useRecentRoutes'
import { supabase } from '../services/supabase'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const MEMBERSHIP_LABEL: Record<string, string> = {
  free: 'Gratis',
  basic: 'Básico',
  premium: 'Premium',
  vip: 'VIP',
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

  const { stats, loading: statsLoading } = usePassengerHomeStats(user?.id)
  const { trip: upcomingTrip, loading: tripLoading } = useUpcomingTrip(user?.id)
  const { routes: recentRoutes } = useRecentRoutes(user?.id)

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

  const handleSearch = () => {
    setSearchParams(origin.trim(), destination.trim())
    navigation.dispatch(CommonActions.navigate({ name: 'Search' }))
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

  const goToTripStatus = () => {
    if (!upcomingTrip) return
    setSelectedRoute(upcomingTrip.routeObj)
    navigation.navigate('TripStatus' as never)
  }

  const membershipType = user?.membership_type ?? 'free'
  const canSearch = !!origin.trim() && !!destination.trim()
  const firstName = user?.name?.split(' ')[0] ?? 'Usuario'

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.membershipPill}>
            <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primary} />
            <Text style={styles.membershipText}>{MEMBERSHIP_LABEL[membershipType] ?? 'Gratis'}</Text>
          </View>
        </View>

        <Text style={styles.headline}>¿A dónde vas hoy?</Text>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
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
            <View style={[styles.dot, { backgroundColor: COLORS.textPrimary, borderRadius: 2 }]} />
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
                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSearch}
            onPress={handleSearch}
            style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
          >
            <Ionicons name="search" size={18} color={canSearch ? COLORS.white : COLORS.textTertiary} />
            <Text style={[styles.searchBtnText, !canSearch && styles.searchBtnTextDisabled]}>Buscar cupos</Text>
          </TouchableOpacity>
        </View>

        {recentRoutes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
            {recentRoutes.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => { setOrigin(r.origin); setDestination(r.destination) }}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.chipText} numberOfLines={1}>{r.origin} → {r.destination}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {!tripLoading && upcomingTrip && (
          <TouchableOpacity style={styles.tripCard} onPress={goToTripStatus} activeOpacity={0.92}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripLabel}>Tu próximo viaje</Text>
              <View style={styles.countdown}>
                <Ionicons name="time-outline" size={12} color={COLORS.success} />
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
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.sosText}>Enviar mi ubicación por SOS</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{statsLoading ? '–' : stats?.tripsThisMonth ?? 0}</Text>
            <Text style={styles.statLabel}>Viajes este mes</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaCard} onPress={handleAvailableRidesPress} activeOpacity={0.9}>
          <View style={styles.ctaIcon}>
            <Ionicons name="flash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Cupos de hoy</Text>
            <Text style={styles.ctaSub}>{preferredMunicipality || 'Elige tu municipio'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => navigation.navigate('AirportRequest' as never)}
          activeOpacity={0.85}
        >
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryTitle}>Solicitar viaje privado</Text>
            <Text style={styles.secondarySub}>Propón el precio al conductor</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Consejo</Text>
          <Text style={styles.tipText}>Revisa primero los cupos de hoy. Si no encuentras uno, solicita un viaje privado.</Text>
        </View>
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
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  membershipPill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primaryTint, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full,
  },
  membershipText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  headline: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.6, marginTop: SPACING.xl, lineHeight: 36 },

  searchCard: {
    marginTop: SPACING.lg, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, height: 44 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  searchDivider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 22 },
  searchBtn: {
    marginTop: SPACING.md, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  searchBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  searchBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  searchBtnTextDisabled: { color: COLORS.textTertiary },

  chipsScroll: { marginTop: SPACING.md },
  chipsContent: { gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, maxWidth: 220 },

  tripCard: {
    marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.lg, backgroundColor: COLORS.primaryTint,
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

  statsRow: { marginTop: SPACING.lg, flexDirection: 'row' },
  stat: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },

  ctaCard: {
    marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  ctaIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, alignItems: 'center', justifyContent: 'center' },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  ctaSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  secondaryCard: {
    marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  secondaryText: { flex: 1 },
  secondaryTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  secondarySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  tip: { marginTop: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt },
  tipTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  tipText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
})
