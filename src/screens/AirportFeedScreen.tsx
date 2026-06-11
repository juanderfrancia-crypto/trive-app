import React, { useCallback, useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAirportNegotiation, AirportRequest } from '../hooks/useAirportNegotiation'
import { SkeletonAirportCard } from '../components/Skeleton'
import { NegotiationChatModal } from '../components/NegotiationChatModal'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'

export default function AirportFeedScreen() {
  const navigation = useNavigation()
  const {
    requests,
    loading,
    loadDriverFeed,
    loadDriverActiveTrips,
    createOffer,
    startTrip,
    completeTrip,
    rateTrip,
  } = useAirportNegotiation()
  const user = useAppStore((s) => s.user)

  // Tab state - Agregado: active_trips y completed_trips
  const [activeTab, setActiveTab] = useState<'available' | 'my_offers' | 'active_trips' | 'completed_trips'>('available')

  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AirportRequest | null>(null)
  const [proposedPrice, setProposedPrice] = useState('')
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingTrip, setRatingTrip] = useState<AirportRequest | null>(null)
  const [selectedRating, setSelectedRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  
  // 💬 Estado para chat de negociación
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatRequest, setChatRequest] = useState<AirportRequest | null>(null)

  // Filtrar solicitudes según el tab activo
  const availableRequests = requests.filter(r => r.status === 'pending' && r.driver_id !== user?.id)
  const myOffers = requests.filter(r => r.status === 'pending' && r.driver_id !== user?.id) // TODO: filtrar por ofertas del conductor
  const activeTrips = requests.filter(r => r.driver_id === user?.id && (r.status === 'accepted' || r.status === 'in_progress'))
  const completedTrips = requests.filter(r => r.driver_id === user?.id && r.status === 'completed')

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        if (activeTab === 'active_trips') {
          loadDriverActiveTrips(user.id)
        } else {
          loadDriverFeed()
        }
      }
    }, [loadDriverFeed, loadDriverActiveTrips, activeTab, user?.id])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (user?.id) {
      if (activeTab === 'active_trips') {
        await loadDriverActiveTrips(user.id)
      } else {
        await loadDriverFeed()
      }
    }
    setRefreshing(false)
  }, [loadDriverFeed, loadDriverActiveTrips, activeTab, user?.id])

  const handlePropose = (item: AirportRequest) => {
    setSelectedRequest(item)
    setProposedPrice(item.offered_price.toString())
    setProcessing(null)  // Resetear processing para habilitar input
    setShowProposalModal(true)
  }

  const handleSubmitProposal = async () => {
    if (!user?.id || !selectedRequest) return

    const price = parseInt(proposedPrice.replace(/\D/g, ''), 10)
    if (!price || price <= 0) {
      showError('Ingresa un precio válido')
      return
    }

    // ✅ Usar "proposal" para identificar que estamos en el modal
    try {
      setProcessing('proposal')
      const result = await createOffer(selectedRequest.id, user.id, price)
      
      // Mostrar éxito
      showSuccess('✅ Tu propuesta fue enviada. El pasajero la verá al instante.')
      
      // Cerrar modal y resetear
      setTimeout(() => {
        setShowProposalModal(false)
        setSelectedRequest(null)
        setProposedPrice('')
        setProcessing(null)
      }, 500)
    } catch (err: any) {
      console.error('Error en handleSubmitProposal:', err)
      showError(err.message || 'Error al enviar propuesta')
      setProcessing(null)
    }
  }

  const handleSubmitRating = async () => {
    if (!user?.id || !ratingTrip || selectedRating === 0) {
      showError('Por favor selecciona una calificación')
      return
    }

    try {
      setProcessing(`rating_${ratingTrip.id}`)
      await rateTrip(ratingTrip.id, selectedRating, ratingComment)
      showSuccess('✅ ¡Gracias por calificar el viaje!')
      
      setTimeout(() => {
        setShowRatingModal(false)
        setRatingTrip(null)
        setSelectedRating(0)
        setRatingComment('')
        setProcessing(null)
      }, 500)
    } catch (err: any) {
      showError(err.message || 'Error al calificar viaje')
      setProcessing(null)
    }
  }

  const handleAcceptPrice = async (item: AirportRequest) => {
    if (!user?.id) return

    Alert.alert(
      'Confirmar viaje',
      `¿Aceptas el viaje de ${item.passenger_name ?? 'el pasajero'} por $${item.offered_price.toLocaleString('es-CO')}?\n\nSe descuentan $5.000 de tu billetera.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar viaje',
          onPress: async () => {
            try {
              setProcessing(item.id)
              // Crear oferta sin propuesta (acepta precio actual)
              await createOffer(item.id, user.id)
              showSuccess('¡Espera! El pasajero verá tu oferta. Serás notificado cuando la acepte.')
            } catch (err: any) {
              showError(err.message || 'Error al aceptar el viaje')
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

  const renderItem = ({ item }: { item: AirportRequest }) => {
    const isProcessing = processing === item.id
    const isAvailableTab = activeTab === 'available'
    const isActiveTripsTab = activeTab === 'active_trips'

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

        {/* Ruta + Tipo de viaje */}
        <View style={s.routeBox}>
          <View style={s.routeLine}>
            <View style={s.dotGreen} />
            <View style={s.lineSegment} />
            <View style={s.dotBlue} />
          </View>
          <View style={[s.routeLabels, { flex: 1 }]}>
            <Text style={s.routeCity} numberOfLines={1}>{item.origin}</Text>
            <Text style={s.routeCity} numberOfLines={1}>{item.destination}</Text>
          </View>
          {/* Trip type badge */}
          <View style={[s.tripBadge, item.trip_type === 'airport' && s.tripBadgeAirport, item.trip_type === 'city_destination' && s.tripBadgeCenter, item.trip_type === 'custom' && s.tripBadgeCustom]}>
            <Ionicons 
              name={item.trip_type === 'airport' ? 'airplane' : item.trip_type === 'city_destination' ? 'business' : 'location'} 
              size={12} 
              color={item.trip_type === 'airport' ? '#fff' : item.trip_type === 'city_destination' ? '#fff' : '#fff'}
            />
            <Text style={s.tripBadgeText}>{item.trip_type === 'airport' ? 'Aero' : item.trip_type === 'city_destination' ? 'Centro' : 'Otro'}</Text>
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

        {/* Indicador de precio actualizado */}
        {item.initial_price !== item.offered_price && (
          <View style={s.priceUpdateBanner}>
            <Ionicons name="information-circle" size={14} color="#F59E0B" />
            <Text style={s.priceUpdateText}>
              El pasajero subió la oferta: ${item.initial_price.toLocaleString('es-CO')} → ${item.offered_price.toLocaleString('es-CO')}
            </Text>
          </View>
        )}

        {/* Botones de acción - DISPONIBLES */}
        {isAvailableTab && (
          <View style={s.buttonRow}>
            <TouchableOpacity
              style={[s.btnWrapper, s.btnProposal, processing === 'proposal' && s.btnDisabled]}
              onPress={() => handlePropose(item)}
              disabled={processing === 'proposal'}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-up-outline" size={16} color={COLORS.primary} />
              <Text style={s.btnProposalText}>Proponer precio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnWrapper, s.btnAccept, isProcessing && s.btnDisabled]}
              onPress={() => handleAcceptPrice(item)}
              disabled={isProcessing}
              activeOpacity={0.75}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={s.btnAcceptText}>Aceptar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Botones de acción - VIAJES ACTIVOS */}
        {isActiveTripsTab && (
          <View style={s.buttonRow}>
            {/* Botón Chatear - disponible en ambos estados */}
            <TouchableOpacity
              style={[s.btnWrapper, s.btnChat]}
              onPress={() => {
                setChatRequest(item)
                setShowChatModal(true)
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
              <Text style={s.btnChatText}>💬 Chat</Text>
            </TouchableOpacity>

            {item.status === 'accepted' && (
              <TouchableOpacity
                style={[s.btnWrapper, s.btnAccept, isProcessing && s.btnDisabled]}
                onPress={async () => {
                  try {
                    setProcessing(item.id)
                    await startTrip(item.id)
                    showSuccess('✅ Viaje iniciado. ¡Bienvenido!')
                  } catch (err: any) {
                    showError(err.message || 'Error al iniciar viaje')
                  } finally {
                    setProcessing(null)
                  }
                }}
                disabled={isProcessing}
                activeOpacity={0.75}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play-circle-outline" size={16} color="#fff" />
                    <Text style={s.btnAcceptText}>🚗 Iniciar viaje</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {item.status === 'in_progress' && (
              <TouchableOpacity
                style={[s.btnWrapper, s.btnAccept, isProcessing && s.btnDisabled]}
                onPress={async () => {
                  try {
                    setProcessing(item.id)
                    await completeTrip(item.id)
                    showSuccess('✅ Viaje completado. ¡Gracias por tu servicio!')
                  } catch (err: any) {
                    showError(err.message || 'Error al completar viaje')
                  } finally {
                    setProcessing(null)
                  }
                }}
                disabled={isProcessing}
                activeOpacity={0.75}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s.btnAcceptText}>✔️ Completar viaje</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Botones de acción - VIAJES COMPLETADOS */}
        {activeTab === 'completed_trips' && (
          <View style={s.buttonRow}>
            <TouchableOpacity
              style={[s.btnWrapper, s.btnAccept]}
              onPress={() => {
                setRatingTrip(item)
                setSelectedRating(0)
                setRatingComment('')
                setShowRatingModal(true)
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="star-outline" size={16} color="#fff" />
              <Text style={s.btnAcceptText}>⭐ Calificar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={s.emptyCard}>
      <Ionicons name="airplane-outline" size={48} color={COLORS.textTertiary} />
      <Text style={s.emptyTitle}>Sin solicitudes por ahora</Text>
      <Text style={s.emptySub}>Cuando un pasajero publique un viaje (al aeropuerto, centro o destino personalizado) aparecerá aquí.</Text>
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
          <Ionicons name="car-sport" size={22} color="rgba(255,255,255,0.9)" />
          <Text style={s.headerTitle}>Mis Viajes</Text>
        </View>
      </LinearGradient>

      {/* Tabs Navigation */}
      <View style={s.tabsContainer}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'available' && s.tabActive]}
          onPress={() => setActiveTab('available')}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={16} color={activeTab === 'available' ? '#fff' : '#666'} />
          <Text style={[s.tabText, activeTab === 'available' && s.tabTextActive]}>Disponibles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'active_trips' && s.tabActive]}
          onPress={() => setActiveTab('active_trips')}
          activeOpacity={0.7}
        >
          <Ionicons name="car" size={16} color={activeTab === 'active_trips' ? '#fff' : '#666'} />
          <Text style={[s.tabText, activeTab === 'active_trips' && s.tabTextActive]}>Activos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'completed_trips' && s.tabActive]}
          onPress={() => setActiveTab('completed_trips')}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={16} color={activeTab === 'completed_trips' ? '#fff' : '#666'} />
          <Text style={[s.tabText, activeTab === 'completed_trips' && s.tabTextActive]}>Completados</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {activeTab === 'available' && (
        <>
          {/* Info strip para tab de disponibles */}
          <View style={s.commissionStrip}>
            <Ionicons name="wallet-outline" size={15} color={COLORS.primary} />
            <Text style={s.commissionText}>
              Al aceptar se descuentan <Text style={s.commissionBold}>$5.000</Text> de tu billetera
            </Text>
          </View>
          {loading && !refreshing ? (
            <View style={[s.list, { gap: 0 }]}>
              <SkeletonAirportCard />
              <SkeletonAirportCard />
              <SkeletonAirportCard />
            </View>
          ) : (
            <FlatList
              data={availableRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={[s.list, availableRequests.length === 0 && s.listEmpty]}
              ListEmptyComponent={renderEmpty}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {activeTab === 'active_trips' && (
        <FlatList
          data={activeTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, activeTrips.length === 0 && s.listEmpty]}
          ListEmptyComponent={() => (
            <View style={s.emptyContainer}>
              <Ionicons name="car-outline" size={48} color={COLORS.textTertiary} style={{ marginBottom: 16, opacity: 0.4 }} />
              <Text style={s.emptyTitle}>Sin viajes activos</Text>
              <Text style={s.emptyText}>Tus viajes confirmados aparecerán aquí</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab === 'completed_trips' && (
        <FlatList
          data={completedTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, completedTrips.length === 0 && s.listEmpty]}
          ListEmptyComponent={() => (
            <View style={s.emptyContainer}>
              <Ionicons name="checkmark-done-outline" size={48} color={COLORS.textTertiary} style={{ marginBottom: 16, opacity: 0.4 }} />
              <Text style={s.emptyTitle}>Sin viajes completados</Text>
              <Text style={s.emptyText}>Los viajes completados aparecerán aquí</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para calificar viaje */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowRatingModal(false)}
          >
            <View style={s.modalContent} pointerEvents="box-only">
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Calificar viaje</Text>
                <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={s.modalBody}>
                {ratingTrip && (
                  <>
                    {/* Ruta del viaje */}
                    <View style={s.modalRoute}>
                      <Text style={s.modalRouteLabel}>De {ratingTrip.origin} a {ratingTrip.destination}</Text>
                      <Text style={s.modalRouteValue}>Conductor: {ratingTrip.passenger_name}</Text>
                    </View>

                    {/* Selector de calificación */}
                    <View style={s.modalPriceSection}>
                      <Text style={s.modalLabel}>Calificación</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 16 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setSelectedRating(star)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={star <= selectedRating ? 'star' : 'star-outline'}
                              size={32}
                              color={star <= selectedRating ? '#F59E0B' : '#CBD5E1'}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Comentario */}
                    <View style={{ marginBottom: SPACING.lg }}>
                      <Text style={s.modalLabel}>Comentario (opcional)</Text>
                      <TextInput
                        style={[s.input, { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 80, textAlignVertical: 'top' }]}
                        placeholder="Comparte tu experiencia..."
                        placeholderTextColor={COLORS.textTertiary}
                        value={ratingComment}
                        onChangeText={setRatingComment}
                        multiline
                      />
                    </View>

                    {/* Botón enviar */}
                    <TouchableOpacity
                      style={[s.submitBtn, processing?.startsWith('rating') && s.submitBtnDisabled]}
                      onPress={handleSubmitRating}
                      disabled={processing?.startsWith('rating') || selectedRating === 0}
                      activeOpacity={0.75}
                    >
                      {processing?.startsWith('rating') ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={16} color="#fff" />
                          <Text style={s.submitBtnText}>Enviar calificación</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* Modal para proponer precio */}
      <Modal
        visible={showProposalModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProposalModal(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowProposalModal(false)}
          >
            <View style={s.modalContent} pointerEvents="box-only">
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Proponer precio</Text>
                <TouchableOpacity onPress={() => setShowProposalModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {selectedRequest && (
                <View style={s.modalBody}>
                  <View style={s.modalRoute}>
                    <Text style={s.modalRouteLabel}>Ruta</Text>
                    <Text style={s.modalRouteValue}>{selectedRequest.origin} → {selectedRequest.destination}</Text>
                  </View>

                  <View style={s.modalPriceSection}>
                    <Text style={s.modalLabel}>Tu propuesta</Text>
                    <Text style={s.modalHint}>
                      Precio ofrecido: ${selectedRequest.offered_price.toLocaleString('es-CO')}
                    </Text>
                    <View style={s.priceInput}>
                      <Text style={s.currencySymbol}>$</Text>
                      <TextInput
                        style={s.input}
                        placeholder="Ingresa tu propuesta"
                        placeholderTextColor={COLORS.textTertiary}
                        value={proposedPrice}
                        onChangeText={(t) => setProposedPrice(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        editable={processing === null}
                      />
                    </View>

                    {proposedPrice && parseInt(proposedPrice.replace(/\D/g, '')) >= selectedRequest.offered_price && (
                      <Text style={s.infoText}>
                        ℹ️ El pasajero verá tu propuesta y decidirá si la acepta
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[s.submitBtn, processing && s.submitBtnDisabled]}
                    onPress={handleSubmitProposal}
                    disabled={processing !== null}
                    activeOpacity={0.8}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={s.submitBtnText}>Enviar propuesta</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* 💬 Modal de Chat de Negociación */}
      {chatRequest && (
        <NegotiationChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          requestId={chatRequest.id}
          driverName={chatRequest.passenger_name || 'Pasajero'}
          otherUserId={chatRequest.passenger_id}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Header
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
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  // Commission strip
  commissionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  commissionText: { fontSize: 13, color: '#3730A3' },
  commissionBold: { fontWeight: '700' },

  // List
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cardTopInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: COLORS.textTertiary },
  priceBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceBadgeText: { color: '#065F46', fontSize: 14, fontWeight: '700' },

  // Route
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeLine: { alignItems: 'center', gap: 0 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  lineSegment: { width: 2, height: 28, backgroundColor: COLORS.border, marginVertical: 3 },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  routeLabels: { flex: 1, gap: 12 },
  routeCity: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },

  // Chips
  chipsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  chipFlex: { flex: 1 },
  chipText: { fontSize: 12, color: COLORS.textSecondary },

  // Price update banner
  priceUpdateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  priceUpdateText: { fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: SPACING.sm },
  btnWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  btnProposal: {
    backgroundColor: 'rgba(14, 38, 153, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnProposalText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  btnAccept: {
    backgroundColor: COLORS.primary,
  },
  btnAcceptText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnChat: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  btnChatText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  btnDisabled: { opacity: 0.5 },

  // Empty state
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl * 2,
    maxHeight: '80%',
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
  modalRoute: { marginBottom: SPACING.lg },
  modalRouteLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textTertiary, marginBottom: SPACING.xs },
  modalRouteValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  modalPriceSection: { marginBottom: SPACING.xl },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  modalHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
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
  warningText: { fontSize: 12, color: '#F59E0B', fontWeight: '500' },
  infoText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  submitBtnDisabled: { opacity: 0.6 },

  // Trip type badge
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  tripBadgeAirport: {
    backgroundColor: '#3B82F6',
  },
  tripBadgeCenter: {
    backgroundColor: '#10B981',
  },
  tripBadgeCustom: {
    backgroundColor: '#F59E0B',
  },
  tripBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Tabs navigation
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Empty container
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
})

