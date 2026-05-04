import React, { useState, useCallback } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface QuickMessageInputProps {
  onSendMessage: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

/**
 * Input simple para enviar mensajes rápidos
 * Solo texto, sin attachments ni botones extras
 */
export const QuickMessageInput = React.memo(
  ({ onSendMessage, disabled = false, placeholder = 'Escribe un mensaje...' }: QuickMessageInputProps) => {
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = useCallback(async () => {
      if (!message.trim() || sending || disabled) return

      try {
        setSending(true)
        await onSendMessage(message.trim())
        setMessage('')
      } catch (err) {
        console.error('Error sending message:', err)
        // El error se maneja en el componente padre
      } finally {
        setSending(false)
      }
    }, [message, sending, disabled, onSendMessage])

    const canSend = message.trim().length > 0 && !sending && !disabled

    return (
      <View style={styles.container}>
        <TextInput
          style={[
            styles.input,
            disabled && styles.inputDisabled,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!disabled && !sending}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color={canSend ? '#FFFFFF' : COLORS.textTertiary} />
          )}
        </TouchableOpacity>
      </View>
    )
  }
)

QuickMessageInput.displayName = 'QuickMessageInput'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.borderLight,
    color: COLORS.textTertiary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.borderLight,
  },
})
