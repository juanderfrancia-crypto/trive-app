import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../theme/colors'

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Image 
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 40,
  },
  spinner: {
    marginTop: 20,
  },
})
