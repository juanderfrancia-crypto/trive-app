import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Text } from '../components/AppText'
import Icon from '../components/Icon'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface Props {
  authenticating: boolean
  onRetry: () => void
}

export default function BiometricLockScreen({ authenticating, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />

      <View style={styles.iconCircle}>
        <Icon name="Fingerprint" size={32} color={COLORS.primary} />
      </View>

      <Text style={styles.title}>Trive está bloqueada</Text>
      <Text style={styles.subtitle}>Usa tu huella o rostro para continuar</Text>

      <TouchableOpacity
        style={[styles.button, authenticating && styles.buttonDisabled]}
        onPress={onRetry}
        disabled={authenticating}
        activeOpacity={0.85}
      >
        {authenticating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>Desbloquear</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  logo: { width: 120, height: 120, marginBottom: SPACING.xl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  button: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
})
