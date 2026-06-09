import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle' as const, color: '#34D399' },
  error:   { icon: 'close-circle'     as const, color: '#F87171' },
  warning: { icon: 'warning'          as const, color: '#FBBF24' },
  info:    { icon: 'information-circle' as const, color: '#60A5FA' },
}

function TriveToast({ text1, text2, type = 'info' }: {
  text1?: string; text2?: string; hide: () => void; type?: string
}) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
  return (
    <View style={styles.container}>
      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
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
    backgroundColor: '#111827',
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
    color: '#F9FAFB',
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
    lineHeight: 17,
  },
})
