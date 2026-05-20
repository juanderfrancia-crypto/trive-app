import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useNotificationCenter } from '../context/NotificationsContext'
import { Notification } from '../hooks/useNotifications'

type NotificationCategory = 'all' | 'chat' | 'ruta' | 'feed'

interface NotificationWithSender extends Notification {
  senderName?: string
}

export default function NotificationsScreen() {
  const navigation = useNavigation()
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

    const handlePress = () => {
      if (selectionMode) {
        toggleSelect(item.id)
        return
      }
      if (isUnread) markAsRead(item.id)

      const audience = item.data?.audience
      const isDriverNotif = audience === 'drivers_only'
      const isPassengerNotif = audience === 'passengers_only'

      switch (item.type) {
        case 'booking':
        case 'trip_update':
          if (isDriverNotif) {
            navigation.navigate('DriverPanel' as never)
          } else if (isPassengerNotif) {
            navigation.navigate('Main' as never, { screen: 'Search' } as never)
          }
          break
        case 'review_pending':
          navigation.navigate('Profile' as never)
          break
        default:
          break
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.notificationCardUnread,
          isSelected && styles.notificationCardSelected,
        ]}
        onPress={handlePress}
        onLongPress={() => {
          if (!selectionMode) setSelectionMode(true)
          toggleSelect(item.id)
        }}
        activeOpacity={0.8}
      >
        {isUnread && <View style={styles.leftUnreadBar} />}
        {selectionMode && (
          <View style={styles.selectIndicator}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={isSelected ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={[styles.iconContainer, { backgroundColor: style.bgColor }]}>
            {isChat ? (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{style.initials || 'U'}</Text>
              </View>
            ) : (
              <Ionicons name={style.icon as any} size={20} color={style.color} />
            )}
          </View>

          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.categoryBadge, !isUnread && styles.categoryBadgeRead]}>
                {style.category.toUpperCase()}
              </Text>
              <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
            </View>

            {item.type === 'message' && item.senderName ? (
              <Text style={styles.messageBlock}>
                <Text style={[styles.senderName, !isUnread && styles.senderNameRead]}>{item.senderName}: </Text>
                <Text style={[styles.messageBody, isUnread ? styles.messageBodyUnread : styles.messageBodyRead]}>
                  {item.message}
                </Text>
              </Text>
            ) : (
              <Text style={[styles.messageBody, isUnread ? styles.messageBodyUnread : styles.messageBodyRead]}>
                {item.message}
              </Text>
            )}

            {item.type === 'review_pending' && (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= 4 ? 'star-outline' : 'star-outline'}
                    size={16}
                    color={star <= 4 ? '#D4AF37' : '#D1D5DB'}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {!selectionMode && (
          <TouchableOpacity
            style={styles.inlineDelete}
            onPress={() => {
              Alert.alert('Eliminar', '¿Eliminar esta alerta?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteNotifications([item.id])
                  },
                },
              ])
            }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
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
              <Ionicons name="checkmark-done-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={deleteAll}>
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSelectionMode(true)}>
            <Ionicons name="checkbox-outline" size={20} color={COLORS.primary} />
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
          <Ionicons name="close-outline" size={22} color={COLORS.textSecondary} />
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
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterButton,
              selectedCategory === cat.id && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat.id && styles.filterTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            color={COLORS.primary}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F8F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EBF2',
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
    backgroundColor: '#FFFFFF',
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: '800',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOWS.xs,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  selectionBar: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: 10,
    backgroundColor: '#E7EEFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.sm,
  },
  notificationCard: {
    backgroundColor: '#F9F9FA',
    borderRadius: 18,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: '#ECEDEF',
    ...SHADOWS.xs,
    position: 'relative',
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF4FF',
  },
  leftUnreadBar: {
    position: 'absolute',
    left: -1,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  selectIndicator: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 3,
  },
  cardBody: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: 20,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 14,
  },
  categoryBadgeRead: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  messageBlock: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  messageBodyUnread: {
    fontWeight: '700',
  },
  messageBodyRead: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  senderName: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  senderNameRead: {
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  inlineDelete: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    padding: 8,
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
})
