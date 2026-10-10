import { useState, useMemo, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, SectionList, RefreshControl, Alert, StatusBar, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon, { type IconName as IconNameType } from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useNotificationCenter } from '../context/NotificationsContext'
import { Notification } from '../hooks/useNotifications'
import { useAppStore } from '../store/useAppStore'
import { isDriverRole } from '../utils/userRole'
import RatingModal from '../components/RatingModal'
import { createReview } from '../services/reviews'
import { sendTripMessage } from '../services/trip_messages'
import { insertNotificationForUser } from '../services/notificationInsert'
import { getNotificationRoute } from '../navigation/NotificationNavigation'

type NotifType = Notification['type']
type IconName = IconNameType
type FilterId = 'all' | 'solicitudes' | 'reservas' | 'viajes' | 'ofertas' | 'mensajes'
type FilterDef = { id: FilterId; label: string; types: NotifType[] | null }
type DayGroup = 'Hoy' | 'Ayer' | 'Anteriores'

interface NotificationWithSender extends Notification {
  senderName?: string
}

const TRIP_TYPES: NotifType[] = [
  'booking', 'trip_update', 'driver_arrived', 'trip_completed', 'trip_confirm', 'trip_confirmed',
  'trip_started', 'review_pending', 'review_received', 'trip_rated',
]

const DRIVER_FILTERS: FilterDef[] = [
  { id: 'all', label: 'Todas', types: null },
  { id: 'solicitudes', label: 'Solicitudes', types: ['trip_published', 'offer_received', 'offer_accepted'] },
  { id: 'reservas', label: 'Reservas', types: TRIP_TYPES },
  { id: 'mensajes', label: 'Mensajes', types: ['message'] },
]

const PASSENGER_FILTERS: FilterDef[] = [
  { id: 'all', label: 'Todas', types: null },
  { id: 'viajes', label: 'Viajes', types: TRIP_TYPES },
  { id: 'mensajes', label: 'Mensajes', types: ['message'] },
  { id: 'ofertas', label: 'Ofertas', types: ['offer_received', 'offer_accepted'] },
]

const DAY_GROUPS: DayGroup[] = ['Hoy', 'Ayer', 'Anteriores']

const TRIP_ACTION_TYPES: NotifType[] = ['booking', 'trip_update', 'driver_arrived', 'trip_completed', 'review_pending']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

const dayGroupOf = (iso: string): DayGroup => {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(timestampOf(iso))) / 86400000)
  if (diff <= 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return 'Anteriores'
}

