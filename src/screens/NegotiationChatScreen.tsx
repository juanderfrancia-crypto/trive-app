import React, { useEffect, useRef, useState } from 'react'
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useNegotiationChat } from '../hooks/useNegotiationChat'
import { useAppStore } from '../store/useAppStore'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import ChatDoodleBackground from '../components/ChatDoodleBackground'
import { supabase } from '../services/supabase'

interface RouteParams {
  requestId: string
  driverId: string
  driverName: string
  otherUserId: string
}

// Convertido de modal a pantalla normal: un <Modal> nativo de RN crea su propia
// ventana en Android que no se redimensiona bien con el teclado (mismo problema
// ya resuelto así en Datos personales y Agregar método digital).
export default function NegotiationChatScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { requestId, driverId, driverName, otherUserId } = (route.params ?? {}) as RouteParams

  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [otherPhotoUrl, setOtherPhotoUrl] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Foto real del otro usuario para el encabezado, no un ícono genérico.
  useEffect(() => {
    let cancelled = false
    setOtherPhotoUrl(null)
    if (!otherUserId) return
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', otherUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOtherPhotoUrl(data?.avatar_url ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [otherUserId])

  const {
    messages,
    loadingInitial,
    isOpen,
    isUserDriver,
    sendMessage,
    markMessagesAsRead,
  } = useNegotiationChat(requestId, driverId)

  const user = useAppStore((state) => state.user)

  const closedMessage = isUserDriver
    ? 'Este hilo está cerrado: tu oferta no fue aceptada o el viaje ya no está disponible.'
    : 'Este chat ya no está disponible.'

  useEffect(() => {
    if (messages.length > 0) markMessagesAsRead()
  }, [messages.length, markMessagesAsRead])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSending(true)
    const success = await sendMessage(messageText, 'text')
    if (success) setMessageText('')
    setSending(false)
  }

  const isOwnMessage = (fromUserId: string) => fromUserId === user?.id

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="ChevronLeft" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        {otherPhotoUrl ? (
          <Image source={{ uri: otherPhotoUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatar}>
            <Icon name="User" size={18} color={COLORS.primary} />
          </View>
        )}
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Negociación</Text>
          <Text style={s.headerSubtitle}>{driverName}</Text>
        </View>
      </View>

      {loadingInitial && messages.length === 0 ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingScreen measureKeyboard style={s.keyboardArea}>
          <View style={s.messagesWrap}>
            <ChatDoodleBackground />
            <ScrollView
              ref={scrollRef}
              style={s.messagesContainer}
              contentContainerStyle={s.messagesContent}
            >
              {messages.length === 0 ? (
                <View style={s.emptyMessages}>
                  <Icon name="MessageCircle" size={40} color={COLORS.textTertiary} />
                  <Text style={s.emptyText}>Sin mensajes aún</Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[s.messageRow, isOwnMessage(msg.sent_by_user_id) && s.ownMessageRow]}
                  >
                    <View style={[s.messageBubble, isOwnMessage(msg.sent_by_user_id) && s.ownMessageBubble]}>
                      <Text style={[s.messageText, isOwnMessage(msg.sent_by_user_id) && s.ownMessageText]}>
                        {msg.message_text}
                      </Text>
                      <Text style={[s.messageTime, isOwnMessage(msg.sent_by_user_id) && s.ownMessageTime]}>
                        {formatTime(msg.created_at)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {isOpen ? (
            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={COLORS.textTertiary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
                editable={!sending && isOpen}
                selectionColor={COLORS.primary}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending || !isOpen}
                style={[s.sendButton, (!messageText.trim() || sending || !isOpen) && s.sendButtonDisabled]}
              >
                {sending ? (
                  <Icon name="Check" size={20} color={COLORS.white} />
                ) : (
                  <Icon name="Send" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.closedBanner}>
              <Icon name="Lock" size={16} color={COLORS.textSecondary} />
              <Text style={s.closedText}>{closedMessage}</Text>
            </View>
          )}
        </KeyboardAvoidingScreen>
      )}
    </SafeAreaView>
  )
}

const s = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  messagesWrap: {
    flex: 1,
    position: 'relative' as const,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },

  messageRow: {
    marginBottom: SPACING.md,
    flexDirection: 'row' as const,
    width: '100%' as const,
  },
  ownMessageRow: {
    justifyContent: 'flex-end' as const,
  },

  messageBubble: {
    maxWidth: '80%' as const,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start' as const,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end' as const,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },

  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.white,
  },

  messageTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },

  closedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  closedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    flexShrink: 1,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}
