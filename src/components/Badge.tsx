import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: string
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Badge({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const sizeStyles = getSizeStyles(size)
  const variantStyles = getVariantStyles(variant)
  const textColor = variantStyles.textColor

  return (
    <View
      style={[
        styles.badge,
        sizeStyles.container,
        variantStyles.container,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={sizeStyles.iconSize}
          color={textColor}
          style={{ marginRight: SPACING.xs }}
        />
      )}
      <Text
        style={[
          sizeStyles.text,
          { color: textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

function getSizeStyles(size: BadgeSize) {
  const styles: Record<string, any> = {
    sm: {
      container: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
      },
      text: { ...TYPOGRAPHY.caption, fontWeight: '600' },
      iconSize: 12,
    },
    md: {
      container: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
      },
      text: { ...TYPOGRAPHY.labelSmall, fontWeight: '600' },
      iconSize: 13,
    },
    lg: {
      container: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
      },
      text: { ...TYPOGRAPHY.body2, fontWeight: '600' },
      iconSize: 14,
    },
  }
  return styles[size]
}

function getVariantStyles(variant: BadgeVariant) {
  const styles: Record<string, any> = {
    success: {
      container: {
        backgroundColor: `${COLORS.success}20`,
      },
      textColor: COLORS.success,
    },
    warning: {
      container: {
        backgroundColor: `${COLORS.warning}20`,
      },
      textColor: COLORS.warning,
    },
    error: {
      container: {
        backgroundColor: `${COLORS.error}20`,
      },
      textColor: COLORS.error,
    },
    info: {
      container: {
        backgroundColor: `${COLORS.info}20`,
      },
      textColor: COLORS.info,
    },
    primary: {
      container: {
        backgroundColor: `${COLORS.primary}20`,
      },
      textColor: COLORS.primary,
    },
    neutral: {
      container: {
        backgroundColor: COLORS.grayLight,
      },
      textColor: COLORS.textSecondary,
    },
  }
  return styles[variant]
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