const timeLabelOf = (iso: string): string => {
  const d = timestampOf(iso)
  if (dayGroupOf(iso) === 'Anteriores') return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

const tileOf = (type: NotifType): { icon: IconName; bg: string; fg: string } => {
  switch (type) {
    case 'trip_published':
    case 'offer_received':
    case 'offer_accepted':
      return { icon: 'Star', bg: COLORS.warningLight, fg: COLORS.warningDark }
    case 'trip_confirm':
      return { icon: 'Check', bg: COLORS.primary, fg: COLORS.white }
    case 'trip_completed':
      return { icon: 'CircleCheck', bg: COLORS.surfaceAlt, fg: COLORS.primary }
    case 'review_pending':
    case 'review_received':
    case 'trip_rated':
      return { icon: 'Star', bg: COLORS.successLight, fg: COLORS.success }
    case 'message':
      return { icon: 'User', bg: COLORS.primaryTint, fg: COLORS.primary }
    case 'booking':
      return { icon: 'Ticket', bg: COLORS.primaryTint, fg: COLORS.primary }
    case 'trip_update':
    case 'driver_arrived':
    case 'trip_started':
    case 'trip_confirmed':
      return { icon: 'Navigation', bg: COLORS.primaryTint, fg: COLORS.primary }
    default:
      return { icon: 'Bell', bg: COLORS.primaryTint, fg: COLORS.primary }
  }
}

const ctaOf = (notification: NotificationWithSender): string | null => {
  if (notification.type === 'trip_confirm') return 'Confirmar'
  if (notification.type === 'review_pending') return 'Calificar'
  if (notification.type === 'trip_published') {
    return notification.data?.request_id ? 'Ver solicitud' : 'Ver ruta'
  }
  return null
}

const timestampOf = (iso: string): Date => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`)

export default function NotificationsScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const currentUser = useAppStore((s) => s.user)
  const isDriver = isDriverRole(currentUser)
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    deleteAllNotifications,
    fetchNotifications,
  } = useNotificationCenter()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<FilterId>('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailNotif, setDetailNotif] = useState<NotificationWithSender | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<{
    bookingId: string
    driverId: string
    driverName: string
    notifId: string
  } | null>(null)

  const filters = isDriver ? DRIVER_FILTERS : PASSENGER_FILTERS
  const activeFilter = filters.find((f) => f.id === selectedCategory) ?? filters[0]

  useEffect(() => {
    setReplyText('')
    setReplySending(false)
    setReplySent(false)
  }, [detailNotif?.id])

  const handleReply = async () => {
    if (!replyText.trim() || replySending || !detailNotif || !currentUser?.id) return
    const tripId = detailNotif.data?.trip_id as string | undefined
    const senderId = detailNotif.data?.sender_id as string | undefined
    if (!tripId || !senderId) return

    setReplySending(true)
    try {
      await sendTripMessage(tripId, currentUser.id, senderId, replyText.trim())
      insertNotificationForUser(senderId, {
        user_id: senderId,
        type: 'message' as const,
        title: `Mensaje de ${currentUser.name || 'Usuario'}`,
        message: replyText.trim(),
        is_read: false,
        data: { sender_id: currentUser.id, sender_name: currentUser.name, trip_id: tripId },
      }).catch(() => {})
      setReplyText('')
      setReplySent(true)
      setTimeout(() => setDetailNotif(null), 800)
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.')
    } finally {
      setReplySending(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  const getNotificationWithSender = (notif: Notification): NotificationWithSender => {
    let senderName = 'Sistema'

    if (notif.data?.sender_id && typeof notif.data.sender_id === 'string') {
      senderName = notif.data.sender_name || 'Usuario'
    } else if (notif.data?.from_user_name) {
      senderName = notif.data.from_user_name
    }

    return { ...notif, senderName }
  }

  const sections = useMemo(() => {
    const withSender = notifications
      .filter((n) => !activeFilter.types || activeFilter.types.includes(n.type))
      .map(getNotificationWithSender)
    return DAY_GROUPS
      .map((title) => ({ title, data: withSender.filter((n) => dayGroupOf(n.created_at) === title) }))
      .filter((section) => section.data.length > 0)
  }, [notifications, activeFilter])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const exitSelection = () => {
    setSelectionMode(false)
    setSelectedIds([])
  }

  const deleteSelected = async () => {
    if (!selectedIds.length) return
    Alert.alert(
      'Eliminar alertas',
      `¿Eliminar ${selectedIds.length} alerta${selectedIds.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteNotifications(selectedIds)
            exitSelection()
          },
        },
      ]
    )
  }

  const deleteAll = () => {
    Alert.alert(
      'Eliminar todas',
      '¿Seguro que deseas eliminar todas las alertas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todas',
          style: 'destructive',
          onPress: async () => {
            await deleteAllNotifications()
            exitSelection()
          },
        },
      ]
    )
  }

  const handlePress = (item: NotificationWithSender) => {
    if (selectionMode) { toggleSelect(item.id); return }
    if (!item.is_read) markAsRead(item.id)

    const route = getNotificationRoute(item, currentUser?.role)
    if (route?.screenName) {
      if (route.screenName === 'Main') {
        ;(navigation as any).navigate('Main', route.params)
      } else {
        ;(navigation as any).navigate(route.screenName, route.params)
      }
      return
    }

    setDetailNotif(item)
  }

  const renderNotification = (item: NotificationWithSender) => {
    const tile = tileOf(item.type)
    const cta = ctaOf(item)
    const isUnread = !item.is_read
    const isSelected = selectedIds.includes(item.id)

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread, isSelected && styles.cardSelected]}
        onPress={() => handlePress(item)}
        onLongPress={() => { if (!selectionMode) setSelectionMode(true); toggleSelect(item.id) }}
        activeOpacity={0.9}
      >
        {selectionMode && (
          <Icon
            name={isSelected ? 'CircleCheck' : 'Circle'}
            size={20}
            color={isSelected ? COLORS.primary : COLORS.textTertiary}
          />
        )}

        <View style={[styles.tile, { backgroundColor: tile.bg }]}>
          <Icon name={tile.icon} size={20} color={tile.fg} />
        </View>

        <View style={styles.body}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Alerta'}</Text>
          <Text style={styles.cardMessage} numberOfLines={3}>
            {item.type === 'message' && item.senderName ? `${item.senderName}: ${item.message}` : item.message}
          </Text>
          {cta && (
            <Text style={styles.ctaLink}>{cta} ›</Text>
          )}
        </View>

        <View style={styles.side}>
          <Text style={styles.timeText}>{timeLabelOf(item.created_at)}</Text>
          {isUnread && <View style={styles.unreadDot} />}
          {!selectionMode && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                Alert.alert('Eliminar', '¿Eliminar esta alerta?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteNotifications([item.id]) } },
                ])
              }}
            >
              <Icon name="Trash2" size={15} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderHeaderActions = () => {
    if (!selectionMode) {
      return (
        <View style={styles.headerRight}>
          {!!unreadCount && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={markAllAsRead}>
              <Icon name="CheckCheck" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={deleteAll}>
            <Icon name="Trash2" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSelectionMode(true)}>
            <Icon name="SquareCheck" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={deleteSelected} disabled={!selectedIds.length}>
          <Icon
            name="Trash2"
            size={16}
            color={selectedIds.length ? COLORS.error : COLORS.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={deleteAll}>
          <Icon name="Trash2" size={16} color={COLORS.error} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={exitSelection}>
          <Icon name="X" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    )
  }

  const renderFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      {filters.map((cat) => {
        const isActive = activeFilter.id === cat.id
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Illustration name="myNotifications" width={180} />
      <Text style={styles.emptySubtitle}>
        {activeFilter.id === 'all' ? 'No hay más notificaciones' : 'No hay alertas en esta categoría'}
      </Text>
    </View>
  )

  const ListFooter = () => (
    <View style={styles.footer}>
      {isDriver && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Las alertas de pago se activarán cuando exista la confirmación de pagos recibidos.
          </Text>
        </View>
      )}
    </View>
  )

  const _dStyle            = detailNotif ? tileOf(detailNotif.type) : null
  const _dIsBooking        = detailNotif ? TRIP_ACTION_TYPES.includes(detailNotif.type) : false
  const _dIsChat           = detailNotif?.type === 'message'
  const _dIsTripCompleted  = detailNotif?.type === 'trip_completed'
  const _dIsReviewPending  = detailNotif?.type === 'review_pending'
  const _dOrigin           = detailNotif?.data?.origin         as string | undefined
  const _dDest             = detailNotif?.data?.destination    as string | undefined
  const _dSeats            = detailNotif?.data?.seat_numbers   as number[] | undefined
  const _dDriver           = detailNotif?.data?.driver_name    as string | undefined
  const _dDriverId         = detailNotif?.data?.driver_id      as string | undefined
  const _dPassenger        = detailNotif?.data?.passenger_name as string | undefined
  const _dPrice            = detailNotif?.data?.price          as number | undefined
  const _dTripDate         = detailNotif?.data?.trip_date      as string | undefined
  const _dBookingId        = detailNotif?.data?.booking_id     as string | undefined
  const _dFmtDate          = _dTripDate
    ? new Date(_dTripDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null

  const headerCanGoBack = navigation.canGoBack()
  const onHeaderLeftPress = () => {
    if (headerCanGoBack) navigation.goBack()
    else (navigation as any).navigate('Main', { screen: 'Home' })
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onHeaderLeftPress}
            accessibilityRole="button"
            accessibilityLabel={headerCanGoBack ? 'Volver' : 'Ir al inicio'}
          >
            <Icon
              name={headerCanGoBack ? 'ChevronLeft' : 'House'}
              size={18}
              color={COLORS.primary}
            />
          </TouchableOpacity>
          {renderHeaderActions()}
        </View>
        <Text style={styles.title}>Alertas</Text>
      </View>

      {renderFilters()}

      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedIds.length} seleccionada{selectedIds.length === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      ) : sections.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderNotification(item)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          ListFooterComponent={<ListFooter />}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!detailNotif}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailNotif(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailNotif(null)}>
          <KeyboardAvoidingScreen fill={false} style={{ width: '100%' }}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.lg }]} onPress={() => {}}>
            <View style={styles.modalHandle} />

            {detailNotif && _dStyle && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { backgroundColor: _dStyle.bg }]}>
                    <Icon name={_dStyle.icon} size={22} color={_dStyle.fg} />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{detailNotif.title || 'Alerta'}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailNotif(null)}>
                    <Icon name="X" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <Text style={styles.modalMessage}>
                    {_dIsChat && detailNotif.senderName
                      ? <><Text style={styles.modalSenderName}>{detailNotif.senderName}: </Text>{detailNotif.message}</>
                      : detailNotif.message}
                  </Text>

                  {(_dIsBooking || _dIsChat) && (_dOrigin || _dDest || _dSeats || _dDriver || _dPassenger || _dPrice !== undefined || _dFmtDate) && (
                    <View style={styles.modalInfoCard}>
                      {_dPassenger && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="User" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Pasajero</Text>
                          <Text style={styles.modalInfoValue}>{_dPassenger}</Text>
                        </View>
                      )}
                      {_dDriver && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="Car" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Conductor</Text>
                          <Text style={styles.modalInfoValue}>{_dDriver}</Text>
                        </View>
                      )}
                      {_dOrigin && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="CircleDot" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Origen</Text>
                          <Text style={styles.modalInfoValue}>{_dOrigin}</Text>
                        </View>
                      )}
                      {_dDest && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="MapPin" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Destino</Text>
                          <Text style={styles.modalInfoValue}>{_dDest}</Text>
                        </View>
                      )}
                      {_dSeats && _dSeats.length > 0 && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="LayoutGrid" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Asiento{_dSeats.length > 1 ? 's' : ''}</Text>
                          <Text style={styles.modalInfoValue}>{_dSeats.join(', ')}</Text>
                        </View>
                      )}
                      {_dPrice !== undefined && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="Banknote" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Valor</Text>
                          <Text style={styles.modalInfoValue}>${_dPrice.toLocaleString('es-CO')}</Text>
                        </View>
                      )}
                      {_dFmtDate && (
                        <View style={styles.modalInfoRow}>
                          <Icon name="Calendar" size={15} color={COLORS.primary} />
                          <Text style={styles.modalInfoLabel}>Fecha</Text>
                          <Text style={styles.modalInfoValue}>{_dFmtDate}</Text>
                        </View>
                      )}
                    </View>
                  )}


                  {(_dIsTripCompleted || _dIsReviewPending) && _dBookingId && _dDriverId && (
                    <>
                      <TouchableOpacity
                        style={styles.rateDriverBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          setRatingTarget({
                            bookingId: _dBookingId!,
                            driverId: _dDriverId!,
                            driverName: _dDriver || 'Conductor',
                            notifId: detailNotif.id,
                          })
                          setDetailNotif(null)
                        }}
                      >
                        <Icon name="Star" size={16} color={COLORS.white} />
                        <Text style={styles.rateDriverBtnText}>
                          {_dIsReviewPending ? 'Calificar ahora' : 'Calificar conductor'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={{ height: 24 }} />
                </ScrollView>
                {detailNotif.type === 'booking' && (
                  <TouchableOpacity
                    style={styles.rateDriverBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setDetailNotif(null)
                      ;(navigation as any).navigate('ActiveTrips')
                    }}
                  >
                    <Icon name="Car" size={16} color={COLORS.white} />
                    <Text style={styles.rateDriverBtnText}>Ver mi viaje</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {detailNotif && _dIsChat && (
              <View style={styles.replyBar}>
                {replySent ? (
                  <View style={styles.replySentRow}>
                    <Icon name="CircleCheck" size={18} color={COLORS.success} />
                    <Text style={styles.replySentText}>Mensaje enviado</Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.replyInput}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder={`Responder a ${detailNotif.senderName ?? 'Usuario'}…`}
                      placeholderTextColor={COLORS.textTertiary}
                      multiline
                      maxLength={500}
                      editable={!replySending}
                    />
                    <TouchableOpacity
                      style={[styles.replySendBtn, (!replyText.trim() || replySending) && styles.replySendBtnDisabled]}
                      onPress={handleReply}
                      disabled={!replyText.trim() || replySending}
                      activeOpacity={0.8}
                    >
                      {replySending
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Icon name="Send" size={16} color={COLORS.white} />
                      }
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
          </KeyboardAvoidingScreen>
        </TouchableOpacity>
      </Modal>

      {ratingTarget && (
        <RatingModal
          visible={!!ratingTarget}
          userName={ratingTarget.driverName}
          isDriver
          onClose={() => setRatingTarget(null)}
          onSubmit={async (rating, comment, recommend) => {
            if (!currentUser?.id) throw new Error('Usuario no autenticado')
            const saved = await createReview(ratingTarget.bookingId, rating, comment, recommend)
            if (!saved) throw new Error('No se pudo guardar la calificación')
            await deleteNotifications([ratingTarget.notifId])
            setRatingTarget(null)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryTint,
  },
  filterScroll: {
    flexGrow: 0,
    height: 56,
    marginTop: SPACING.md,
  },
  filterContainer: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.labelMedium,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  filterTextActive: {
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.white,
  },
  selectionBar: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: 120,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  cardUnread: {
    backgroundColor: COLORS.surfaceAlt,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTint,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  cardTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.textPrimary,
  },
  cardMessage: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  ctaLink: {
    ...TYPOGRAPHY.labelMedium,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  side: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingTop: SPACING.lg,
  },
  noteBox: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  noteText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `${COLORS.textPrimary}73`,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    maxHeight: '90%',
    ...SHADOWS.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderText: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginBottom: SPACING.md,
  },
  modalSenderName: {
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
  modalInfoCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.md,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalIdRow: {
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryTint,
    paddingTop: SPACING.sm,
  },
  modalIdText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  modalInfoLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    width: 68,
  },
  modalInfoValue: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.medium,
    flex: 1,
  },
  rateDriverBtn: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  rateDriverBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.white,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryTint,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  replyInput: {
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryTint,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
  },
  replySendBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replySendBtnDisabled: {
    backgroundColor: COLORS.primaryTint,
  },
  replySentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  replySentText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.success,
  },
})
