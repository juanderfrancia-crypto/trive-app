import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNegotiationChat } from '../hooks/useNegotiationChat';
import { useAppStore } from '../store/useAppStore';
import { COLORS, SPACING } from '../theme/theme';

interface NegotiationChatModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  driverName: string;
  otherUserId: string;
}

export const NegotiationChatModal: React.FC<NegotiationChatModalProps> = ({
  visible,
  onClose,
  requestId,
  driverName,
  otherUserId,
}) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  const {
    messages,
    payment,
    loadingInitial,
    hasPayment,
    isUserDriver,
    sendMessage,
    markMessagesAsRead,
  } = useNegotiationChat(requestId);
  
  const user = useAppStore(state => state.user);

  // Debug logs
  React.useEffect(() => {
    console.log('📱[MODAL] Modal props:', { visible, requestId, driverName, otherUserId });
    console.log('📱[MODAL] User role:', { userId: user?.id, isDriver: isUserDriver });
    console.log('📱[MODAL] Hook state:', { loadingInitial, hasPayment, messagesCount: messages.length, paymentStatus: payment?.status });
  }, [visible, requestId, loadingInitial, hasPayment, messages.length, payment?.status, driverName, otherUserId, isUserDriver, user?.id]);

  // Marcar como leído cuando se abre el modal
  useEffect(() => {
    if (visible && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [visible, messages.length, markMessagesAsRead]);

  // Scroll automático a último mensaje
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    console.log('📤[MODAL] Intentando enviar:', { messageText, trimmed: messageText.trim() });
    
    if (!messageText.trim()) {
      console.warn('⚠️[MODAL] Mensaje vacío, no se envía');
      return;
    }

    setSending(true);
    const success = await sendMessage(messageText, 'text');
    
    if (success) {
      console.log('✅[MODAL] Limpiando input después de envío exitoso');
      setMessageText('');
    }
    
    setSending(false);
  };

  const isOwnMessage = (fromUserId: string) => {
    const isOwn = fromUserId === user?.id;
    console.log('📱[MODAL] Verificando mensaje propio:', { fromUserId, userId: user?.id, isOwn });
    return isOwn;
  };
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>💬 Negociación</Text>
            <Text style={s.headerSubtitle}>{driverName}</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Chat Content */}
        {!hasPayment && !loadingInitial ? (
          // ❌ Sin pago - bloqueado (solo para conductor)
          <View style={s.blockedContainer}>
            <Ionicons
              name="lock-closed"
              size={48}
              color={COLORS.primary}
              style={{ marginBottom: SPACING.lg }}
            />
            <Text style={s.blockedTitle}>Chat Bloqueado</Text>
            <Text style={s.blockedMessage}>
              {isUserDriver
                ? 'Debes pagar la comisión de $5.000 para comunicarte con el pasajero.'
                : 'Este chat no está disponible en este momento.'}
            </Text>
            <Text style={s.blockedSubtext}>
              {isUserDriver
                ? 'Esta medida protege contra fraude.'
                : ''}
            </Text>
            {payment?.status === 'deducted' && (
              <View style={s.paymentConfirm}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={s.paymentConfirmText}>
                  Pago recibido ✓
                </Text>
              </View>
            )}
          </View>
        ) : loadingInitial && messages.length === 0 ? (
          // 🔄 Cargando SOLO al inicio (sin mensajes aún)
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          // ✅ Chat disponible
          <>
            {/* Mensajes */}
            <ScrollView
              ref={scrollRef}
              style={s.messagesContainer}
              contentContainerStyle={s.messagesContent}
            >
              {messages.length === 0 ? (
                <View style={s.emptyMessages}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={40}
                    color={COLORS.textTertiary}
                  />
                  <Text style={s.emptyText}>Sin mensajes aún</Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      s.messageRow,
                      isOwnMessage(msg.sent_by_user_id) && s.ownMessageRow,
                    ]}
                  >
                    <View
                      style={[
                        s.messageBubble,
                        isOwnMessage(msg.sent_by_user_id) && s.ownMessageBubble,
                      ]}
                    >
                      <Text
                        style={[
                          s.messageText,
                          isOwnMessage(msg.sent_by_user_id) && s.ownMessageText,
                        ]}
                      >
                        {msg.message_text}
                      </Text>
                      <Text
                        style={[
                          s.messageTime,
                          isOwnMessage(msg.sent_by_user_id) && s.ownMessageTime,
                        ]}
                      >
                        {formatTime(msg.created_at)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={COLORS.textTertiary}
                value={messageText}
                onChangeText={(text) => {
                  console.log('📝[MODAL] Input cambió:', text);
                  setMessageText(text);
                }}
                multiline
                maxLength={500}
                editable={!sending}
                selectionColor={COLORS.primary}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
                style={[
                  s.sendButton,
                  (!messageText.trim() || sending) && s.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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

  blockedContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  blockedMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    marginBottom: SPACING.sm,
  },
  blockedSubtext: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center' as const,
  },
  paymentConfirm: {
    marginTop: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  paymentConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
    width: '100%',
  },
  ownMessageRow: {
    justifyContent: 'flex-end' as const,
  },

  messageBubble: {
    maxWidth: '80%',
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start' as const,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end' as const,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
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
};
