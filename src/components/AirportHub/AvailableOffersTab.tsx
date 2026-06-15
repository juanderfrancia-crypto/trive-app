import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { useAirportNegotiation, AirportRequest } from '../../hooks/useAirportNegotiation'
import { showSuccess, showError } from '../../utils/showError'
import type { HubTabProps } from './types'

export default function AvailableOffersTab({ isDriver }: HubTabProps) {
  const user = useAppStore((s) => s.user)
  const {
    requests,
    loading,
    loadDriverFeed,
    createOffer,
  } = useAirportNegotiation()

  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AirportRequest | null>(null)
  const [proposedPrice, setProposedPrice] = useState('')

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

  const handleAcceptPrice = (item: AirportRequest) => {
    if (!user?.id) return
    Alert.alert(
      'Enviar oferta',
      `¿Ofreces aceptar el viaje de ${item.passenger_name ?? 'el pasajero'} por $${item.offered_price.toLocaleString('es-CO')}?\n\nEl pasajero deberá confirmarte. Se descontarán $5.000 al confirmar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar oferta',
          onPress: async () => {
            try {
              setProcessing(item.id)
              await createOffer(item.id, user.id)
              showSuccess('Oferta enviada. Te avisamos cuando el pasajero la acepte.')
            } catch (err: any) {
              showError(err.message || 'Error al enviar oferta')
            } finally {
              setProcessing(null)
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

  const renderOfferItem = ({ item }: { item: AirportRequest }) => {
    const isProcessing = processing === item.id
    return (
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <Text style={styles.passengerName} numberOfLines={1}>
            {item.passenger_name ?? 'Pasajero'}
          </Text>
          <Text style={styles.offerPrice}>${item.offered_price.toLocaleString('es-CO')}</Text>
        </View>

        <Text style={styles.offerRoute} numberOfLines={2}>
          {item.origin} → {item.destination}
        </Text>

        <Text style={styles.offerMeta}>
          {formatDateTime(item.departure_time)} · {item.passengers}{' '}
          {item.passengers === 1 ? 'persona' : 'personas'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnOutline, processing === 'proposal' && styles.btnDisabled]}
            onPress={() => handlePropose(item)}
            disabled={!!processing}
          >
            <Ionicons name="arrow-up-outline" size={16} color={COLORS.primary} />
            <Text style={styles.btnOutlineText}>Proponer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, isProcessing && styles.btnDisabled]}
            onPress={() => handleAcceptPrice(item)}
            disabled={!!processing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Aceptar precio</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="briefcase-outline" size={48} color={COLORS.primary} />
      </View>
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
      <View style={styles.commissionStrip}>
        <Ionicons name="wallet-outline" size={15} color={COLORS.primary} />
        <Text style={styles.commissionText}>
          Al confirmar el pasajero se descuentan <Text style={styles.commissionBold}>$5.000</Text> de tu billetera
        </Text>
      </View>

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

      <Modal visible={showProposalModal} transparent animationType="slide" onRequestClose={() => setShowProposalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proponer precio</Text>
            {selectedRequest && (
              <Text style={styles.modalSub}>
                Precio del pasajero: ${selectedRequest.offered_price.toLocaleString('es-CO')}
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
                  <ActivityIndicator color="#fff" />
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
  container: { flex: 1, backgroundColor: COLORS.surface },
  commissionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#eef2ff',
    borderRadius: RADIUS.md,
  },
  commissionText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: COLORS.textSecondary },
  commissionBold: { fontWeight: '700', color: COLORS.primary },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  offerCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passengerName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  offerPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.success,
  },
  offerRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  offerMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textTertiary,
  },
  buttonRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  btnOutlineText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.text,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
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
  modalConfirmText: { fontWeight: '700', color: '#fff' },
})
