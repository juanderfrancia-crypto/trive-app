import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { NegotiationChatModal } from '../components/NegotiationChatModal'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { supabase } from '../services/supabase'

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
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  isActive: boolean
}

export default function NegotiationChatsScreen() {
  const user = useAppStore((s) => s.user)
  const { loadDriverActiveTrips, loadPassengerActiveTrips } = useAirportNegotiation()
  
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
  const [chatModalVisible, setChatModalVisible] = useState(false)

  // Cargar chats activos (tanto como conductor como pasajero)
  const loadChats = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const chatsList: ChatPreview[] = []

      // 1️⃣ Chats como conductor (viajes que está haciendo)
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

      // 2️⃣ Chats como pasajero (solicitudes que hizo)
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

      // 3️⃣ Cargar conteos de no leídos
      for (const chat of chatsList) {
        try {
          const { data: messages } = await supabase
            .from('negotiation_messages')
            .select('id')
            .eq('request_id', chat.requestId)
            .eq('is_read', false)
            .neq('sent_by_user_id', user.id)

          chat.unreadCount = messages?.length || 0
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
    }
  }, [user?.id])

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
      style={[styles.chatCard, !chat.isActive && styles.chatCardInactive]}
      onPress={() => handleChatPress(chat)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {chat.otherUserAvatar ? (
          <View style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={COLORS.surface} />
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

      {/* Contenido */}
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {chat.otherUserName}
          </Text>
          <View style={styles.roleTagContainer}>
            <Text
              style={[
                styles.roleTag,
                chat.userRole === 'conductor' ? styles.roleTagDriver : styles.roleTagPassenger,
              ]}
            >
              {chat.userRole === 'conductor' ? '🚗 Conductor' : '✈️ Pasajero'}
            </Text>
          </View>
        </View>

        <Text style={styles.chatRoute} numberOfLines={1}>
          {chat.origin} → {chat.destination}
        </Text>

        <View style={styles.chatFooter}>
          <Text style={styles.chatPrice}>${chat.price.toLocaleString('es-CO')}</Text>
          {!chat.isActive && (
            <Text style={styles.chatStatus}>Viaje completado</Text>
          )}
        </View>
      </View>

      {/* Icono navegación */}
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Sin chats activos</Text>
      <Text style={styles.emptySubtitle}>
        Los viajes aceptados aparecerán aquí para que puedas conversar con los
        {user?.role === 'conductor' ? ' pasajeros' : ' conductores'}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>

      {/* Lista de chats */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.requestId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={loading}
          onRefresh={loadChats}
        />
      )}

      {/* Chat Modal */}
      {selectedChat && (
        <NegotiationChatModal
          visible={chatModalVisible}
          onClose={() => {
            setChatModalVisible(false)
            setSelectedChat(null)
            loadChats() // Recargar para actualizar unread counts
          }}
          requestId={selectedChat.requestId}
          driverName={selectedChat.otherUserName}
          otherUserId={selectedChat.otherUserId}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
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
  chatCardInactive: {
    opacity: 0.6,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
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
  roleTagContainer: {
    marginLeft: SPACING.sm,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  roleTagDriver: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  roleTagPassenger: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
  },
  chatRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
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
  chatStatus: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
})
