import { View, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { COLORS } from '../theme/colors'

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
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: '70%',
    height: '40%',
  },
  spinner: {
    position: 'absolute',
    bottom: 60,
  },
})
