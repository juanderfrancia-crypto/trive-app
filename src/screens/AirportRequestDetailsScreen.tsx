import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Image, Alert } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import Button from '../components/Button'
import { NegotiationChatModal } from '../components/NegotiationChatModal'
import { showSuccess, showError } from '../utils/showError'
import Icon from '../components/Icon'

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
    acceptOffer,
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

  // Cargar solicitud individual si no existe en el array
  useEffect(() => {
    if (requestId && !request && loadingRequest) {
      loadSingleRequest(requestId).then(() => {
        setLoadingRequest(false)
      })
    } else if (request) {
      setLoadingRequest(false)
    }
  }, [requestId, request, loadSingleRequest, loadingRequest])

  // Cargar ofertas al montar
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
              console.log('🔵 [FRONTEND] Iniciando aceptación de oferta:', { offerId, requestId })
              await acceptPassengerOffer(offerId, requestId)
              console.log('✅ [FRONTEND] Oferta aceptada exitosamente')
              showSuccess('¡Viaje confirmado! El conductor te contactará.')
              setTimeout(() => navigation.goBack(), 1500)
            } catch (err: any) {
              console.error('❌ [FRONTEND] Error al aceptar oferta:', err)
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
  const rejectedOffers = offers.filter(o => o.status === 'rejected')

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ArrowLeft" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Detalles de tu solicitud</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Información de solicitud */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.routeInfo}>
              <View style={styles.routePoints}>
                <View style={styles.routeDot} />
                <View style={styles.routeLine} />
                <View style={[styles.routeDot, { backgroundColor: COLORS.error }]} />
              </View>
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>ORIGEN</Text>
                <Text style={styles.routeValue}>{request.origin}</Text>
                <Text style={[styles.routeLabel, { marginTop: SPACING.md }]}>DESTINO</Text>
                <Text style={styles.routeValue}>{request.destination}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View>
                <Text style={styles.detailLabel}>PASAJEROS</Text>
                <Text style={styles.detailValue}>{request.passengers}</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>SALIDA</Text>
                <Text style={styles.detailValue}>
                  {new Date(request.departure_time).toLocaleString('es-CO')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Precio actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio ofrecido</Text>
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Precio actual</Text>
              <Text style={styles.priceValue}>${request.offered_price.toLocaleString('es-CO')}</Text>
              <Text style={styles.priceHint}>
                Publicado: ${request.initial_price.toLocaleString('es-CO')}
              </Text>
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
                <Icon name="SquarePen" size={18} color={COLORS.primary} />
                <Text style={styles.priceEditBtnText}>Subir oferta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ofertas recibidas */}
        {acceptedOffer ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Viaje confirmado</Text>
            <View style={styles.acceptedOfferCard}>
              <View style={styles.driverInfo}>
                {acceptedOffer.driver_avatar_url ? (
                  <Image
                    source={{ uri: acceptedOffer.driver_avatar_url }}
                    style={styles.driverAvatar}
                  />
                ) : (
                  <View style={[styles.driverAvatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.driverInitial}>
                      {acceptedOffer.driver_name?.charAt(0).toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{acceptedOffer.driver_name}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="Star" size={13} color={COLORS.warning} />
                    <Text style={styles.ratingText}>
                      {acceptedOffer.driver_rating?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.acceptedPrice}>
                <Text style={styles.acceptedPriceLabel}>Precio acordado</Text>
                <Text style={styles.acceptedPriceValue}>
                  ${(acceptedOffer.proposed_price || request.offered_price).toLocaleString('es-CO')}
                </Text>
              </View>
            </View>
          </View>
        ) : pendingOffers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Propuestas de conductores ({pendingOffers.length})
            </Text>
            {pendingOffers.map(offer => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTop}>
                  <View style={styles.driverInfo}>
                    {offer.driver_avatar_url ? (
                      <Image
                        source={{ uri: offer.driver_avatar_url }}
                        style={styles.driverAvatar}
                      />
                    ) : (
                      <View style={[styles.driverAvatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={styles.driverInitial}>
                          {offer.driver_name?.charAt(0).toUpperCase() || 'C'}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{offer.driver_name}</Text>
                      <View style={styles.ratingRow}>
                        <Icon name="Star" size={13} color={COLORS.warning} />
                        <Text style={styles.ratingText}>
                          {offer.driver_rating?.toFixed(1) || '0.0'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.offerPrice}>
                    <Text style={styles.offerPriceLabel}>
                      {offer.proposed_price ? 'Propone' : 'Acepta precio'}
                    </Text>
                    <Text style={styles.offerPriceValue}>
                      ${(offer.proposed_price || request.offered_price).toLocaleString('es-CO')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptOffer(offer.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.acceptBtnText}>Aceptar esta oferta</Text>
                  <Icon name="CircleCheck" size={18} color="#fff" />
                </TouchableOpacity>
                <View style={styles.offerActions}>
                  <TouchableOpacity
                    style={styles.chatOfferBtn}
                    onPress={() => setChatWith({ driverId: offer.driver_id, driverName: offer.driver_name || 'Conductor' })}
                    activeOpacity={0.75}
                  >
                    <Icon name="MessageCircle" size={16} color={COLORS.primary} />
                    <Text style={styles.chatOfferBtnText}>Chatear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectOfferBtn}
                    onPress={() => handleRejectOffer(offer.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.rejectOfferBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Icon name="Hourglass" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>Sin propuestas aún</Text>
              <Text style={styles.emptySubtitle}>
                Los conductores verán tu solicitud y podrán hacer propuestas
              </Text>
            </View>
          </View>
        )}

        {/* Botón cancelar */}
        {!acceptedOffer && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Icon name="CircleX" size={18} color={COLORS.error} />
              <Text style={styles.cancelBtnText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          </View>
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

      {/* Modal para subir precio */}
      <Modal
        visible={showPriceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subir oferta</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Icon name="X" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Nuevo precio</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencySymbol}>$</Text>
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
              <Text style={styles.priceHint}>
                Precio actual: ${request.offered_price.toLocaleString('es-CO')}
              </Text>

              <TouchableOpacity
                style={styles.updateBtn}
                onPress={handleUpdatePrice}
                disabled={updatingPrice}
                activeOpacity={0.8}
              >
                {updatingPrice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="Check" size={18} color="#fff" />
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
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chatOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chatOfferBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  rejectOfferBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  rejectOfferBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Sections
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  // Info card
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  routeInfo: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  routePoints: { alignItems: 'center', gap: 0 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routeLine: { width: 2, height: 30, backgroundColor: COLORS.border, marginVertical: 3 },
  routeTexts: { flex: 1 },
  routeLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary },
  routeValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  detailRow: { flexDirection: 'row', gap: SPACING.lg, justifyContent: 'space-between' },
  detailLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary, marginBottom: SPACING.xs },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  // Price card
  priceCard: {
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryTint,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { fontSize: 11, fontWeight: '600', color: COLORS.primaryDark },
  priceValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  priceHint: { fontSize: 11, color: COLORS.primary, marginTop: SPACING.xs },
  priceEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(14, 38, 153, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  priceEditBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Offer card
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  offerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  driverAvatar: { width: 40, height: 40, borderRadius: RADIUS.md },
  driverInitial: { fontSize: 16, fontWeight: '700', color: '#fff' },
  driverName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  ratingText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  offerPrice: { alignItems: 'flex-end' },
  offerPriceLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary },
  offerPriceValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

  // Accepted offer
  acceptedOfferCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.successLight,
    padding: SPACING.lg,
  },
  acceptedPrice: { marginTop: SPACING.md, alignItems: 'center' },
  acceptedPriceLabel: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  acceptedPriceValue: { fontSize: 28, fontWeight: '800', color: COLORS.success, letterSpacing: -1 },

  // Buttons
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.error },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl * 2,
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalBody: { padding: SPACING.lg },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginRight: SPACING.xs },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  updateBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
