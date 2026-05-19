import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { useActiveBookingsWithChat, ActiveBookingChat } from '../hooks/useActiveBookingsWithChat'
import { getTripUnreadCountFrom, subscribeTripMessages } from '../services/trip_messages'

const HIDDEN_CHATS_KEY = 'hidden_active_chats'

export default function ActiveChatsScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { bookings, loading, refetch } = useActiveBookingsWithChat(user?.id)

  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set())
  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [selectedChat, setSelectedChat] = useState<ActiveBookingChat | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const channelsRef = useRef<Record<string, () => void>>({})

  // Cargar chats ocultados
  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_CHATS_KEY).then((raw) => {
      if (raw) setHiddenChatIds(new Set(JSON.parse(raw)))
    })
  }, [])

  useFocusEffect(useCallback(() => {
    refetch()
  }, [refetch]))

  // Suscribir a no leídos por cada chat activo
  useEffect(() => {
    if (!user || !bookings.length) return

    bookings.forEach((b) => {
      getTripUnreadCountFrom(b.routeId, user.id, b.driverId)
        .then((count) => setUnreadCounts((prev) => ({ ...prev, [b.routeId]: count })))
        .catch(() => {})

      if (!channelsRef.current[b.routeId]) {
        const unsub = subscribeTripMessages(b.routeId, user!.id, b.driverId, () => {
          getTripUnreadCountFrom(b.routeId, user!.id, b.driverId)
            .then((count) => setUnreadCounts((prev) => ({ ...prev, [b.routeId]: count })))
            .catch(() => {})
        })
        channelsRef.current[b.routeId] = unsub
      }
    })

    return () => {
      Object.values(channelsRef.current).forEach((fn) => fn())
      channelsRef.current = {}
    }
  }, [bookings, user?.id])

  const saveHidden = async (ids: Set<string>) => {
    await AsyncStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify([...ids]))
  }

  const hideChat = (bookingId: string) => {
    Alert.alert(
      'Eliminar chat',
      '¿Quieres eliminar este chat? Solo se ocultará para ti.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const next = new Set(hiddenChatIds)
            next.add(bookingId)
            setHiddenChatIds(next)
            saveHidden(next)
          },
        },
      ]
    )
  }

  const visibleChats = bookings.filter((b) => !hiddenChatIds.has(b.bookingId))

  const openChat = (chat: ActiveBookingChat) => {
    setSelectedChat(chat)
    setChatModalVisible(true)
  }

  const onCloseChat = () => {
    setChatModalVisible(false)
    if (!selectedChat || !user) return
    getTripUnreadCountFrom(selectedChat.routeId, user.id, selectedChat.driverId)
      .then((count) => setUnreadCounts((prev) => ({ ...prev, [selectedChat.routeId]: count })))
      .catch(() => {})
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Mis Chats</Text>
          <Text style={styles.subtitle}>Solo durante el viaje activo</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : visibleChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin chats activos</Text>
            <Text style={styles.emptyText}>
              Los chats aparecen automáticamente cuando tienes una reserva activa y desaparecen al finalizar el viaje.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleChats.map((chat) => {
              const unread = unreadCounts[chat.routeId] ?? 0
              return (
                <TouchableOpacity
                  key={chat.bookingId}
                  style={styles.chatItem}
                  onPress={() => openChat(chat)}
                  activeOpacity={0.75}
                >
                  {/* Avatar conductor */}
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {chat.driverName.charAt(0).toUpperCase()}
                    </Text>
                    {chat.routeStatus === 'in_progress' && (
                      <View style={styles.activeDot} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.chatInfo}>
                    <Text style={styles.driverName} numberOfLines={1}>{chat.driverName}</Text>
                    <Text style={styles.routeText} numberOfLines={1}>
                      {chat.origin} → {chat.destination}
                    </Text>
                  </View>

                  {/* Derecha: fecha + badge */}
                  <View style={styles.chatRight}>
                    <Text style={styles.chatDate}>{formatDate(chat.departureTime)}</Text>
                    <Text style={styles.chatTime}>{formatTime(chat.departureTime)}</Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                      </View>
                    )}
                  </View>

                  {/* Eliminar */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => hideChat(chat.bookingId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {selectedChat && user && (
        <TripMessagesModal
          visible={chatModalVisible}
          tripId={selectedChat.routeId}
          userId={user.id}
          otherUserId={selectedChat.driverId}
          otherUserName={selectedChat.driverName}
          onClose={onCloseChat}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: { flex: 1 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginTop: 2 },

  centered: { paddingVertical: 80, alignItems: 'center' },

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
    marginBottom: SPACING.sm,
  },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  list: { paddingTop: SPACING.sm },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  avatar: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  activeDot: {
    position: 'absolute',
    bottom: 1, right: 1,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  routeText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  chatRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  chatDate: { fontSize: 11, color: COLORS.textTertiary },
  chatTime: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20, height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  deleteBtn: {
    width: 32, height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '12',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
})
