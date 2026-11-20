import { useCallback, useState } from 'react'
import { View, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { Text } from '../AppText'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme/theme'
import Icon from '../Icon'
import Illustration from '../illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonCardList } from '../SkeletonLoader'
import { useAirportNegotiation, AirportRequest } from '../../hooks/useAirportNegotiation'
import { showSuccess, showError } from '../../utils/showError'
import { supabase } from '../../services/supabase'
import type { HubTabProps } from './types'
import { formatDeparture, formatPrice } from './formatters'
import { calculateTripAcceptFee } from '../../utils/platformFees'

export default function AvailableOffersTab({ isDriver }: HubTabProps) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const {
    requests,
    loading,
    loadDriverFeed,
    acceptRequestDirect,
    dismissRequest,
  } = useAirportNegotiation()

  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  const availableRequests = requests.filter((r) => r.status === 'pending')

  const load = useCallback(async () => {
    if (!user?.id || !isDriver) return
    await loadDriverFeed()
  }, [user?.id, isDriver, loadDriverFeed])

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

  const handlePropose = (item: AirportRequest) => {
    navigation.navigate('SetTripPrice', {
      requestId: item.id,
      mode: 'propose',
      currentPrice: item.offered_price,
    })
  }

  const handleAccept = (item: AirportRequest) => {
    Alert.alert(
      'Aceptar viaje',
      `¿Aceptas el viaje de ${item.passenger_name ?? 'el pasajero'} por ${formatPrice(item.offered_price)}? Se descontarán ${formatPrice(calculateTripAcceptFee(item.offered_price))} de tu billetera.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar viaje',
          onPress: async () => {
            try {
              setProcessing(item.id)
              await acceptRequestDirect(item.id)
              showSuccess('Viaje aceptado. Lo encontrarás en Aceptadas.')
              await load()
            } catch (err: any) {
              showError(err.message || 'No se pudo aceptar el viaje')
            } finally {
              setProcessing(null)
            }
          },
        },
      ]
    )
  }

  const handleDismiss = async (item: AirportRequest) => {
    if (!user?.id) return

    const { data: ownPendingOffer } = await supabase
      .from('airport_offers')
      .select('id')
      .eq('request_id', item.id)
      .eq('driver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    const message = ownPendingOffer
      ? 'Ya hiciste una oferta en esta solicitud. Se dejará de mostrar aquí, pero tu oferta sigue activa: si el pasajero la acepta, el viaje te aparecerá igual en "Aceptadas".'
      : 'Se deja de mostrar en tu lista. Otros conductores la seguirán viendo.'

    Alert.alert(
      'No me interesa',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          onPress: async () => {
            try {
              setProcessing(item.id)
              await dismissRequest(item.id, user.id)
            } catch (err: any) {
              showError(err.message || 'No se pudo descartar la solicitud')
            } finally {
              setProcessing(null)
            }
          },
        },
      ]
    )
  }

  const renderOfferItem = ({ item }: { item: AirportRequest }) => {
    const isProcessing = processing === item.id
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.when}>{formatDeparture(item.departure_time)}</Text>
          <View style={styles.cardTopRight}>
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>Nueva</Text>
            </View>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleDismiss(item)}
              disabled={!!processing}
              hitSlop={8}
              accessibilityLabel="No me interesa"
            >
              <Icon name="X" size={12} color={COLORS.white} />
              <Text style={styles.dismissBtnText}>No me interesa</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.route} numberOfLines={2}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.meta}>
          {item.passenger_name ?? 'Pasajero'} · {item.passengers}{' '}
          {item.passengers === 1 ? 'pasajero' : 'pasajeros'}
        </Text>

        <View style={styles.priceBox}>
          <View>
            <Text style={styles.priceLabel}>Ofrece</Text>
            <Text style={styles.priceValue}>{formatPrice(item.offered_price)}</Text>
          </View>
          <View style={styles.costBox}>
            <View style={styles.costLabelRow}>
              <Text style={styles.priceLabel}>Tu costo</Text>
              <TouchableOpacity
                onPress={() => Alert.alert(
                  '¿Cómo se calcula?',
                  'Es el 10% del precio acordado con el pasajero, con un mínimo de $3.000 y un máximo de $25.000. Se cobra al aceptar el viaje y se devuelve a tu saldo si el pasajero cancela antes de iniciarlo.'
                )}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="Info" size={13} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.costValue}>{formatPrice(calculateTripAcceptFee(item.offered_price))} de tu billetera</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnPrimary, !!processing && styles.btnDisabled]}
            onPress={() => handleAccept(item)}
            disabled={!!processing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>Aceptar viaje</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, !!processing && styles.btnDisabled]}
            onPress={() => navigation.navigate('NegotiationChat', {
              requestId: item.id,
              driverId: user?.id ?? '',
              driverName: item.passenger_name ?? 'Pasajero',
              otherUserId: item.passenger_id,
            })}
            disabled={!!processing}
          >
            <Text style={styles.btnOutlineText}>Chatear</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.proposeLink}
          onPress={() => handlePropose(item)}
          disabled={!!processing}
        >
          <Text style={styles.proposeText}>Proponer otro precio</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="theSearch" width={170} />
      <Text style={styles.emptyTitle}>Sin solicitudes disponibles</Text>
      <Text style={styles.emptySubtitle}>
        Cuando un pasajero publique un viaje aparecerá aquí para que puedas ofertar
      </Text>
    </View>
  )

  if (!isDriver) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtitle}>Cambia a modo conductor para ver solicitudes de pasajeros</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {loading && availableRequests.length === 0 ? (
        <SkeletonCardList variant="offer" count={4} />
      ) : (
        <FlatList
          data={availableRequests}
          renderItem={renderOfferItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          scrollEnabled={availableRequests.length > 0}
        />
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  newPill: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  newPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.warningDark,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  dismissBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.white,
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
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  priceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  costBox: { alignItems: 'flex-end' },
  costLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  btnPrimary: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '800',
    color: COLORS.white,
  },
  btnOutline: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  btnDisabled: { opacity: 0.6 },
  proposeLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  proposeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.primary,
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
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
