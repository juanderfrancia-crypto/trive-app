import { useEffect, useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { supabase } from '../services/supabase'

export default function RecoveryEmailScreen() {
  const navigation = useNavigation()
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [step, setStep] = useState<'view' | 'input' | 'otp'>('view')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? null)
      setLoadingCurrent(false)
    })
  }, [])

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
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) throw error
      setStep('otp')
      setResendIn(60)
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      if (/already|registered|exists|taken/i.test(msg)) {
        setInlineError('Este correo ya está en uso en otra cuenta de Trive.')
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
    if (value.length !== 6) return
    try {
      setBusy(true)
      setInlineError(null)
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: value,
        type: 'email_change',
      })
      if (error) throw error
      setCurrentEmail(email.trim())
      setStep('view')
      Alert.alert('Listo', 'Tu correo de recuperación quedó configurado.')
    } catch (err: any) {
      setInlineError('El código es inválido o expiró. Solicita uno nuevo.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Correo de recuperación</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <KeyboardAvoidingScreen>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {loadingCurrent ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
          ) : step === 'view' ? (
            <>
              <Text style={styles.body}>
                Si pierdes acceso a tu número de celular, puedes usar este correo para recuperar tu cuenta sin depender de tu teléfono.
              </Text>

              {currentEmail ? (
                <View style={styles.currentCard}>
                  <Icon name="CircleCheck" size={20} color={COLORS.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentLabel}>Correo configurado</Text>
                    <Text style={styles.currentValue}>{currentEmail}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="Mail" size={20} color={COLORS.textTertiary} />
                  <Text style={styles.emptyText}>Todavía no tienes un correo de recuperación configurado.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn]}
                onPress={() => { setStep('input'); setEmail(currentEmail ?? ''); setInlineError(null) }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
                  <Text style={styles.btnText}>{currentEmail ? 'Cambiar correo' : 'Agregar correo de recuperación'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : step === 'input' ? (
            <>
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
                editable={!busy}
                autoFocus
                textAlign="center"
              />
              {!!inlineError && <Text style={styles.error}>{inlineError}</Text>}
              {busy && <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />}

              <TouchableOpacity style={styles.linkRow} onPress={sendCode} disabled={busy || resendIn > 0}>
                <Text style={[styles.linkText, resendIn > 0 && styles.linkTextDisabled]}>
                  {resendIn > 0 ? `Reenviar código en ${resendIn}s` : 'Reenviar código'}
                </Text>
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

  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl, paddingTop: SPACING.sm },
  body: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.xl },
  bodyStrong: { fontWeight: '700', color: COLORS.textPrimary },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  currentLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  currentValue: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  emptyText: { flex: 1, ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },

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
    marginTop: SPACING.md,
  },
  error: { ...TYPOGRAPHY.caption, color: COLORS.error, marginBottom: SPACING.md },
  btn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
  linkRow: { alignItems: 'center', marginTop: SPACING.lg },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  linkTextDisabled: { color: COLORS.textTertiary },
})
