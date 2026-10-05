import { COLORS } from '../theme/theme'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from './AppText'
import Icon from './Icon'

const TYPE_CONFIG = {
  success: { icon: 'CircleCheck' as const, color: COLORS.success },
  error:   { icon: 'CircleX'     as const, color: COLORS.error },
  warning: { icon: 'TriangleAlert'          as const, color: COLORS.warning },
  info:    { icon: 'Info' as const, color: COLORS.primary },
}

function TriveToast({ text1, text2, type = 'info' }: {
  text1?: string; text2?: string; hide: () => void; type?: string
}) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
  return (
    <View style={styles.container}>
      <Icon name={cfg.icon} size={18} color={cfg.color} />
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
    backgroundColor: COLORS.textPrimary,
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  body: {
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surfaceAlt,
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 1,
    lineHeight: 17,
  },
})
