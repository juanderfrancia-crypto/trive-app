import React, { useRef, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { TripMessage } from '../services/trip_messages'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface TripMessageListProps {
  messages: TripMessage[]
  userId: string
  loading?: boolean
}

export const TripMessageList = React.memo(({ messages, userId, loading }: TripMessageListProps) => {
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
      return () => clearTimeout(t)
    }
  }, [messages.length])

  const renderMessage = ({ item }: { item: TripMessage }) => {
    const isFromMe = item.from_user_id === userId
    const timestamp = new Date(item.created_at).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <View style={[styles.bubble, isFromMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.messageText, isFromMe ? styles.messageTextMe : styles.messageTextThem]}>
          {item.message}
        </Text>
        <Text style={[styles.timestamp, isFromMe ? styles.timestampMe : styles.timestampThem]}>
          {timestamp}{isFromMe && item.is_read ? ' ✓✓' : ''}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Cargando mensajes...</Text>
      </View>
    )
  }

  if (messages.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Sin mensajes aún</Text>
        <Text style={styles.centerSubtext}>Envía el primer mensaje</Text>
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
    />
  )
})

TripMessageList.displayName = 'TripMessageList'

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  centerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  centerSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  list: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  bubble: {
    marginVertical: SPACING.xs,
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextThem: {
    color: COLORS.textPrimary,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
  timestampMe: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  timestampThem: {
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
})
