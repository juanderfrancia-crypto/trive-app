import { useEffect, useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'
import { useBruteForceGuard } from '../hooks/useBruteForceGuard'

export default function AccountRecoveryScreen() {
  const navigation = useNavigation()
  const setJustRecoveredAccount = useAppStore((s) => s.setJustRecoveredAccount)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const guard = useBruteForceGuard()

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const sendCode = async () => {
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setInlineError('Ingresa un correo válido')
      return
    }
    setInlineError(null)
    try {
      setBusy(true)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      setStep('code')
      setResendIn(60)
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      if (/not.*found|invalid|unable|signups not allowed/i.test(msg)) {
        setInlineError('No encontramos ninguna cuenta con ese correo de recuperación.')
      } else if (/rate|too many|limit/i.test(msg)) {
        setInlineError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else {
        setInlineError('No pudimos enviar el código. Intenta de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (value: string) => {
    if (value.length !== 6 || guard.isLocked) return
    try {
      setBusy(true)
      setInlineError(null)
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: value,
        type: 'email',
      })
      if (error) throw error
      guard.recordSuccess()
      // VerifyPhoneScreen se encarga de pedir el número nuevo apenas AppNavigator
      // detecte esta bandera -- la cuenta ya quedó autenticada con este correo.
      setJustRecoveredAccount(true)
    } catch (err: any) {
      guard.recordFailure()
      setInlineError('El código es inválido o expiró. Solicita uno nuevo.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingScreen>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} disabled={busy}>
            <Icon name="ArrowLeft" size={13} color={COLORS.textTertiary} />
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>

          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

          <View style={styles.iconCircle}>
            <Icon name={step === 'email' ? 'Mail' : 'ShieldCheck'} size={28} color={COLORS.primary} />
          </View>

          {step === 'email' ? (
            <>
              <Text style={styles.heading}>Recupera tu cuenta</Text>
              <Text style={styles.body}>
                Ingresa el correo de recuperación que configuraste en tu cuenta. Te enviaremos un código para confirmar tu identidad.
              </Text>

              <Text style={styles.label}>Correo de recuperación</Text>
              <View style={[styles.input, inlineError && styles.inputError]}>
                <Icon name="Mail" size={18} color={COLORS.primary} />
                <TextInput
                  style={styles.inputText}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setInlineError(null) }}
                  editable={!busy}
                  autoFocus
                />
              </View>
              {!!inlineError && <Text style={styles.error}>{inlineError}</Text>}

              <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={sendCode} disabled={busy} activeOpacity={0.88}>
                <LinearGradient colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
                  {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Enviar código</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.heading}>Ingresa el código</Text>
              <Text style={styles.body}>
                Enviamos un código de 6 dígitos a <Text style={styles.bodyStrong}>{email.trim()}</Text>.
              </Text>

              <TextInput
                style={[styles.codeInput, inlineError && styles.inputError]}
                value={code}
                onChangeText={(t) => {
                  const clean = t.replace(/\D/g, '').slice(0, 6)
                  setCode(clean)
                  setInlineError(null)
                  if (clean.length === 6) verifyCode(clean)
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={COLORS.textTertiary}
                editable={!busy && !guard.isLocked}
                autoFocus
                textAlign="center"
              />
              {!!inlineError && <Text style={styles.error}>{inlineError}</Text>}
              {guard.isLocked && <Text style={styles.error}>Demasiados intentos. Espera {guard.formatCountdown()}</Text>}
              {busy && <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />}

              <TouchableOpacity style={styles.linkRow} onPress={sendCode} disabled={busy || resendIn > 0}>
                <Text style={[styles.linkText, resendIn > 0 && styles.linkTextDisabled]}>
                  {resendIn > 0 ? `Reenviar código en ${resendIn}s` : 'Reenviar código'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={() => { setStep('email'); setCode(''); setInlineError(null) }} disabled={busy}>
                <Icon name="ArrowLeft" size={14} color={COLORS.primary} />
                <Text style={styles.linkText}>Cambiar correo</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl, paddingTop: SPACING.lg },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.lg },
  backLinkText: { fontSize: 12, color: COLORS.textTertiary },
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
  bodyStrong: { fontWeight: '700', color: COLORS.textPrimary },
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
  codeInput: {
    height: 64,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  error: { ...TYPOGRAPHY.caption, color: COLORS.error, marginBottom: SPACING.md, textAlign: 'center' },
  btn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: SPACING.lg },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  linkTextDisabled: { color: COLORS.textTertiary },
})
