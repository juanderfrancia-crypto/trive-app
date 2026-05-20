import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAirportRequests, AirportRequest } from '../hooks/useAirportRequests'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'

export default function AirportFeedScreen() {
  const navigation = useNavigation()
  const { requests, loading, loadDriverFeed, acceptRequest } = useAirportRequests()
  const user = useAppStore((s) => s.user)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      loadDriverFeed()
    }, [loadDriverFeed])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDriverFeed()
    setRefreshing(false)
  }, [loadDriverFeed])

  const handleAccept = (item: AirportRequest) => {
    Alert.alert(
      'Confirmar viaje',
      `¿Aceptas el viaje de ${item.passenger_name ?? 'el pasajero'} por $${item.offered_price.toLocaleString('es-CO')}?\n\nSe descuentan $5.000 de tu billetera.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar viaje',
          onPress: async () => {
            if (!user?.id) return
            try {
              setAccepting(item.id)
              await acceptRequest(item.id, user.id)
              showSuccess('Viaje aceptado. El pasajero ha sido notificado.')
            } catch (err: any) {
              if ((err as any).code === 'INSUFFICIENT_BALANCE') {
                Alert.alert(
                  'Saldo insuficiente',
                  err.message,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ir a billetera', onPress: () => navigation.navigate('Wallet' as never) },
                  ]
                )
              } else {
                showError(err.message || 'Error al aceptar el viaje')
              }
            } finally {
              setAccepting(null)
            }
          },
        },
      ]
    )
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    const date = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
    const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    return `${date} · ${time}`
  }

  const renderItem = ({ item }: { item: AirportRequest }) => {
    const isAccepting = accepting === item.id

    return (
      <View style={s.card}>

        {/* Encabezado: pasajero + precio */}
        <View style={s.cardTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(item.passenger_name ?? 'P').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.cardTopInfo}>
            <Text style={s.passengerName}>{item.passenger_name ?? 'Pasajero'}</Text>
            <View style={s.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textTertiary} />
              <Text style={s.dateText}>{formatDateTime(item.departure_time)}</Text>
            </View>
          </View>
          <View style={s.priceBadge}>
            <Text style={s.priceBadgeText}>${item.offered_price.toLocaleString('es-CO')}</Text>
          </View>
        </View>

        {/* Ruta */}
        <View style={s.routeBox}>
          <View style={s.routeLine}>
            <View style={s.dotGreen} />
            <View style={s.lineSegment} />
            <View style={s.dotBlue} />
          </View>
          <View style={s.routeLabels}>
            <Text style={s.routeCity} numberOfLines={1}>{item.origin}</Text>
            <Text style={s.routeCity} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        {/* Chips: personas + nota */}
        <View style={s.chipsRow}>
          <View style={s.chip}>
            <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
            <Text style={s.chipText}>{item.passengers} {item.passengers === 1 ? 'persona' : 'personas'}</Text>
          </View>
          {!!item.notes && (
            <View style={[s.chip, s.chipFlex]}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={COLORS.textSecondary} />
              <Text style={s.chipText} numberOfLines={1}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Botón aceptar */}
        <TouchableOpacity
          style={[s.acceptBtnWrap, (isAccepting || (accepting !== null && !isAccepting)) && s.acceptBtnDisabled]}
          onPress={() => handleAccept(item)}
          disabled={accepting !== null}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#0E2699', '#1230B8', '#1A3FCC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.acceptBtn}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                <Text style={s.acceptBtnText}>Aceptar viaje</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </View>
    )
  }

  const renderEmpty = () => (
    <View style={s.emptyCard}>
      <Ionicons name="airplane-outline" size={48} color={COLORS.textTertiary} />
      <Text style={s.emptyTitle}>Sin solicitudes por ahora</Text>
      <Text style={s.emptySub}>Cuando un pasajero publique una solicitud de aeropuerto aparecerá aquí.</Text>
    </View>
  )

  return (
    <SafeAreaView style={s.safe}>

      {/* Header con gradiente */}
      <LinearGradient
        colors={['#0E2699', '#1230B8', '#1A3FCC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerHero}>
          <Ionicons name="airplane" size={22} color="rgba(255,255,255,0.9)" />
          <View style={s.headerTitleRow}>
            <Text style={s.headerTitle}>Solicitudes de aeropuerto</Text>
            {requests.length > 0 && (
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeText}>{requests.length}</Text>
              </View>
            )}
          </View>
          <Text style={s.headerSub}>
            {requests.length === 0
              ? 'Sin solicitudes disponibles'
              : `${requests.length} solicitud${requests.length !== 1 ? 'es' : ''} esperando conductor`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Comisión info strip */}
      <View style={s.commissionStrip}>
        <Ionicons name="wallet-outline" size={15} color={COLORS.primary} />
        <Text style={s.commissionText}>
          Al aceptar se descuentan <Text style={s.commissionBold}>$5.000</Text> de tu billetera
        </Text>
      </View>

      {/* Lista */}
      {loading && !refreshing ? (
        <View style={s.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loaderText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, requests.length === 0 && s.listEmpty]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Header con gradiente
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerHero: { flex: 1, alignItems: 'center', gap: 3 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, minWidth: 22, height: 22,
    paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  // Comisión strip
  commissionStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#C7D2FE',
  },
  commissionText: { fontSize: 13, color: '#3730A3' },
  commissionBold: { fontWeight: '700' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.md },

  list: { padding: SPACING.lg, gap: SPACING.md },
  listEmpty: { flex: 1 },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cardTopInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: COLORS.textTertiary },
  priceBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  priceBadgeText: { fontSize: 16, fontWeight: '800', color: '#065F46' },

  // Ruta
  routeBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  routeLine: { alignItems: 'center', gap: 3 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  lineSegment: { width: 1.5, height: 18, backgroundColor: '#D1D5DB' },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routeLabels: { flex: 1, gap: 10 },
  routeCity: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  // Chips
  chipsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F3F4F6', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  chipFlex: { flex: 1 },
  chipText: { fontSize: 12, color: COLORS.textSecondary },

  // Botón
  acceptBtnWrap: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  acceptBtnDisabled: { opacity: 0.55 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: 14,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Empty
  emptyCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 },
})
