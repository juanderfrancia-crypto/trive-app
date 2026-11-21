import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useNegotiationChat, NegotiationMessage } from '../hooks/useNegotiationChat'
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
  const listRef = useRef<FlatList>(null)

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

  // El chat se abre solo cuando el pasajero ACEPTA la oferta, no con solo
  // proponerla (eso es gratis y sin compromiso) -- ver useNegotiationChat.ts.
  const closedMessage = isUserDriver
    ? 'El pasajero debe aceptar tu oferta para que se abra el chat.'
    : 'Acepta esta oferta para poder chatear con el conductor.'

  useEffect(() => {
    if (messages.length > 0) markMessagesAsRead()
  }, [messages.length, markMessagesAsRead])

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSending(true)
    const success = await sendMessage(messageText, 'text')
    if (success) setMessageText('')
    setSending(false)
  }

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  // FlatList en vez de ScrollView+.map() -- sin tope arquitectónico de antes, una
  // negociación que se alargue no re-renderizaba todo el hilo en cada mensaje nuevo
  // (mismo patrón que TripMessageList, el chat de viaje real).
  const renderMessage = useCallback(({ item: msg }: { item: NegotiationMessage }) => {
    const own = msg.sent_by_user_id === user?.id
    return (
      <View style={[s.messageRow, own && s.ownMessageRow]}>
        <View style={[s.messageBubble, own && s.ownMessageBubble]}>
          <Text style={[s.messageText, own && s.ownMessageText]}>{msg.message_text}</Text>
          <Text style={[s.messageTime, own && s.ownMessageTime]}>{formatTime(msg.created_at)}</Text>
        </View>
      </View>
    )
  }, [user?.id])

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
            <FlatList
              ref={listRef}
              style={s.messagesContainer}
              data={messages}
              keyExtractor={(msg) => msg.id}
              renderItem={renderMessage}
              contentContainerStyle={s.messagesContent}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={s.emptyMessages}>
                  <Icon name="MessageCircle" size={40} color={COLORS.textTertiary} />
                  <Text style={s.emptyText}>Sin mensajes aún</Text>
                </View>
              }
            />
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
              <View style={s.closedTextRow}>
                <Icon name="Lock" size={16} color={COLORS.textSecondary} />
                <Text style={s.closedText}>{closedMessage}</Text>
              </View>
              {!isUserDriver && (
                <TouchableOpacity style={s.closedBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                  <Text style={s.closedBtnText}>Ver propuesta</Text>
                </TouchableOpacity>
              )}
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  closedTextRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  closedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    flexShrink: 1,
  },
  closedBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  closedBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.white,
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
