import React from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../theme/theme'

type LoadingIndicatorSize = 'sm' | 'md' | 'lg'
type LoadingIndicatorColor = 'primary' | 'white' | 'success' | 'error'

interface LoadingIndicatorProps {
  size?: LoadingIndicatorSize
  color?: LoadingIndicatorColor
  style?: any
}

/**
 * Animated loading spinner
 * More elegant than ActivityIndicator
 */
export default function LoadingIndicator({
  size = 'md',
  color = 'primary',
  style,
}: LoadingIndicatorProps) {
  const spinValue = new Animated.Value(0)

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }, [spinValue])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const sizeMap: Record<LoadingIndicatorSize, number> = {
    sm: 24,
    md: 32,
    lg: 48,
  }

  const colorMap: Record<LoadingIndicatorColor, string> = {
    primary: COLORS.primary,
    white: '#FFFFFF',
    success: COLORS.success,
    error: COLORS.error,
  }

  return (
    <Animated.View
      style={[
        {
          width: sizeMap[size],
          height: sizeMap[size],
          transform: [{ rotate: spin }],
        },
        style,
      ]}
    >
      <Ionicons
        name="sync"
        size={sizeMap[size]}
        color={colorMap[color]}
        style={{ width: sizeMap[size], height: sizeMap[size] }}
      />
    </Animated.View>
  )
}

// ─── LoadingOverlay - Full screen loading ───────────────────────────────
interface LoadingOverlayProps {
  visible: boolean
  label?: string
}

export function LoadingOverlay({ visible, label = 'Cargando...' }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <LoadingIndicator size="lg" color="white" />
        {label && <View style={{ height: SPACING.md }} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
