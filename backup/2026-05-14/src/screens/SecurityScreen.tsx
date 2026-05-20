import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import {
  authenticateBiometric,
  getStoredBiometricEnabled,
  isBiometricEnrolled,
  isBiometricSupported,
  setStoredBiometricEnabled,
} from '../services/biometricAuth'

export default function SecurityScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(true)

  useEffect(() => {
    const loadBiometricState = async () => {
      const supported = await isBiometricSupported()
      setBiometricAvailable(supported)
      if (!supported) {
        setBiometricEnabled(false)
        return
      }

      const enabled = await getStoredBiometricEnabled()
      setBiometricEnabled(enabled)
    }

    loadBiometricState()
  }, [])

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword' as never)
  }

  const handle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled)
    Alert.alert(
      'Autenticación de Dos Factores',
      twoFactorEnabled
        ? 'Autenticación de dos factores desactivada'
        : 'Autenticación de dos factores activada. Recibirás un código cada vez que inicies sesión.'
    )
  }

  const handleBiometric = async () => {
    if (biometricEnabled) {
      setBiometricEnabled(false)
      await setStoredBiometricEnabled(false)
      Alert.alert('Autenticación Biométrica', 'Autenticación biométrica desactivada')
      return
    }

    const supported = await isBiometricSupported()
    if (!supported) {
      Alert.alert(
        'Autenticación Biométrica',
        'Tu dispositivo no soporta autenticación biométrica o no tiene sensores configurados.'
      )
      return
    }

    const enrolled = await isBiometricEnrolled()
    if (!enrolled) {
      Alert.alert(
        'Autenticación Biométrica',
        'No hay datos biométricos registrados. Configura tu huella o reconocimiento facial en el dispositivo.'
      )
      return
    }

    const success = await authenticateBiometric()
    if (success) {
      setBiometricEnabled(true)
      await setStoredBiometricEnabled(true)
      Alert.alert('Autenticación Biométrica', 'Autenticación biométrica activada correctamente.')
    } else {
      Alert.alert('Autenticación Biométrica', 'No se pudo verificar tu identidad. Intenta de nuevo.')
    }
  }

  const handleSessionHistory = () => {
    navigation.navigate('SessionHistory' as never)
  }

  const handleRecoveryAccount = () => {
    navigation.navigate('RecoveryAccount' as never)
  }

  const handleRecentActivity = () => {
    navigation.navigate('RecentActivity' as never)
  }

  const handleBlockAccount = () => {
    Alert.alert(
      'Bloquear Cuenta',
      '¿Estás seguro de que deseas bloquear tu cuenta temporalmente? No podrás acceder hasta desbloquearlo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cuenta Bloqueada', 'Tu cuenta ha sido bloqueada temporalmente.')
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Seguridad</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 1. Cambiar Contraseña */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleChangePassword}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Cambiar Contraseña</Text>
                <Text style={styles.menuSubtext}>Actualiza tu contraseña regularmente</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* 2. Verificación de Dos Factores */}
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Autenticación de Dos Factores</Text>
                <Text style={styles.menuSubtext}>Protección adicional en tu cuenta</Text>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handle2FA}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={twoFactorEnabled ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>

          {/* Biometric Authentication */}
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="finger-print-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Autenticación Biométrica</Text>
                <Text style={styles.menuSubtext}>Huella digital o reconocimiento facial</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometric}
                disabled={!biometricAvailable}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={biometricEnabled ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* 3. Historial de Sesiones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesiones</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSessionHistory}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Dispositivos Conectados</Text>
                <Text style={styles.menuSubtext}>Ver sesiones activas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Recuperación de Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recuperación</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRecoveryAccount}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Correo de Recuperación</Text>
                <Text style={styles.menuSubtext}>para recuperar tu cuenta</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Actividad Reciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitoreo</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRecentActivity}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Actividad Reciente</Text>
                <Text style={styles.menuSubtext}>Últimos inicios de sesión</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Bloqueo Temporal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.dangerItem]}
              onPress={handleBlockAccount}
            >
              <View style={[styles.menuIcon, styles.dangerIcon]}>
                <Ionicons name="lock-open-outline" size={20} color={COLORS.error} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, styles.dangerText]}>Bloquear Cuenta</Text>
                <Text style={[styles.menuSubtext, styles.dangerSubtext]}>Deshabilitar acceso temporal</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Si experimentas actividad sospechosa, cambia tu contraseña inmediatamente
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },

  // Menu Card
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  menuSubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Danger State
  dangerItem: {
    backgroundColor: COLORS.error + '05',
  },
  dangerIcon: {
    backgroundColor: COLORS.error + '15',
  },
  dangerText: {
    color: COLORS.error,
  },
  dangerSubtext: {
    color: COLORS.error + 'CC',
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
