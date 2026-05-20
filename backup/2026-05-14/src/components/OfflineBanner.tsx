import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/theme'
import NetInfo from '@react-native-community/netinfo'

export default function OfflineBanner() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setVisible(!state.isConnected)
    })
    return () => unsubscribe()
  }, [])

  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.text}>Sin conexión a internet</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...TYPOGRAPHY.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
