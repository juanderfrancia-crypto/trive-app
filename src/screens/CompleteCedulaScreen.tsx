import { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store/useAppStore'
import { saveMyProfile } from '../services/profileColumns'
import { checkDeviceVerification } from '../services/deviceVerification'
import { showError } from '../utils/showError'

export default function CompleteCedulaScreen() {
  const { logout } = useAuth()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const [cedula, setCedula] = useState('')
  const [busy, setBusy] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const handleSave = async () => {
    const digits = cedula.replace(/[^\d]/g, '')
    if (!/^\d{6,10}$/.test(digits)) {
      setInlineError('Ingresa un número de cédula válido (6 a 10 dígitos)')
      return
    }
    if (!user) return
    setInlineError(null)
    try {
      setBusy(true)
      const { error } = await saveMyProfile(user.id, { cedula: digits })
      if (error) {
        const msg = String((error as any)?.message ?? '')
        if (/unique|duplicate/i.test(msg)) {
          setInlineError('Esta cédula ya está registrada en otra cuenta de Trive.')
        } else {
          showError('No pudimos guardar tu cédula. Intenta de nuevo.')
        }
        return
      }
      setUser({ ...user, cedula: digits })
      await checkDeviceVerification(digits)
    } catch (err: any) {
      showError(err?.message || 'No pudimos guardar tu cédula. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingScreen>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

          <View style={styles.iconCircle}>
            <Icon name="CreditCard" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.heading}>Confirma tu cédula</Text>
          <Text style={styles.body}>
            La necesitamos para verificar tu identidad y proteger tu cuenta. Es un paso único, no te lo volveremos a pedir.
          </Text>

          <Text style={styles.label}>Número de cédula</Text>
          <View style={[styles.input, inlineError && styles.inputError]}>
            <Icon name="CreditCard" size={18} color={COLORS.primary} />
            <TextInput
              style={styles.inputText}
              placeholder="Ej: 1012345678"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              value={cedula}
              onChangeText={(t) => { setCedula(t.replace(/[^\d]/g, '')); setInlineError(null) }}
              editable={!busy}
              maxLength={10}
              autoFocus
            />
          </View>
          {!!inlineError && <Text style={styles.error}>{inlineError}</Text>}

          <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={handleSave} disabled={busy} activeOpacity={0.88}>
            <LinearGradient colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Continuar</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutRow} onPress={() => logout()} disabled={busy}>
            <Text style={styles.logoutText}>Usar otra cuenta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl, paddingTop: SPACING.lg },
  logo: { width: 180, height: 82, alignSelf: 'center', marginBottom: SPACING.lg },
  iconCircle: {
    ...SHADOWS.sm,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  heading: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },
  body: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  label: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 58,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  inputError: { borderColor: COLORS.error },
  inputText: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.textPrimary, fontWeight: '600' },
  error: { ...TYPOGRAPHY.caption, color: COLORS.error, marginBottom: SPACING.md },
  btn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
  logoutRow: { alignItems: 'center', marginTop: SPACING.xxl },
  logoutText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, textDecorationLine: 'underline' },
})
