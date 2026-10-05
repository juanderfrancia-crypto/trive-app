import { useCallback, useState } from 'react'
import { View, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native'
import { Text } from '../AppText'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme/theme'
import Illustration from '../illustrations/Illustration'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { NegotiationChatModal } from '../NegotiationChatModal'
import { useAirportNegotiation, AirportRequest } from '../../hooks/useAirportNegotiation'
import { showSuccess, showError } from '../../utils/showError'
import type { HubTabProps } from './types'
import { formatDeparture, formatPrice } from './formatters'

export default function AvailableOffersTab({ isDriver }: HubTabProps) {
  const user = useAppStore((s) => s.user)
  const {
    requests,
    loading,
    loadDriverFeed,
    createOffer,
    acceptRequestDirect,
  } = useAirportNegotiation()

  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AirportRequest | null>(null)
  const [proposedPrice, setProposedPrice] = useState('')
  const [chatRequest, setChatRequest] = useState<AirportRequest | null>(null)

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
    setSelectedRequest(item)
    setProposedPrice(item.offered_price.toString())
    setShowProposalModal(true)
  }

  const handleSubmitProposal = async () => {
    if (!user?.id || !selectedRequest) return
    const price = parseInt(proposedPrice.replace(/\D/g, ''), 10)
    if (!price || price <= 0) {
      showError('Ingresa un precio válido')
      return
    }
    try {
      setProcessing('proposal')
      await createOffer(selectedRequest.id, user.id, price)
      showSuccess('Tu propuesta fue enviada. El pasajero la verá al instante.')
      setShowProposalModal(false)
      setSelectedRequest(null)
      setProposedPrice('')
    } catch (err: any) {
      showError(err.message || 'Error al enviar propuesta')
    } finally {
      setProcessing(null)
    }
  }

  const handleAccept = (item: AirportRequest) => {
    Alert.alert(
      'Aceptar viaje',
      `¿Aceptas el viaje de ${item.passenger_name ?? 'el pasajero'} por ${formatPrice(item.offered_price)}? Se descontarán $5.000 de tu billetera.`,
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

  const renderOfferItem = ({ item }: { item: AirportRequest }) => {
    const isProcessing = processing === item.id
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.when}>{formatDeparture(item.departure_time)}</Text>
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>Nueva</Text>
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
            <Text style={styles.priceLabel}>Tu costo</Text>
            <Text style={styles.costValue}>$5.000 de tu billetera</Text>
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
            onPress={() => setChatRequest(item)}
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
        <SkeletonList count={4} />
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

      {chatRequest && (
        <NegotiationChatModal
          visible={!!chatRequest}
          onClose={() => setChatRequest(null)}
          requestId={chatRequest.id}
          driverId={user?.id ?? ''}
          driverName={chatRequest.passenger_name ?? 'Pasajero'}
          otherUserId={chatRequest.passenger_id}
        />
      )}

      <Modal visible={showProposalModal} transparent animationType="slide" onRequestClose={() => setShowProposalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proponer precio</Text>
            {selectedRequest && (
              <Text style={styles.modalSub}>
                Precio del pasajero: {formatPrice(selectedRequest.offered_price)}
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
              value={proposedPrice}
              onChangeText={(t) => setProposedPrice(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="Tu precio"
              placeholderTextColor={COLORS.textTertiary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowProposalModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleSubmitProposal}
                disabled={processing === 'proposal'}
              >
                {processing === 'proposal' ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Enviar propuesta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: `${COLORS.textPrimary}73`,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: { fontWeight: '600', color: COLORS.textSecondary },
  modalConfirm: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  modalConfirmText: { fontWeight: '700', color: COLORS.white },
})
