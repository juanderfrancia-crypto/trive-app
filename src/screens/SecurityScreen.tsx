import { useState, useEffect } from 'react'
import { View, TouchableOpacity, Switch, StyleSheet, ScrollView, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  authenticateBiometric,
  getStoredBiometricEnabled,
  setStoredBiometricEnabled,
} from '../services/biometricAuth'

// Fuera del componente: sobrevive a que la pantalla se desmonte y remonte al
// navegar fuera y volver, para no repetir el chequeo de hardware/SecureStore
// (y el parpadeo del switch en su valor por defecto) cada vez que se entra.
// Se reinicia solo con un reload completo de la app, o si cambia la cuenta
// activa — el bloqueo es por cuenta, no por dispositivo.
let biometricStatusCache: { userId: string; available: boolean; enabled: boolean } | null = null

export default function SecurityScreen() {
  const navigation = useNavigation()
  const userId = useAppStore((s) => s.user?.id)
  const cached = biometricStatusCache?.userId === userId ? biometricStatusCache : null
  const [biometricAvailable, setBiometricAvailable] = useState(cached?.available ?? false)
  const [biometricEnabled, setBiometricEnabled] = useState(cached?.enabled ?? false)
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const supported = await isBiometricSupported()
      const enrolled = supported && (await isBiometricEnrolled())
      const enabled = enrolled ? await getStoredBiometricEnabled(userId) : false
      biometricStatusCache = { userId, available: enrolled, enabled }
      setBiometricAvailable(enrolled)
      setBiometricEnabled(enabled)
    })()
  }, [userId])

  useEffect(() => {
    ;(async () => {
      // Casi todas las cuentas se registran por teléfono+OTP y nunca tienen
      // contraseña — "Cambiar/Recuperar contraseña" solo aplica a las pocas
      // cuentas viejas de correo+contraseña (ej. admin1@trive.com). No se
      // puede inferir por si la cuenta tiene una identidad de tipo "email":
      // configurar un correo de recuperación también crea esa identidad sin
      // que exista ninguna contraseña real, así que se chequea directo en
      // el servidor si de verdad hay una contraseña guardada.
      const { data } = await supabase.rpc('has_password_auth')
      setHasPasswordAuth(data ?? false)
    })()
  }, [])

  const handleBiometric = async (value: boolean) => {
    if (!userId) return
    if (value) {
      // Confirma que la huella/rostro enrolado funciona de verdad antes de
      // activarlo — si no, el bloqueo que vamos a mostrar luego nunca dejaría
      // entrar a nadie.
      const success = await authenticateBiometric()
      if (!success) return
    }
    await setStoredBiometricEnabled(userId, value)
    biometricStatusCache = { userId, available: biometricAvailable, enabled: value }
    setBiometricEnabled(value)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Seguridad</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Illustration name="mobileEncryption" width={170} />
        </View>

        <Section title="Acceso">
          {biometricAvailable && (
            <>
              <Row
                icon="Fingerprint"
                title="Acceso biométrico"
                sub="Bloquea Trive con tu huella o rostro al abrirla"
                trailing={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometric}
                    trackColor={{ true: COLORS.primary }}
                  />
                }
              />
              <Divider />
            </>
          )}
          {hasPasswordAuth && (
            <>
              <Row
                icon="Lock"
                title="Cambiar contraseña"
                sub="Actualiza tu contraseña"
                onPress={() => navigation.navigate('ChangePassword' as never)}
              />
              <Divider />
              <Row
                icon="Mail"
                title="Recuperar contraseña"
                sub="Te enviamos un enlace a tu correo"
                onPress={() => navigation.navigate('RecoveryAccount' as never)}
              />
              <Divider />
            </>
          )}
          <Row
            icon="ShieldCheck"
            title="Correo de recuperación"
            sub="Recupera tu cuenta si pierdes tu número"
            onPress={() => navigation.navigate('RecoveryEmail' as never)}
          />
        </Section>

        <Section title="Sesiones">
          <Row
            icon="Smartphone"
            title="Dispositivos conectados"
            sub="Sesiones activas en tu cuenta"
            onPress={() => navigation.navigate('SessionHistory' as never)}
          />
        </Section>

        <Section title="Monitoreo">
          <Row
            icon="Clock"
            title="Actividad reciente"
            sub="Últimos inicios de sesión y cambios"
            onPress={() => navigation.navigate('RecentActivity' as never)}
          />
        </Section>

        <Text style={styles.footer}>
          Si notas actividad sospechosa, cambia tu contraseña de inmediato.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  )
}

function Row({ icon, title, sub, onPress, trailing }: {
  icon: IconName
  title: string
  sub: string
  onPress?: () => void
  trailing?: React.ReactNode
}) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {trailing ?? <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />}
    </>
  )

  if (!onPress) return <View style={styles.row}>{content}</View>
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {content}
    </TouchableOpacity>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
    marginBottom: SPACING.md,
  },

  section: { marginTop: SPACING.lg },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  group: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  rowSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },

  footer: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
})
