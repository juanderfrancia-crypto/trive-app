import { useState, useCallback } from 'react'
import { View, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native'
import { Text } from '../AppText'
import Icon from '../Icon'
import Illustration from '../illustrations/Illustration'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonCardList } from '../SkeletonLoader'
import { useAirportNegotiation, AirportRequest } from '../../hooks/useAirportNegotiation'
import type { HubTabProps } from './types'
import { formatDeparture, formatPrice } from './formatters'

export default function PendingRequestsTab({ isDriver }: HubTabProps) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { requests, loading, loadPassengerRequests, cancelRequest } = useAirportNegotiation()
  const [refreshing, setRefreshing] = useState(false)

  const pendingRequests = requests.filter(
    (r) => r.passenger_id === user?.id && r.status === 'pending'
  )

  const load = useCallback(async () => {
    if (!user?.id || isDriver) return
    await loadPassengerRequests(user.id)
  }, [user?.id, isDriver, loadPassengerRequests])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleDeleteRequest = (requestId: string) => {
    Alert.alert('Cancelar solicitud', '¿Deseas cancelar esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return
          try {
            await cancelRequest(requestId, user.id)
          } catch {
            Alert.alert('Error', 'No se pudo cancelar la solicitud')
          }
        },
      },
    ])
  }

  const openDetails = (requestId: string) => {
    navigation.navigate('AirportRequestDetails', { requestId })
  }

  const openCreate = () => {
    navigation.navigate('AirportRequest')
  }

  const renderRequestItem = ({ item: request }: { item: AirportRequest }) => (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => openDetails(request.id)}>
        <View style={styles.cardTop}>
          <Text style={styles.when}>{formatDeparture(request.departure_time)}</Text>
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Pendiente</Text>
          </View>
        </View>

        <Text style={styles.route} numberOfLines={2}>
          {request.origin} → {request.destination}
        </Text>
        <Text style={styles.meta}>
          {request.passengers === 1 ? 'Solo tú' : `Grupo de ${request.passengers}`} · Oferta inicial{' '}
          {formatPrice(request.offered_price)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnPrimary} onPress={() => openDetails(request.id)} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>Ver ofertas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelLink} onPress={() => handleDeleteRequest(request.id)}>
        <Text style={styles.cancelText}>Cancelar solicitud</Text>
      </TouchableOpacity>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="postOnline" width={170} />
      <Text style={styles.emptyTitle}>Sin solicitudes activas</Text>
      <Text style={styles.emptySubtitle}>
        Publica a dónde quieres ir y los conductores te harán ofertas
      </Text>
      <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.85}>
        <Icon name="CirclePlus" size={20} color={COLORS.white} />
        <Text style={styles.createBtnText}>Nueva solicitud</Text>
      </TouchableOpacity>
    </View>
  )

  if (isDriver) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtitle}>Cambia a modo pasajero para ver tus solicitudes</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {pendingRequests.length > 0 && (
        <TouchableOpacity style={styles.topCreateBtn} onPress={openCreate} activeOpacity={0.85}>
          <Icon name="Plus" size={18} color={COLORS.primary} />
          <Text style={styles.topCreateBtnText}>Nueva solicitud</Text>
        </TouchableOpacity>
      )}

      {loading && pendingRequests.length === 0 ? (
        <SkeletonCardList variant="request" count={4} />
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={pendingRequests.length > 0}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTint,
  },
  topCreateBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  when: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  pendingPill: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  pendingPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.warningDark,
  },
  route: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  btnPrimary: {
    height: 42,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  createBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
})
