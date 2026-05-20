import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert, StatusBar, Modal, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useNotificationCenter } from '../context/NotificationsContext'
import { Notification } from '../hooks/useNotifications'
import { useAppStore } from '../store/useAppStore'
import RatingModal from '../components/RatingModal'
import { createReview } from '../services/reviews'

type NotificationCategory = 'all' | 'chat' | 'ruta' | 'feed'

interface NotificationWithSender extends Notification {
  senderName?: string
}

export default function NotificationsScreen() {
  const navigation = useNavigation()
  const currentUser = useAppStore((s) => s.user)
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
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailNotif, setDetailNotif] = useState<NotificationWithSender | null>(null)
  const [ratingTarget, setRatingTarget] = useState<{
    bookingId: string
    driverId: string
    driverName: string
    notifId: string
  } | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  // Obtener nombre del remitente basado en datos
  const getNotificationWithSender = (notif: Notification): NotificationWithSender => {
    let senderName = 'Sistema'

    // Si el mensaje tiene sender_id en data, es de otro usuario
    if (notif.data?.sender_id && typeof notif.data.sender_id === 'string') {
      senderName = notif.data.sender_name || 'Usuario'
    } else if (notif.data?.from_user_name) {
      senderName = notif.data.from_user_name
    }

    return { ...notif, senderName }
  }

  // Filtrar notificaciones por categoría
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'all') return notifications.map(getNotificationWithSender)

    return notifications
      .filter((notif) => {
        if (selectedCategory === 'chat') return notif.type === 'message'
        if (selectedCategory === 'ruta')
          return ['trip_update', 'driver_arrived', 'trip_completed', 'booking'].includes(notif.type)
        if (selectedCategory === 'feed') return notif.type === 'review_pending'
        return true
      })
      .map(getNotificationWithSender)
  }, [notifications, selectedCategory])

  const getCategoryStyle = (type: Notification['type'], senderName?: string) => {
    const initials = (senderName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('')

    const styles: Record<
      string,
      { color: string; bgColor: string; icon: string; category: string; initials?: string }
    > = {
      message: { color: '#0B53C1', bgColor: '#E6F0FF', icon: 'chatbubble', category: 'Chat', initials },
      trip_update: {
        color: '#2E5FBF',
        bgColor: '#E9F0FF',
        icon: 'navigate-outline',
        category: 'Nueva ruta',
      },
      driver_arrived: { color: '#2E5FBF', bgColor: '#E9F0FF', icon: 'pin', category: 'Ruta' },
      trip_completed: { color: '#2E5FBF', bgColor: '#E9F0FF', icon: 'checkmark-circle', category: 'Ruta' },
      booking: { color: '#2E5FBF', bgColor: '#E9F0FF', icon: 'bus', category: 'Reserva' },
      review_pending: { color: '#A88700', bgColor: '#F3E8A0', icon: 'star-outline', category: 'Feedback' },
    }
    return styles[type] || styles['message']
  }

  // Formato de fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 2) return 'ayer'
    return `hace ${diffDays}d`
  }

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

  const NotificationCard = ({ item }: { item: NotificationWithSender }) => {
    const style = getCategoryStyle(item.type, item.senderName)
    const isUnread = !item.is_read
    const isSelected = selectedIds.includes(item.id)
    const isChat = item.type === 'message'
    const isBooking = ['booking', 'trip_update', 'driver_arrived', 'trip_completed'].includes(item.type)

    const handlePress = () => {
      if (selectionMode) { toggleSelect(item.id); return }
      if (isUnread) markAsRead(item.id)
      setDetailNotif(item)
    }

    const origin      = item.data?.origin      as string | undefined
    const destination = item.data?.destination as string | undefined
    const seatNumbers = item.data?.seat_numbers as number[] | undefined
    const driverName  = item.data?.driver_name  as string | undefined

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread, isSelected && styles.cardSelected]}
        onPress={handlePress}
        onLongPress={() => { if (!selectionMode) setSelectionMode(true); toggleSelect(item.id) }}
        activeOpacity={0.92}
      >
        {/* Unread dot */}
        {isUnread && <View style={styles.unreadDot} />}

        {/* Selection checkbox */}
        {selectionMode && (
          <View style={styles.selectIndicator}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={isSelected ? '#1230B8' : COLORS.textTertiary}
            />
          </View>
        )}

        <View style={styles.cardRow}>
          {/* Icon */}
          {isBooking ? (
            <LinearGradient
              colors={['#0E2699', '#1230B8', '#1A3FCC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Ionicons name={style.icon as any} size={18} color="#fff" />
            </LinearGradient>
          ) : isChat ? (
            <LinearGradient
              colors={['#1535BE', '#1230B8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Text style={styles.avatarText}>{style.initials || 'U'}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: style.bgColor }]}>
              <Ionicons name={style.icon as any} size={18} color={style.color} />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.contentTop}>
              <View style={[styles.categoryPill, isBooking && styles.categoryPillBlue]}>
                <Text style={[styles.categoryText, isBooking && styles.categoryTextBlue]}>
                  {style.category.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
            </View>

            {isChat && item.senderName ? (
              <Text style={styles.messageText} numberOfLines={2}>
                <Text style={styles.senderName}>{item.senderName}: </Text>
                {item.message}
              </Text>
            ) : (
              <Text style={[styles.messageText, !isUnread && styles.messageTextRead]} numberOfLines={3}>
                {item.message}
              </Text>
            )}

            {/* Info de reserva si está disponible */}
            {isBooking && (origin || seatNumbers || driverName) && (
              <View style={styles.bookingInfo}>
                {origin && destination && (
                  <View style={styles.routeMiniRow}>
                    <Ionicons name="navigate-outline" size={11} color="#1230B8" />
                    <Text style={styles.routeMiniText} numberOfLines={1}>
                      {origin} → {destination}
                    </Text>
                  </View>
                )}
                {seatNumbers && seatNumbers.length > 0 && (
                  <View style={styles.routeMiniRow}>
                    <Ionicons name="person-outline" size={11} color="#1230B8" />
                    <Text style={styles.routeMiniText}>
                      Asiento{seatNumbers.length > 1 ? 's' : ''}: {seatNumbers.join(', ')}
                    </Text>
                  </View>
                )}
                {driverName && (
                  <View style={styles.routeMiniRow}>
                    <Ionicons name="car-outline" size={11} color="#1230B8" />
                    <Text style={styles.routeMiniText}>{driverName}</Text>
                  </View>
                )}
              </View>
            )}

            {item.type === 'review_pending' && (
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map((s) => (
                  <Ionicons key={s} name="star-outline" size={14} color="#D4AF37" />
                ))}
              </View>
            )}
          </View>
        </View>

        {!selectionMode && (
          <TouchableOpacity
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              Alert.alert('Eliminar', '¿Eliminar esta alerta?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteNotifications([item.id]) } },
              ])
            }}
          >
            <Ionicons name="trash-outline" size={15} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const HeaderActions = () => {
    if (!selectionMode) {
      return (
        <View style={styles.headerRight}>
          {!!unreadCount && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done-outline" size={20} color="#1230B8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={deleteAll}>
            <Ionicons name="trash-outline" size={20} color="#1230B8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSelectionMode(true)}>
            <Ionicons name="checkbox-outline" size={20} color="#1230B8" />
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={deleteSelected} disabled={!selectedIds.length}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={selectedIds.length ? COLORS.error : COLORS.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={deleteAll}>
          <Ionicons name="trash-bin-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={exitSelection}>
          <Ionicons name="close-outline" size={22} color="#1230B8" />
        </TouchableOpacity>
      </View>
    )
  }

  const CategoryFilter = () => {
    const categories: { id: NotificationCategory; label: string }[] = [
      { id: 'all', label: 'Todas' },
      { id: 'chat', label: 'Chat' },
      { id: 'ruta', label: 'Ruta' },
      { id: 'feed', label: 'Feed' },
    ]

    return (
      <View style={styles.filterContainer}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={styles.filterButtonWrap}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.filterButton}
                >
                  <Text style={[styles.filterText, styles.filterTextActive]}>{cat.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterButton}>
                  <Text style={styles.filterText}>{cat.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptySubtitle}>
        {selectedCategory === 'all' ? 'No hay más notificaciones' : 'No hay alertas en esta categoría'}
      </Text>
    </View>
  )

  const ListFooter = () => (
    <View style={styles.footerEmptyHint}>
      <Ionicons name="notifications-off-outline" size={32} color={COLORS.textTertiary} />
      <Text style={styles.footerEmptyText}>No hay más notificaciones</Text>
    </View>
  )

  // Variables para el modal de detalle (calculadas en el componente, no en un sub-componente)
  const _dStyle             = detailNotif ? getCategoryStyle(detailNotif.type, detailNotif.senderName) : null
  const _dIsBooking         = detailNotif ? ['booking', 'trip_update', 'driver_arrived', 'trip_completed'].includes(detailNotif.type) : false
  const _dIsChat            = detailNotif?.type === 'message'
  const _dIsTripCompleted   = detailNotif?.type === 'trip_completed'
  const _dOrigin            = detailNotif?.data?.origin        as string | undefined
  const _dDest              = detailNotif?.data?.destination   as string | undefined
  const _dSeats             = detailNotif?.data?.seat_numbers  as number[] | undefined
  const _dDriver            = detailNotif?.data?.driver_name   as string | undefined
  const _dDriverId          = detailNotif?.data?.driver_id     as string | undefined
  const _dPassenger         = detailNotif?.data?.passenger_name as string | undefined
  const _dPrice             = detailNotif?.data?.price         as number | undefined
  const _dTripDate          = detailNotif?.data?.trip_date     as string | undefined
  const _dBookingId         = detailNotif?.data?.booking_id    as string | undefined
  const _dFmtDate           = _dTripDate
    ? new Date(_dTripDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null

  /** Desde pestaña Alertas: ir al Inicio. Desde pantalla apilada (ej. Viajes→alertas): volver atrás. */
  const headerCanGoBack = navigation.canGoBack()
  const onHeaderLeftPress = () => {
    if (headerCanGoBack) navigation.goBack()
    else (navigation as any).navigate('Main', { screen: 'Home' })
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onHeaderLeftPress}
          accessibilityRole="button"
          accessibilityLabel={headerCanGoBack ? 'Volver' : 'Ir al inicio'}
        >
          <Ionicons
            name={headerCanGoBack ? 'chevron-back' : 'home-outline'}
            size={24}
            color="#1230B8"
          />
        </TouchableOpacity>

        <Text style={styles.title}>Alertas</Text>

        <HeaderActions />
      </View>

      <CategoryFilter />

      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedIds.length} seleccionada{selectedIds.length === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={36} color={COLORS.textTertiary} />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={(props) => <NotificationCard {...props} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          ListFooterComponent={<ListFooter />}
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
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />

            {detailNotif && _dStyle && (
              <>
                <View style={styles.modalHeader}>
                  {_dIsBooking ? (
                    <LinearGradient
                      colors={['#0E2699', '#1230B8', '#1A3FCC']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.modalIcon}
                    >
                      <Ionicons name={_dStyle.icon as any} size={22} color="#fff" />
                    </LinearGradient>
                  ) : _dIsChat ? (
                    <LinearGradient
                      colors={['#1535BE', '#1230B8']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.modalIcon}
                    >
                      <Text style={styles.modalAvatarText}>{_dStyle.initials || 'U'}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.modalIcon, { backgroundColor: _dStyle.bgColor }]}>
                      <Ionicons name={_dStyle.icon as any} size={22} color={_dStyle.color} />
                    </View>
                  )}
                  <View style={styles.modalHeaderText}>
                    <View style={[styles.categoryPill, _dIsBooking && styles.categoryPillBlue]}>
                      <Text style={[styles.categoryText, _dIsBooking && styles.categoryTextBlue]}>
                        {_dStyle.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalTime}>{formatDate(detailNotif.created_at)}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailNotif(null)}>
                    <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <Text style={styles.modalMessage}>
                    {_dIsChat && detailNotif.senderName
                      ? <><Text style={styles.modalSenderName}>{detailNotif.senderName}: </Text>{detailNotif.message}</>
                      : detailNotif.message}
                  </Text>

                  {(_dIsBooking || _dIsChat) && (_dOrigin || _dDest || _dSeats || _dDriver || _dPassenger || _dPrice !== undefined || _dFmtDate) && (
                    <LinearGradient
                      colors={['#F8F9FF', '#EEF2FF', '#E4EBFF']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.modalInfoCard}
                    >
                      {_dPassenger && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="person-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Pasajero</Text>
                          <Text style={styles.modalInfoValue}>{_dPassenger}</Text>
                        </View>
                      )}
                      {_dDriver && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="car-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Conductor</Text>
                          <Text style={styles.modalInfoValue}>{_dDriver}</Text>
                        </View>
                      )}
                      {_dOrigin && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="radio-button-on-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Origen</Text>
                          <Text style={styles.modalInfoValue}>{_dOrigin}</Text>
                        </View>
                      )}
                      {_dDest && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="location-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Destino</Text>
                          <Text style={styles.modalInfoValue}>{_dDest}</Text>
                        </View>
                      )}
                      {_dSeats && _dSeats.length > 0 && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="grid-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Asiento{_dSeats.length > 1 ? 's' : ''}</Text>
                          <Text style={styles.modalInfoValue}>{_dSeats.join(', ')}</Text>
                        </View>
                      )}
                      {_dPrice !== undefined && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="cash-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Valor</Text>
                          <Text style={styles.modalInfoValue}>${_dPrice.toLocaleString('es-CO')}</Text>
                        </View>
                      )}
                      {_dFmtDate && (
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="calendar-outline" size={15} color="#1230B8" />
                          <Text style={styles.modalInfoLabel}>Fecha</Text>
                          <Text style={styles.modalInfoValue}>{_dFmtDate}</Text>
                        </View>
                      )}
                      {_dBookingId && (
                        <View style={[styles.modalInfoRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#D6E0FF', paddingTop: 8 }]}>
                          <Ionicons name="receipt-outline" size={13} color={COLORS.textTertiary} />
                          <Text style={[styles.modalInfoLabel, { color: COLORS.textTertiary, fontSize: 10 }]}>ID reserva</Text>
                          <Text style={[styles.modalInfoValue, { color: COLORS.textTertiary, fontSize: 10 }]}>{_dBookingId}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  )}

                  {detailNotif.type === 'review_pending' && (
                    <View style={styles.starsRow}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons key={s} name="star-outline" size={20} color="#D4AF37" />
                      ))}
                    </View>
                  )}

                  {_dIsTripCompleted && _dBookingId && _dDriverId && (
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
                      <LinearGradient
                        colors={['#0E2699', '#1230B8', '#1A3FCC']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.rateDriverBtnInner}
                      >
                        <Ionicons name="star" size={16} color="#FBBF24" />
                        <Text style={styles.rateDriverBtnText}>Calificar conductor</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <View style={{ height: 24 }} />
                </ScrollView>
              </>
            )}
          </TouchableOpacity>
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
            await createReview(
              ratingTarget.bookingId,
              currentUser.id,
              ratingTarget.driverId,
              rating,
              comment,
              recommend
            )
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
    backgroundColor: '#F4F6FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F4F6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E0FF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#D6E0FF',
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: '#0E2699',
    fontWeight: '800',
  },
  // Filter chips
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterButtonWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  filterButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {},
  filterText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  // Selection bar
  selectionBar: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#D6E0FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectionText: {
    ...TYPOGRAPHY.bodySmall,
    color: '#0E2699',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.sm,
  },
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9EBF2',
    ...SHADOWS.xs,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: '#F4F6FF',
    borderColor: '#D6E0FF',
  },
  cardSelected: {
    borderColor: '#1230B8',
    backgroundColor: '#EEF2FF',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1230B8',
    zIndex: 2,
  },
  selectIndicator: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 3,
  },
  cardRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  contentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: '#F0F0F5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryPillBlue: {
    backgroundColor: '#E4EBFF',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  categoryTextBlue: {
    color: '#1230B8',
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  messageTextRead: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  senderName: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bookingInfo: {
    marginTop: 6,
    gap: 3,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#D6E0FF',
  },
  routeMiniRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  routeMiniText: {
    fontSize: 11,
    color: '#1230B8',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 6,
  },
  // States
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
  footerEmptyHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 8,
  },
  footerEmptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,18,60,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    maxHeight: '82%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6E0FF',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalHeaderText: {
    flex: 1,
    gap: 4,
  },
  modalTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  modalSenderName: {
    fontWeight: '700',
    color: '#0E2699',
  },
  modalInfoCard: {
    borderRadius: 14,
    padding: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D6E0FF',
    marginBottom: SPACING.md,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    width: 68,
  },
  modalInfoValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  rateDriverBtn: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  rateDriverBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
  },
  rateDriverBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
