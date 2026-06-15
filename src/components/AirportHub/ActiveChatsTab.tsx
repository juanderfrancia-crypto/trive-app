import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { NegotiationChatModal } from '../NegotiationChatModal'
import { supabase } from '../../services/supabase'
import type { HubTabProps } from './types'

interface ChatPreview {
  requestId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string
  origin: string
  destination: string
  price: number
  unreadCount: number
  lastMessage?: string
}

export default function ActiveChatsTab({ isDriver }: HubTabProps) {
  const user = useAppStore((s) => s.user)
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
  const [chatModalVisible, setChatModalVisible] = useState(false)

  const loadChats = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const chatsList: ChatPreview[] = []

      if (isDriver) {
        const { data: driverTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, passenger_id, origin, destination, offered_price,
             profiles!passenger_id (id, name, avatar_url)`
          )
          .eq('driver_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('created_at', { ascending: false })

        for (const trip of driverTrips ?? []) {
          const p = trip.profiles as any
          chatsList.push({
            requestId: trip.id,
            otherUserId: trip.passenger_id,
            otherUserName: p?.name || 'Pasajero',
            otherUserAvatar: p?.avatar_url,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            unreadCount: 0,
          })
        }
      } else {
        const { data: passengerTrips } = await supabase
          .from('airport_requests')
          .select(
            `id, driver_id, origin, destination, offered_price,
             profiles!driver_id (id, name, avatar_url)`
          )
          .eq('passenger_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('created_at', { ascending: false })

        for (const trip of passengerTrips ?? []) {
          if (!trip.driver_id) continue
          const d = trip.profiles as any
          chatsList.push({
            requestId: trip.id,
            otherUserId: trip.driver_id,
            otherUserName: d?.name || 'Conductor',
            otherUserAvatar: d?.avatar_url,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            unreadCount: 0,
          })
        }
      }

      // Una sola query para mensajes no leídos de todos los chats
      const requestIds = chatsList.map((c) => c.requestId)
      if (requestIds.length > 0) {
        const { data: unreadMessages } = await supabase
          .from('negotiation_messages')
          .select('request_id, message_text, created_at, is_read')
          .in('request_id', requestIds)
          .neq('sent_by_user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })

        const lastByRequest = new Map<string, { text: string; count: number }>()
        for (const msg of unreadMessages ?? []) {
          const prev = lastByRequest.get(msg.request_id)
          if (!prev) {
            lastByRequest.set(msg.request_id, { text: msg.message_text, count: 1 })
          } else {
            prev.count += 1
          }
        }

        for (const chat of chatsList) {
          const info = lastByRequest.get(chat.requestId)
          if (info) {
            chat.unreadCount = info.count
            chat.lastMessage = info.text
          }
        }

        // Último mensaje (leído o no) si no hay no leídos
        const { data: latestMessages } = await supabase
          .from('negotiation_messages')
          .select('request_id, message_text, created_at')
          .in('request_id', requestIds)
          .order('created_at', { ascending: false })

        const latestMap = new Map<string, string>()
        for (const msg of latestMessages ?? []) {
          if (!latestMap.has(msg.request_id)) {
            latestMap.set(msg.request_id, msg.message_text)
          }
        }
        for (const chat of chatsList) {
          if (!chat.lastMessage && latestMap.has(chat.requestId)) {
            chat.lastMessage = latestMap.get(chat.requestId)
          }
        }
      }

      setChats(chatsList)
    } catch (err) {
      console.error('❌ Error loading chats:', err)
      Alert.alert('Error', 'No se pudieron cargar los chats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, isDriver, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadChats()
    }, [loadChats])
  )

  const renderChatItem = ({ item: chat }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => {
        setSelectedChat(chat)
        setChatModalVisible(true)
      }}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {chat.otherUserAvatar ? (
          <Image source={{ uri: chat.otherUserAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={COLORS.surface} />
          </View>
        )}
        {chat.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatContent}>
        <Text style={styles.chatName} numberOfLines={1}>
          {chat.otherUserName}
        </Text>
        <Text style={styles.chatRoute} numberOfLines={1}>
          {chat.origin} → {chat.destination}
        </Text>
        {chat.lastMessage && (
          <Text style={styles.chatLastMessage} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
        )}
        <Text style={styles.chatPrice}>${chat.price.toLocaleString('es-CO')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        {isDriver
          ? 'Chatea con tus pasajeros cuando confirmes un viaje'
          : 'Chatea con tu conductor cuando confirmes un viaje'}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading && chats.length === 0 ? (
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.requestId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadChats()
          }}
          scrollEnabled={chats.length > 0}
        />
      )}

      {selectedChat && (
        <NegotiationChatModal
          visible={chatModalVisible}
          onClose={() => {
            setChatModalVisible(false)
            setSelectedChat(null)
            loadChats()
          }}
          requestId={selectedChat.requestId}
          driverName={selectedChat.otherUserName}
          otherUserId={selectedChat.otherUserId}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: RADIUS.lg },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chatContent: { flex: 1 },
  chatName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  chatRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  chatLastMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  chatPrice: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
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
})
