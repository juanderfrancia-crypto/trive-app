import { View, StyleSheet } from 'react-native'
import { Text } from './AppText'
import { COLORS, SPACING } from '../theme/theme'
import Illustration from './illustrations/Illustration'

// Pantalla de mantenimiento: se activa a distancia desde Firebase Remote Config
// (maintenance_mode=true) sin necesitar una versión nueva en Play Store.
export default function MaintenanceScreen({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Illustration name="warning" width={180} />
      <Text style={styles.title}>Volvemos enseguida</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
