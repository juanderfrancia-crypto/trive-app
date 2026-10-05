import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'
import Button from './Button'
import Icon from './Icon'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
  iconColor?: string
}

export default function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
  iconColor = COLORS.textTertiary,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrapper}>
        <Icon name={icon as any} size={64} color={iconColor} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <View style={{ marginTop: SPACING.xl }}>
          <Button
            variant="primary"
            onPress={onAction}
            size="md"
          >
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  iconWrapper: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 24,
  },
})
