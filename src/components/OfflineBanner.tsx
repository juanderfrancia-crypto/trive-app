import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './AppText'
import { COLORS, RADIUS } from '../theme/theme'
import NetInfo from '@react-native-community/netinfo'
import Icon from './Icon'

// Misma identidad visual que TriveToast/AppAlert (franja oscura + chip de
// ícono) pero persistente mientras no haya red, no transitoria -- antes era
// una barra roja sólida sin relación con el resto de alertas de la app
// (24-nov-2026). Vive una sola vez en App.tsx, global para toda la app.
export default function OfflineBanner() {
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setVisible(state.isConnected === false)
    })
    return () => unsubscribe()
  }, [])

  if (!visible) return null

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="none">
      <View style={styles.pill}>
        <View style={styles.iconChip}>
          <Icon name="CloudOff" size={13} color={COLORS.white} />
        </View>
        <Text style={styles.text}>Sin conexión a internet</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pill: {
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
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.statusDarkText,
    letterSpacing: -0.1,
  },
})
