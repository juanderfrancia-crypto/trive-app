import React, { useRef, useEffect, useMemo } from 'react'
import { View, Image, FlatList, StyleSheet } from 'react-native'
import { Text } from './AppText'
import { TripMessage } from '../services/trip_messages'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface TripMessageListProps {
  messages: TripMessage[]
  userId: string
  otherUserName: string
  otherUserPhotoUrl?: string | null
  loading?: boolean
}

type ListItem =
  | { kind: 'separator'; id: string; label: string }
  | { kind: 'message'; id: string; message: TripMessage }

const dayLabel = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (sameDay(date, today)) return 'Hoy'
  if (sameDay(date, yesterday)) return 'Ayer'
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export const TripMessageList = React.memo(({ messages, userId, otherUserName, otherUserPhotoUrl, loading }: TripMessageListProps) => {
  const listRef = useRef<FlatList>(null)
  const otherInitial = (otherUserName || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
      return () => clearTimeout(t)
    }
  }, [messages.length])

  // Intercala un separador de fecha ("Hoy", "Ayer"...) antes del primer mensaje de cada día.
  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = []
    let lastLabel: string | null = null
    for (const m of messages) {
      const label = dayLabel(new Date(m.created_at))
      if (label !== lastLabel) {
        out.push({ kind: 'separator', id: `sep-${m.id}`, label })
        lastLabel = label
      }
      out.push({ kind: 'message', id: m.id, message: m })
    }
    return out
  }, [messages])

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'separator') {
      return (
        <View style={styles.separatorRow}>
          <View style={styles.separatorPill}>
            <Text style={styles.separatorText}>{item.label}</Text>
          </View>
        </View>
      )
    }

    const msg = item.message
    const isFromMe = msg.from_user_id === userId
    const timestamp = new Date(msg.created_at).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (isFromMe) {
      return (
        <View style={styles.rowMe}>
          <View style={[styles.bubble, styles.bubbleMe]}>
            <Text style={styles.messageTextMe}>{msg.message}</Text>
            <Text style={styles.timestampMe}>
              {timestamp}{msg.is_read ? ' ✓✓' : ''}
            </Text>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.rowThem}>
        {otherUserPhotoUrl ? (
          <Image source={{ uri: otherUserPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{otherInitial}</Text>
          </View>
        )}
        <View style={[styles.bubble, styles.bubbleThem]}>
          <Text style={styles.messageTextThem}>{msg.message}</Text>
          <Text style={styles.timestampThem}>{timestamp}</Text>
        </View>
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
      data={items}
      renderItem={renderItem}
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
  // flexGrow + justifyContent:'flex-end' ancla los mensajes abajo cuando hay pocos
  // (como WhatsApp): el espacio vacío queda arriba, no abajo del último mensaje.
  // Con más mensajes de los que caben, la lista simplemente scrollea normal.
  list: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  separatorRow: {
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  separatorPill: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  separatorText: {
    ...TYPOGRAPHY.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textTertiary,
  },
  rowMe: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rowThem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
  },
  bubble: {
    maxWidth: '76%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
  },
  messageTextMe: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
    color: COLORS.white,
  },
  messageTextThem: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
  timestampMe: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timestampThem: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
    color: COLORS.textTertiary,
    textAlign: 'left',
  },
})
