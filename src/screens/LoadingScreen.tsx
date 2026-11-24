import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { Text } from '../components/AppText'
import { COLORS } from '../theme/theme'

type Props = {
  // Sin esto, un arranque sin señal (modo avión, zona sin cobertura) se veía
  // igual que un arranque lento cualquiera -- solo el ícono y el spinner,
  // sin ninguna pista de que el problema es la red. 8 segundos mudo se
  // siente como que la app está colgada, no que falta señal (24-nov-2026).
  offline?: boolean
}

export default function LoadingScreen({ offline = false }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.bottomBlock}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        {offline && (
          <Text style={styles.offlineText}>Sin conexión a internet. Esperando señal…</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  // Mismo ícono y mismo "imageWidth" del splash nativo (app.json), para que el
  // paso del splash nativo a esta pantalla sea invisible (sin salto de imagen).
  logo: {
    width: 180,
    height: 180,
  },
  bottomBlock: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  offlineText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
