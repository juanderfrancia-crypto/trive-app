import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { COLORS } from '../theme/theme'

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  // Mismo ícono y mismo "imageWidth" del splash nativo (app.json), para que el
  // paso del splash nativo a esta pantalla sea invisible (sin salto de imagen).
  logo: {
    width: 180,
    height: 180,
  },
  spinner: {
    position: 'absolute',
    bottom: 60,
  },
})
