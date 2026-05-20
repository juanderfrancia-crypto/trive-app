import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../theme/theme'

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle' as const, color: '#10B981', defaultTitle: 'Listo' },
  error:   { icon: 'close-circle'      as const, color: '#EF4444', defaultTitle: 'Error' },
  warning: { icon: 'warning'           as const, color: '#F59E0B', defaultTitle: 'Atención' },
  info:    { icon: 'information-circle' as const, color: COLORS.primary, defaultTitle: 'Info' },
}

function TriveToast({ text1, text2, hide, type = 'info' }: {
  text1?: string; text2?: string; hide: () => void; type?: string
}) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
  return (
    <View style={styles.container}>
      <View style={[styles.accent, { backgroundColor: cfg.color }]} />
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{text1 ?? cfg.defaultTitle}</Text>
        {!!text2 && <Text style={styles.message} numberOfLines={3}>{text2}</Text>}
      </View>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={hide}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={16} color="#9CA3AF" />
      </TouchableOpacity>
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
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 14,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
})
