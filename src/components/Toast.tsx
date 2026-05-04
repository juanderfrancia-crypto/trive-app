import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../theme/theme'

interface ToastProps {
  visible: boolean
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  onHide: () => void
  duration?: number
  action?: { label: string; onPress: () => void }
}

export default function Toast({
  visible,
  message,
  type,
  onHide,
  duration = 4000,
  action,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-200)).current
  const opacity = useRef(new Animated.Value(0)).current
  const progressWidth = useRef(new Animated.Value(100)).current
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()

      // Progress bar animation
      Animated.timing(progressWidth, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start()

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -200,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide()
        })
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, duration, onHide, translateY, opacity, progressWidth])

  if (!visible) return null

  const config = {
    success: {
      icon: 'checkmark-circle' as const,
      colors: [COLORS.success + 'F5', COLORS.success + 'A0'],
      iconColor: '#fff',
      accentColor: '#fff',
    },
    error: {
      icon: 'alert-circle' as const,
      colors: [COLORS.error + 'F5', COLORS.error + 'A0'],
      iconColor: '#fff',
      accentColor: '#fff',
    },
    warning: {
      icon: 'warning' as const,
      colors: ['#FF9F43F5', '#FF9F43A0'],
      iconColor: '#fff',
      accentColor: '#fff',
    },
    info: {
      icon: 'information-circle' as const,
      colors: [COLORS.primary + 'F5', COLORS.primary + 'A0'],
      iconColor: '#fff',
      accentColor: '#fff',
    },
  } as const

  const cfg = config[type]

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          marginTop: insets.top + SPACING.md,
        },
      ]}
    >
      <LinearGradient
        colors={cfg.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={cfg.icon} size={24} color={cfg.iconColor} />
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onHide}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={cfg.accentColor} />
          </TouchableOpacity>
        </View>

        {action && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              action.onPress()
              onHide()
            }}
          >
            <Text style={styles.actionText}>{action.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={cfg.accentColor} />
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </LinearGradient>
    </Animated.View>
  )
}


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: SPACING.lg,
  },
  gradientContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    ...TYPOGRAPHY.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
})
