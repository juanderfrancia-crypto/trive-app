import { COLORS, RADIUS } from '../theme/theme'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from './AppText'
import Icon from './Icon'

// Franja oscura flotante -- mismo patrón que WhatsApp y las notificaciones
// nativas de iOS/Android, decidido 23-nov-2026. El color del estado solo
// vive en el chip del ícono, nunca en el fondo (que siempre es oscuro).
const TYPE_CONFIG = {
  success: { icon: 'CircleCheck' as const, color: COLORS.success },
  error:   { icon: 'CircleX'     as const, color: COLORS.error },
  warning: { icon: 'TriangleAlert' as const, color: COLORS.warningDark },
  info:    { icon: 'Info'        as const, color: COLORS.primary },
}

function TriveToast({ text1, text2, type = 'info' }: {
  text1?: string; text2?: string; hide: () => void; type?: string
}) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
  return (
    <View style={styles.container}>
      <View style={[styles.iconChip, { backgroundColor: cfg.color }]}>
        <Icon name={cfg.icon} size={13} color={COLORS.white} />
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
    gap: 10,
    backgroundColor: COLORS.statusDark,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.statusDarkText,
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 11.5,
    color: COLORS.statusDarkTextSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
})
