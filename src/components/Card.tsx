import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'

type CardVariant = 'elevated' | 'flat' | 'outlined'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  children: React.ReactNode
  variant?: CardVariant
  padding?: CardPadding
  style?: ViewStyle
  onPress?: () => void
  disabled?: boolean
}

export default function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  style,
  onPress,
  disabled,
}: CardProps) {
  const variantStyles = getVariantStyles(variant)
  const paddingSize = getPaddingSize(padding)

  const containerStyle = [
    styles.card,
    variantStyles,
    { padding: paddingSize },
    disabled && { opacity: 0.6 },
    style,
  ]

  // Si tiene onPress, envolver en TouchableOpacity se haría en el componente padre
  return (
    <View style={containerStyle}>
      {children}
    </View>
  )
}

function getVariantStyles(variant: CardVariant) {
  const styles = {
    elevated: {
      backgroundColor: COLORS.surface,
      borderWidth: 0,
      borderRadius: RADIUS.lg,
      shadowColor: COLORS.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    flat: {
      backgroundColor: COLORS.surfaceAlt,
      borderWidth: 0,
      borderRadius: RADIUS.lg,
      shadowOpacity: 0,
      elevation: 0,
    },
    outlined: {
      backgroundColor: COLORS.surface,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: RADIUS.lg,
      shadowOpacity: 0,
      elevation: 0,
    },
  }
  return styles[variant]
}

function getPaddingSize(padding: CardPadding) {
  const sizes = {
    none: 0,
    sm: SPACING.md,
    md: SPACING.lg,
    lg: SPACING.xl,
  }
  return sizes[padding]
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
})
