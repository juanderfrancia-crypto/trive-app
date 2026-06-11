import React, { useState, useEffect, useCallback } from 'react'
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

interface ChatPreview {
  requestId: string
  tripId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string
  origin: string
  destination: string
  price: number
  userRole: 'conductor' | 'pasajero'
  unreadCount: number
  isActive: boolean
  lastMessage?: string
  lastMessageTime?: string
}

export default function ActiveChatsTab() {
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

      // 1️⃣ Chats como conductor
      const { data: driverTrips } = await supabase
        .from('airport_requests')
        .select(
          `
          id,
          driver_id,
          passenger_id,
          origin,
          destination,
          offered_price,
          status,
          created_at,
          profiles!passenger_id (id, name, avatar_url)
        `
        )
        .eq('driver_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })

      if (driverTrips) {
        for (const trip of driverTrips) {
          const passengerProfile = trip.profiles as any
          chatsList.push({
            requestId: trip.id,
            tripId: trip.id,
            otherUserId: trip.passenger_id,
            otherUserName: passengerProfile?.name || 'Pasajero',
            otherUserAvatar: passengerProfile?.avatar_url || undefined,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            userRole: 'conductor',
            isActive: trip.status === 'accepted' || trip.status === 'in_progress',
            unreadCount: 0,
          })
        }
      }

      // 2️⃣ Chats como pasajero
      const { data: passengerTrips } = await supabase
        .from('airport_requests')
        .select(
          `
          id,
          driver_id,
          passenger_id,
          origin,
          destination,
          offered_price,
          status,
          created_at,
          profiles!driver_id (id, name, avatar_url)
        `
        )
        .eq('passenger_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })

      if (passengerTrips) {
        for (const trip of passengerTrips) {
          const driverProfile = trip.profiles as any
          chatsList.push({
            requestId: trip.id,
            tripId: trip.id,
            otherUserId: trip.driver_id,
            otherUserName: driverProfile?.name || 'Conductor',
            otherUserAvatar: driverProfile?.avatar_url || undefined,
            origin: trip.origin,
            destination: trip.destination,
            price: trip.offered_price,
            userRole: 'pasajero',
            isActive: trip.status === 'accepted' || trip.status === 'in_progress',
            unreadCount: 0,
          })
        }
      }

      // 3️⃣ Cargar conteos de no leídos y último mensaje
      for (const chat of chatsList) {
        try {
          const { data: messages } = await supabase
            .from('negotiation_messages')
            .select('id, message_text, created_at, is_read')
            .eq('request_id', chat.requestId)
            .neq('sent_by_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          chat.unreadCount = messages?.filter((m: any) => !m.is_read).length || 0
          
          if (messages && messages.length > 0) {
            chat.lastMessage = messages[0].message_text
            chat.lastMessageTime = messages[0].created_at
          }
        } catch (err) {
          console.error('❌ Error loading unread count:', err)
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
  }, [user?.id, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadChats()
    }, [loadChats])
  )

  const handleChatPress = (chat: ChatPreview) => {
    setSelectedChat(chat)
    setChatModalVisible(true)
  }

  const renderChatItem = ({ item: chat }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleChatPress(chat)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {chat.otherUserAvatar ? (
          <Image
            source={{ uri: chat.otherUserAvatar }}
            style={styles.avatar}
          />
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
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {chat.otherUserName}
          </Text>
          <View style={styles.chatActiveBadge}>
            <View style={styles.chatActiveIndicator} />
            <Text style={styles.chatActiveText}>ACTIVO</Text>
          </View>
        </View>

        <Text style={styles.chatRoute} numberOfLines={1}>
          {chat.origin} → {chat.destination}
        </Text>

        {chat.lastMessage && (
          <Text style={styles.chatLastMessage} numberOfLines={1}>
            "{chat.lastMessage}"
          </Text>
        )}

        <View style={styles.chatFooter}>
          <Text style={styles.chatPrice}>${chat.price.toLocaleString('es-CO')}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin chats activos</Text>
      <Text style={styles.emptySubtitle}>
        Los viajes aceptados aparecerán aquí para que puedas conversar
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
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
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
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
  },
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
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  chatName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  chatActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  chatActiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#10b981',
  },
  chatActiveText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: '#10b981',
  },
  chatRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  chatLastMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  roleTag: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
