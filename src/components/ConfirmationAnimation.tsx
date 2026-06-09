import React, { useEffect } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../theme/theme'

interface ConfirmationAnimationProps {
  /**
   * Whether to show and animate the confirmation
   */
  visible: boolean
  /**
   * Callback when animation completes
   */
  onAnimationComplete?: () => void
}

/**
 * ConfirmationAnimation
 * Shows an animated checkmark circle with scale and fade effects
 * Perfect for booking confirmations, form submissions, etc.
 */
export const ConfirmationAnimation: React.FC<ConfirmationAnimationProps> = ({
  visible,
  onAnimationComplete,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current
  const opacityAnim = React.useRef(new Animated.Value(0)).current
  const checkmarkScaleAnim = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0)
      opacityAnim.setValue(0)
      checkmarkScaleAnim.setValue(0)
      return
    }

    // Circle entrance with elastic effect
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 8,
        bounciness: 12,
        useNativeDriver: true,
      }),
      // Checkmark appears after circle settles
      Animated.timing(checkmarkScaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.()
    })
  }, [visible, scaleAnim, opacityAnim, checkmarkScaleAnim, onAnimationComplete])

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Background backdrop */}
      <View style={styles.backdrop} />

      {/* Animated circle + checkmark */}
      <Animated.View
        style={[
          styles.animationWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.circle}>
          <Animated.View
            style={{
              transform: [{ scale: checkmarkScaleAnim }],
            }}
          >
            <Ionicons name="checkmark-done" size={48} color="#fff" />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  animationWrapper: {
    zIndex: 1001,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success || '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success || '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
})
