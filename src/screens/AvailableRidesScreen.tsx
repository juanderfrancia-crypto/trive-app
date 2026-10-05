import React, { useCallback, useMemo, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAvailableRides, AvailableRide } from '../hooks/useAvailableRides'
import { SkeletonRideCard } from '../components/Skeleton'
import { useAppStore } from '../store/useAppStore'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'
import { supabase } from '../services/supabase'
import { VehicleVector } from '../components/illustrations/VehicleVector'

// Reserva2: elegir conductor. Llega con origen, destino y pasajeros (búsqueda)
// o solo con municipio (Viajes ahora desde Inicio).
type RideParams = {
  municipality?: string
  origin?: string
  destination?: string
  passengers?: number
}

const normalizeText = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// "2:30 p. m." -> { hour: "2:30", period: "p. m." }
function formatHourParts(iso: string) {
  const full = new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  const match = full.match(/^(\S+)\s+(.+)$/)
  return match ? { hour: match[1], period: match[2] } : { hour: full, period: '' }
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

type RideCardProps = {
  ride: AvailableRide
  passengers: number
  isSearch: boolean
  selected: boolean
  onSelect: (id: string) => void
}

function RideCard({ ride, passengers, isSearch, selected, onSelect }: RideCardProps) {
  const seats = ride.seats_available_count ?? 0
  const fits = seats >= passengers
  const isFull = seats === 0
  const { hour, period } = formatHourParts(ride.departure_time)

  let status: { text: string; color: string }
  if (isFull) {
    status = {
      text: isSearch
        ? `Sin cupos para ${passengers} ${plural(passengers, 'pasajero', 'pasajeros')}`
        : 'Sin cupos',
      color: COLORS.error,
    }
  } else if (!fits) {
    status = {
      text: `${seats} ${plural(seats, 'cupo libre', 'cupos libres')} · tu grupo no cabe`,
      color: COLORS.warningDark,
    }
  } else {
    status = {
      text: `${seats} ${plural(seats, 'cupo libre', 'cupos libres')}`,
      color: COLORS.success,
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={fits ? 0.85 : 1}
      onPress={() => { if (fits) onSelect(ride.id) }}
      accessibilityState={{ selected, disabled: !fits }}
      style={[styles.card, selected && styles.cardSelected, isFull && styles.cardDimmed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.timeCol}>
          <Text style={styles.hour}>{hour}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.middle}>
          <Text style={styles.routeText} numberOfLines={1}>{ride.origin} → {ride.destination}</Text>
          <View style={styles.driverRow}>
            <Text style={styles.driverName} numberOfLines={1}>{ride.driver_name}</Text>
            <Icon name="Star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>{Number(ride.driver_rating ?? 0).toFixed(1)}</Text>
          </View>
          {!!ride.vehicle_plate && (
            <View style={styles.platePill}>
              <Text style={styles.plateText}>{ride.vehicle_plate}</Text>
            </View>
          )}
        </View>
        <VehicleVector type={ride.vehicle_type} />
      </View>

      <View style={styles.hDivider} />

      <View style={styles.cardBottom}>
        <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
        <Text style={styles.price}>{formatCOP(ride.price_per_seat)}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function AvailableRidesScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const params = (route.params ?? {}) as RideParams
  const { rides, loading, error, refetch } = useAvailableRides()
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const authUser = useAppStore((s) => s.authUser)
  const user = useAppStore((s) => s.user)
  const [refreshing, setRefreshing] = useState(false)
  const [municipality, setMunicipality] = useState<string | null>(params.municipality ?? null)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isSearch = !!(params.origin && params.destination)
  const passengers = isSearch ? (params.passengers ?? 1) : 1

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

  const visibleRides = useMemo(() => {
    const now = Date.now()
    if (isSearch) {
      const originQ = normalizeText(params.origin ?? '')
      const destQ = normalizeText(params.destination ?? '')
      return rides.filter((r) =>
        isToday(r.departure_time) &&
        new Date(r.departure_time).getTime() > now &&
        normalizeText(r.origin).includes(originQ) &&
        normalizeText(r.destination).includes(destQ)
      )
    }
    if (!municipality) return rides
    const mun = normalizeText(municipality)
    return rides.filter((r) => normalizeText(r.origin).includes(mun) || normalizeText(r.destination).includes(mun))
  }, [rides, isSearch, params.origin, params.destination, municipality])

  const selectedRide = visibleRides.find((r) => r.id === selectedId) ?? null

  const handleContinue = () => {
    if (!selectedRide) return
    if (!authUser) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reservar un viaje.', [
        { text: 'Aceptar', onPress: () => navigation.navigate('Login' as never) },
      ])
      return
    }
    setSelectedRoute(selectedRide)
    navigation.navigate('SeatSelection' as never)
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="theSearch" width={200} />
      <Text style={styles.emptyTitle}>No hay viajes disponibles</Text>
      <Text style={styles.emptyText}>Prueba con diferentes ciudades o horarios</Text>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onRefresh}>
        <Text style={styles.secondaryBtnText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  )

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Icon name="CircleAlert" size={48} color={COLORS.error} />
      <Text style={[styles.emptyTitle, { color: COLORS.error }]}>Error cargando viajes</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onRefresh}>
        <Text style={styles.secondaryBtnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  const rideCount = `${visibleRides.length} ${plural(visibleRides.length, 'viaje', 'viajes')}`

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Volver">
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {isSearch ? (
            <>
              <Text style={styles.stepLabel}>Paso 2 de 5 · Elige conductor</Text>
              <Text style={styles.title} numberOfLines={1}>{params.origin} → {params.destination}</Text>
              <Text style={styles.subtitle}>
                Hoy · {passengers} {plural(passengers, 'pasajero', 'pasajeros')} · {rideCount}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Viajes ahora</Text>
              <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7}>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {municipality ? `${municipality} · cambiar municipio` : 'Toca para elegir tu municipio'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {loading && rides.length === 0 ? (
        <View style={styles.listContent}>
          <SkeletonRideCard />
          <SkeletonRideCard />
          <SkeletonRideCard />
        </View>
      ) : error && rides.length === 0 ? (
        renderError()
      ) : visibleRides.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={visibleRides}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              passengers={passengers}
              isSearch={isSearch}
              selected={item.id === selectedId}
              onSelect={setSelectedId}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {visibleRides.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !selectedRide && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!selectedRide}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, !selectedRide && styles.ctaTextDisabled]}>
              {selectedRide
                ? `Elegir ${formatHourParts(selectedRide.departure_time).hour} ${formatHourParts(selectedRide.departure_time).period}`
                : 'Elige un viaje'}
            </Text>
          </TouchableOpacity>
        </View>
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
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: { flex: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  title: { marginTop: 4, fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },
  subtitle: { marginTop: 2, fontSize: 14, color: COLORS.textSecondary },

  listContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDimmed: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  timeCol: { minWidth: 58, alignItems: 'center' },
  hour: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  period: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  vDivider: { width: 1, height: 52, backgroundColor: COLORS.border, marginHorizontal: 14 },
  middle: { flex: 1, paddingRight: 6 },
  routeText: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  driverName: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 1 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  platePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryTint,
  },
  plateText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.4 },

  hDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 13, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyTitle: { marginTop: SPACING.md, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { marginTop: SPACING.sm, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  secondaryBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg, paddingTop: SPACING.sm },
  cta: { height: 54, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { backgroundColor: COLORS.surfaceAlt },
  ctaText: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse },
  ctaTextDisabled: { color: COLORS.textTertiary },
})
