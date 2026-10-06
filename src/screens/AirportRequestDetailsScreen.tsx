import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Image, Alert } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import DepthCard from '../components/DepthCard'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { NegotiationChatModal } from '../components/NegotiationChatModal'
import { showSuccess, showError } from '../utils/showError'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'

export default function AirportRequestDetailsScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { requestId } = route.params || {}

  const {
    requests,
    offers,
    loading,
    error,
    loadOffersForRequest,
    loadSingleRequest,
    updateRequestPrice,
    acceptPassengerOffer,
    rejectOffer,
    cancelRequest,
  } = useAirportNegotiation()

  const [showPriceModal, setShowPriceModal] = useState(false)
  const [chatWith, setChatWith] = useState<{ driverId: string; driverName: string } | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [updatingPrice, setUpdatingPrice] = useState(false)
  const [loadingRequest, setLoadingRequest] = useState(!requests.find(r => r.id === requestId))

  const request = requests.find(r => r.id === requestId)

  useEffect(() => {
    if (requestId && !request && loadingRequest) {
      loadSingleRequest(requestId).then(() => {
        setLoadingRequest(false)
      })
    } else if (request) {
      setLoadingRequest(false)
    }
  }, [requestId, request, loadSingleRequest, loadingRequest])

  useEffect(() => {
    if (requestId && request) {
      loadOffersForRequest(requestId)
    }
  }, [requestId, request, loadOffersForRequest])

  const handleUpdatePrice = async () => {
    const price = parseInt(newPrice.replace(/\D/g, ''), 10)
    if (!price || price <= 0) {
      showError('Ingresa un precio válido')
      return
    }

    try {
      setUpdatingPrice(true)
      await updateRequestPrice(requestId, price)
      showSuccess('Precio actualizado. Los conductores verán el cambio al instante.')
      setNewPrice('')
      setShowPriceModal(false)
    } catch (err: any) {
      showError(err.message)
    } finally {
      setUpdatingPrice(false)
    }
  }

  const handleRejectOffer = async (offerId: string) => {
    try {
      await rejectOffer(offerId)
      await loadOffersForRequest(requestId)
      showSuccess('Propuesta rechazada')
    } catch (err: any) {
      showError(err?.message || 'No se pudo rechazar la propuesta')
    }
  }

  const handleAcceptOffer = async (offerId: string) => {
    Alert.alert(
      'Confirmar aceptación',
      '¿Aceptas esta oferta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              await acceptPassengerOffer(offerId, requestId)
              showSuccess('¡Viaje confirmado! El conductor te contactará.')
              setTimeout(() => navigation.goBack(), 1500)
            } catch (err: any) {
              showError(err.message)
            }
          },
        },
      ]
    )
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancelar solicitud',
      '¿Estás seguro que quieres cancelar? Todos los conductores dejarán de verla.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRequest(requestId, request?.passenger_id!)
              showSuccess('Solicitud cancelada')
              navigation.goBack()
            } catch (err: any) {
              showError(err.message)
            }
          },
        },
      ]
    )
  }

  if (loadingRequest || !request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const pendingOffers = offers.filter(o => o.status === 'pending')
  const acceptedOffer = offers.find(o => o.status === 'accepted')

  const renderAvatar = (name?: string | null, url?: string | null) =>
    url ? (
      <Image source={{ uri: url }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarInitial}>{name?.charAt(0).toUpperCase() || 'C'}</Text>
      </View>
    )

  const renderRating = (rating?: number | null) => (
    <View style={styles.ratingRow}>
      <Icon name="Star" size={13} color={COLORS.warning} />
      <Text style={styles.ratingText}>{rating ? rating.toFixed(1) : 'Nuevo'}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerHero}>
          <Text style={styles.headerTitle}>Detalle de la solicitud</Text>
          <Text style={styles.headerSub}>Revisa las ofertas de los conductores</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <DepthCard style={styles.section} contentStyle={styles.cardContent}>
          <View style={styles.routeRows}>
            <View style={styles.routeRow}>
              <Icon name="CircleDot" size={16} color={COLORS.primary} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>ORIGEN</Text>
                <Text style={styles.routeValue}>{request.origin}</Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <Icon name="MapPin" size={16} color={COLORS.textPrimary} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>DESTINO</Text>
                <Text style={styles.routeValue}>{request.destination}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.routeLabel}>PASAJEROS</Text>
              <Text style={styles.metaValue}>{request.passengers}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.routeLabel}>SALIDA</Text>
              <Text style={styles.metaValue}>{new Date(request.departure_time).toLocaleString('es-CO')}</Text>
            </View>
          </View>
        </DepthCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio ofrecido</Text>
          <DepthCard contentStyle={styles.priceContent}>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Precio actual</Text>
              <Text style={styles.priceValue}>${request.offered_price.toLocaleString('es-CO')}</Text>
              <Text style={styles.priceHint}>Publicado: ${request.initial_price.toLocaleString('es-CO')}</Text>
            </View>
            {!acceptedOffer && (
              <TouchableOpacity
                style={styles.priceEditBtn}
                onPress={() => {
                  setNewPrice(request.offered_price.toString())
                  setShowPriceModal(true)
                }}
                activeOpacity={0.7}
              >
                <Icon name="SquarePen" size={16} color={COLORS.primary} />
                <Text style={styles.priceEditBtnText}>Subir oferta</Text>
              </TouchableOpacity>
            )}
          </DepthCard>
        </View>

        {acceptedOffer ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Viaje confirmado</Text>
            <DepthCard borderColor={COLORS.success} contentStyle={styles.cardContent}>
              <View style={styles.driverRow}>
                {renderAvatar(acceptedOffer.driver_name, acceptedOffer.driver_avatar_url)}
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{acceptedOffer.driver_name}</Text>
                  {renderRating(acceptedOffer.driver_rating)}
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.acceptedPrice}>
                <Text style={styles.priceLabel}>Precio acordado</Text>
                <Text style={[styles.priceValue, styles.successText]}>
                  ${(acceptedOffer.proposed_price || request.offered_price).toLocaleString('es-CO')}
                </Text>
              </View>
            </DepthCard>
          </View>
        ) : pendingOffers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Propuestas de conductores ({pendingOffers.length})</Text>
            {pendingOffers.map(offer => (
              <DepthCard key={offer.id} style={styles.offerWrap} contentStyle={styles.cardContent}>
                <View style={styles.offerTop}>
                  <View style={styles.driverRow}>
                    {renderAvatar(offer.driver_name, offer.driver_avatar_url)}
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{offer.driver_name}</Text>
                      {renderRating(offer.driver_rating)}
                    </View>
                  </View>
                  <View style={styles.offerPrice}>
                    <Text style={styles.offerPriceLabel}>{offer.proposed_price ? 'Propone' : 'Acepta precio'}</Text>
                    <Text style={styles.offerPriceValue}>
                      ${(offer.proposed_price || request.offered_price).toLocaleString('es-CO')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOffer(offer.id)} activeOpacity={0.85}>
                  <Icon name="CircleCheck" size={18} color={COLORS.white} />
                  <Text style={styles.acceptBtnText}>Aceptar esta oferta</Text>
                </TouchableOpacity>

                <View style={styles.offerActions}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => setChatWith({ driverId: offer.driver_id, driverName: offer.driver_name || 'Conductor' })}
                    activeOpacity={0.75}
                  >
                    <Icon name="MessageCircle" size={16} color={COLORS.primary} />
                    <Text style={styles.chatBtnText}>Chatear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectOffer(offer.id)} activeOpacity={0.75}>
                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </DepthCard>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Illustration name="theSearch" width={170} />
            <Text style={styles.emptyTitle}>Sin propuestas aún</Text>
            <Text style={styles.emptyText}>Los conductores verán tu solicitud y podrán hacer propuestas</Text>
          </View>
        )}

        {!acceptedOffer && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
            <Icon name="CircleX" size={18} color={COLORS.error} />
            <Text style={styles.cancelBtnText}>Cancelar solicitud</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {chatWith && (
        <NegotiationChatModal
          visible={!!chatWith}
          onClose={() => setChatWith(null)}
          requestId={requestId}
          driverId={chatWith.driverId}
          driverName={chatWith.driverName}
          otherUserId={chatWith.driverId}
        />
      )}

      <Modal visible={showPriceModal} animationType="slide" transparent onRequestClose={() => setShowPriceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subir oferta</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Icon name="X" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Nuevo precio</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el nuevo precio"
                  placeholderTextColor={COLORS.textTertiary}
                  value={newPrice}
                  onChangeText={(t) => setNewPrice(t.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  editable={!updatingPrice}
                />
              </View>
              <Text style={styles.priceHint}>Precio actual: ${request.offered_price.toLocaleString('es-CO')}</Text>

              <TouchableOpacity style={styles.updateBtn} onPress={handleUpdatePrice} disabled={updatingPrice} activeOpacity={0.85}>
                {updatingPrice ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="Check" size={18} color={COLORS.white} />
                    <Text style={styles.updateBtnText}>Actualizar precio</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerHero: { flex: 1, gap: 2 },
  headerTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },
  headerSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  cardContent: { padding: SPACING.lg },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },

  routeRows: { gap: SPACING.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  routeTexts: { flex: 1 },
  routeLabel: { ...TYPOGRAPHY.labelSmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textTertiary, letterSpacing: 1 },
  routeValue: { ...TYPOGRAPHY.body, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textPrimary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCell: { gap: 4 },
  metaValue: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },

  priceContent: { padding: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md },
  priceInfo: { flex: 1, gap: 2 },
  priceLabel: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  priceValue: { ...TYPOGRAPHY.h1, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.primary },
  priceHint: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  priceEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  priceEditBtnText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  driverInfo: { flex: 1, gap: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...TYPOGRAPHY.body, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
  driverName: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },

  acceptedPrice: { alignItems: 'center', gap: 2 },
  successText: { color: COLORS.success },

  offerWrap: { marginBottom: SPACING.md },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  offerPrice: { alignItems: 'flex-end' },
  offerPriceLabel: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  offerPriceValue: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.primary },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  acceptBtnText: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
  offerActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chatBtnText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rejectBtnText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.lg },
  emptyTitle: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 260 },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  cancelBtnText: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.error },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 26, 46, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  modalBody: { padding: SPACING.lg, gap: SPACING.sm },
  label: { ...TYPOGRAPHY.labelSmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  currency: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  input: { flex: 1, ...TYPOGRAPHY.h4, color: COLORS.textPrimary, paddingVertical: 0 },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  updateBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
})
