import { COLORS, RADIUS } from '../theme/theme'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from './AppText'
import Icon from './Icon'

const TYPE_CONFIG = {
  success: { icon: 'CircleCheck' as const, color: COLORS.success, chipBg: COLORS.successLight },
  error:   { icon: 'CircleX'     as const, color: COLORS.error,   chipBg: COLORS.errorLight },
  warning: { icon: 'TriangleAlert' as const, color: COLORS.warningDark, chipBg: COLORS.warningLight },
  info:    { icon: 'Info'        as const, color: COLORS.primary, chipBg: COLORS.primaryTint },
}

function TriveToast({ text1, text2, type = 'info' }: {
  text1?: string; text2?: string; hide: () => void; type?: string
}) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
  return (
    <View style={styles.container}>
      <View style={[styles.iconChip, { backgroundColor: cfg.chipBg }]}>
        <Icon name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{text1}</Text>
        {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
      </View>
    </View>
  )
}

export const toastConfig = {
  success: (props: any) => <TriveToast {...props} type="success" />,
  error:   (props: any) => <TriveToast {...props} type="error" />,
  info:    (props: any) => <TriveToast {...props} type="info" />,
  warning: (props: any) => <TriveToast {...props} type="warning" />,
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxWidth: '90%',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
    lineHeight: 17,
  },
})
