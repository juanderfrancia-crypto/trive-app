import React, { useRef } from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'

// Optional import - expo-haptics may not be installed
let Haptics: any = null
try {
  Haptics = require('expo-haptics')
} catch (e) {
  // expo-haptics not available, haptic feedback will be skipped
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps {
  onPress?: () => void | Promise<void>
  children?: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  haptic?: boolean
}

export default function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const isDisabledState = disabled || loading

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start()
  }

  const handlePress = async () => {
    if (isDisabledState || !onPress) return
    
    if (haptic && Haptics) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch (e) {
        // Haptics not available
      }
    }

    try {
      await onPress()
    } catch (error) {
      console.error('Button press error:', error)
    }
  }

  const sizeStyles = getSizeStyles(size)
  const variantStyles = getVariantStyles(variant, isDisabledState)

  const textColor = variant === 'outline' || variant === 'ghost' 
    ? COLORS.textPrimary 
    : COLORS.textInverse

  const contentJSX = (
    <View style={styles.contentWrapper}>
      {icon && iconPosition === 'left' && (
        <Ionicons
          name={icon as any}
          size={sizeStyles.iconSize}
          color={textColor}
          style={{ marginRight: SPACING.sm }}
        />
      )}
      
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={{ marginRight: icon ? SPACING.sm : 0 }}
        />
      ) : null}

      {children && (
        <Text
          style={[
            sizeStyles.text,
            variantStyles.text,
            { color: textColor },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}

      {icon && iconPosition === 'right' && !loading && (
        <Ionicons
          name={icon as any}
          size={sizeStyles.iconSize}
          color={textColor}
          style={{ marginLeft: SPACING.sm }}
        />
      )}
    </View>
  )

  if (variant === 'primary') {
    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: fullWidth ? '100%' : 'auto',
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabledState}
          activeOpacity={0.95}
          style={[
            styles.button,
            sizeStyles.container,
            { overflow: 'hidden', borderRadius: RADIUS.md },
            fullWidth && { width: '100%' },
            style,
          ]}
        >
          <LinearGradient
            colors={['#0E2699', '#1230B8', '#1A3FCC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              sizeStyles.container,
              isDisabledState && { opacity: 0.5 },
            ]}
          >
            {contentJSX}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabledState}
        activeOpacity={0.95}
        style={[
          styles.button,
          sizeStyles.container,
          variantStyles.container,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {contentJSX}
      </TouchableOpacity>
    </Animated.View>
  )
}

function getSizeStyles(size: ButtonSize) {
  const styles: Record<string, any> = {
    sm: {
      container: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.sm,
      },
      text: TYPOGRAPHY.bodySmall,
      iconSize: 14,
    },
    md: {
      container: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
      },
      text: TYPOGRAPHY.body,
      iconSize: 16,
    },
    lg: {
      container: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.md,
      },
      text: { ...TYPOGRAPHY.body, fontWeight: '600' },
      iconSize: 18,
    },
    xl: {
      container: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: 20,
        borderRadius: RADIUS.lg,
      },
      text: { ...TYPOGRAPHY.button },
      iconSize: 20,
    },
  }
  return styles[size]
}

function getVariantStyles(variant: ButtonVariant, disabled: boolean) {
  const baseStyles = {
    primary: {
      container: {
        backgroundColor: COLORS.primary,
        borderWidth: 0,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: disabled ? 0.08 : 0.15,
        shadowRadius: 12,
        elevation: disabled ? 1 : 5,
      },
      text: { fontWeight: '600' as any },
    },
    secondary: {
      container: {
        backgroundColor: COLORS.accentLight,
        borderWidth: 0,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: disabled ? 0.08 : 0.15,
        shadowRadius: 8,
        elevation: disabled ? 1 : 4,
      },
      text: { fontWeight: '600' as any, color: COLORS.primary },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: disabled ? COLORS.grayLight : COLORS.primary,
        shadowOpacity: 0,
        elevation: 0,
      },
      text: { fontWeight: '600' as any },
    },
    danger: {
      container: {
        backgroundColor: COLORS.error,
        borderWidth: 0,
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: disabled ? 0.08 : 0.15,
        shadowRadius: 12,
        elevation: disabled ? 1 : 4,
      },
      text: { fontWeight: '600' as any },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
      },
      text: { fontWeight: '500' as any },
    },
  }

  const styles = baseStyles[variant]

  if (disabled) {
    return {
      container: {
        ...styles.container,
        opacity: 0.5,
      },
      text: styles.text,
    }
  }

  return styles
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
