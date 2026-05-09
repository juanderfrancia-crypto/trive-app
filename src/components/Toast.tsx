import React, { useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../theme/theme'

interface ToastProps {
  visible: boolean
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  onHide: () => void
  title?: string
  duration?: number
  action?: { label: string; onPress: () => void }
}

const TYPE_CONFIG = {
  success: {
    icon: 'checkmark-circle' as const,
    color: '#10B981',
    defaultTitle: 'Listo',
  },
  error: {
    icon: 'close-circle' as const,
    color: '#EF4444',
    defaultTitle: 'Error',
  },
  warning: {
    icon: 'warning' as const,
    color: '#F59E0B',
    defaultTitle: 'Atención',
  },
  info: {
    icon: 'information-circle' as const,
    color: COLORS.primary,
    defaultTitle: 'Info',
  },
} as const

export default function Toast({
  visible,
  message,
  type,
  onHide,
  title,
  duration = 4000,
  action,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity    = useRef(new Animated.Value(0)).current
  const scale      = useRef(new Animated.Value(0.94)).current
  const progress   = useRef(new Animated.Value(1)).current
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets     = useSafeAreaInsets()

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onHide())
  }, [onHide, translateY, opacity])

  useEffect(() => {
    if (!visible) return

    translateY.setValue(-100)
    opacity.setValue(0)
    scale.setValue(0.94)
    progress.setValue(1)

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 20,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.timing(progress, {
      toValue: 0,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()

    timerRef.current = setTimeout(dismiss, duration)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [visible])

  if (!visible) return null

  const cfg = TYPE_CONFIG[type]
  const displayTitle = title ?? cfg.defaultTitle

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 14,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      {/* Left accent */}
      <View style={[styles.accent, { backgroundColor: cfg.color }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>

      {/* Text content */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
        <Text style={styles.message} numberOfLines={3}>{message}</Text>
        {action && (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { action.onPress(); dismiss() }}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: cfg.color }]}>{action.label}</Text>
            <Ionicons name="arrow-forward" size={12} color={cfg.color} />
          </TouchableOpacity>
        )}
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={dismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: cfg.color,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 12,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 14,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 0,
  },
})
