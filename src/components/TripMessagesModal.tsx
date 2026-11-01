import React, { useEffect, useState, useCallback } from 'react'
import { View, Image, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native'
import { Text } from './AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from './Icon'
import KeyboardAvoidingScreen from './KeyboardAvoidingScreen'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import { TripMessageList } from './TripMessageList'
import { QuickMessageInput } from './QuickMessageInput'
import { useTripMessages } from '../hooks/useTripMessages'
import { getCounterpartPhone } from '../services/profileColumns'
import { supabase } from '../services/supabase'

interface TripMessagesModalProps {
  visible: boolean
  tripId: string
  userId: string
  otherUserId: string
  otherUserName: string
  /** Contexto del viaje (opcional): si se pasa, reemplaza el subtítulo genérico "Mensaje". */
  origin?: string
  destination?: string
  departureTime?: string
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
    origin,
    destination,
    departureTime,
    onClose,
  }: TripMessagesModalProps) => {
    const { messages, loading, error, send } = useTripMessages(tripId, userId, otherUserId)
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const [otherPhotoUrl, setOtherPhotoUrl] = useState<string | null>(null)

    // Foto real del otro usuario para el avatar del chat (no un ícono genérico).
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

    const handleCall = useCallback(async () => {
      const phone = await getCounterpartPhone(otherUserId)
      if (phone) {
        Linking.openURL(`tel:${phone}`)
      } else {
        Alert.alert(
          'No pudimos hacer la llamada',
          'No tenemos el número de este contacto en este momento. Puedes escribirle por el chat.'
        )
      }
    }, [otherUserId])

    const routeSubtitle =
      origin && destination
        ? `${origin} → ${destination}` +
          (departureTime
            ? ` · ${new Date(departureTime).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`
            : '')
        : null

    const otherInitial = (otherUserName || '?').trim().charAt(0).toUpperCase()

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
            <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityLabel="Cerrar chat">
              <Icon name="ChevronDown" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {otherPhotoUrl ? (
              <Image source={{ uri: otherPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{otherInitial}</Text>
              </View>
            )}

            <View style={styles.headerContent}>
              <Text style={styles.title} numberOfLines={1}>{otherUserName}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{routeSubtitle ?? 'Chat del viaje'}</Text>
            </View>

            <TouchableOpacity
              onPress={handleCall}
              style={[styles.iconButton, styles.callButton]}
              accessibilityLabel="Llamar"
            >
              <Icon name="Phone" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Messages List */}
          <KeyboardAvoidingScreen style={styles.messagesContainer} extraOffset={100}>
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando mensajes...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Icon name="CircleAlert" size={48} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={styles.messagesContent}>
                <TripMessageList
                  messages={messages}
                  userId={userId}
                  otherUserName={otherUserName}
                  otherUserPhotoUrl={otherPhotoUrl}
                  loading={loading}
                />
              </View>
            )}

            {sendError && (
              <View style={styles.errorBanner}>
                <Icon name="CircleAlert" size={16} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{sendError}</Text>
              </View>
            )}

          {/* Input */}
          <QuickMessageInput
            onSendMessage={handleSendMessage}
            disabled={sending || !!error}
            placeholder="Escribe un mensaje..."
          />
          </KeyboardAvoidingScreen>
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
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  callButton: {
    backgroundColor: COLORS.primaryTint,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surfaceAlt,
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
