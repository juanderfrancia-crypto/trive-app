import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { COLORS } from '../theme/theme'

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
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
  // Mismo ancho que "imageWidth" del splash nativo (app.json), para que no se note
  // el cambio de tamaño cuando el splash nativo entrega el control a esta pantalla.
  logo: {
    width: 220,
    height: 220 * (385 / 1300),
  },
  spinner: {
    position: 'absolute',
    bottom: 60,
  },
})
