import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import { TripMessageList } from './TripMessageList'
import { QuickMessageInput } from './QuickMessageInput'
import { useTripMessages } from '../hooks/useTripMessages'

interface TripMessagesModalProps {
  visible: boolean
  tripId: string
  userId: string
  otherUserId: string
  otherUserName: string
  onClose: () => void
}

/**
 * Modal para mostrar mensajes contextual de un viaje
 * Se abre cuando el usuario toca "Contactar" en un viaje activo
 */
export const TripMessagesModal = React.memo(
  ({
    visible,
    tripId,
    userId,
    otherUserId,
    otherUserName,
    onClose,
  }: TripMessagesModalProps) => {
    const { messages, loading, error, send } = useTripMessages(tripId, userId, otherUserId)
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)

    const handleSendMessage = useCallback(
      async (message: string) => {
        if (!message.trim() || sending) return

        try {
          setSending(true)
          setSendError(null)
          await send(message)
        } catch (err: any) {
          setSendError(err.message)
          console.error('Error sending trip message:', err)
        } finally {
          setSending(false)
        }
      },
      [send, sending]
    )

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.title}>Mensaje</Text>
              <Text style={styles.subtitle}>{otherUserName}</Text>
            </View>

            <View style={styles.headerRight} />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Messages List */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.messagesContainer}
            keyboardVerticalOffset={100}
          >
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando mensajes...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={styles.messagesContent}>
                <TripMessageList messages={messages} userId={userId} loading={loading} />
              </View>
            )}

            {sendError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{sendError}</Text>
              </View>
            )}
          </KeyboardAvoidingView>

          {/* Input */}
          <QuickMessageInput
            onSendMessage={handleSendMessage}
            disabled={sending || !!error}
            placeholder="Escribe un mensaje..."
          />
        </SafeAreaView>
      </Modal>
    )
  }
)

TripMessagesModal.displayName = 'TripMessagesModal'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  headerRight: {
    width: 40,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    flex: 1,
    paddingVertical: SPACING.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.error}15`,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  errorBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    flex: 1,
  },
})
