import { useEffect, useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { showError } from '../utils/showError'

const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('57') ? `+${digits}` : `+57${digits}`
}

export default function VerifyPhoneScreen() {
  const { logout } = useAuth()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '').replace(/^57/, '')
    if (digits.length !== 10) {
      setInlineError('Ingresa un celular colombiano de 10 dígitos')
      return
    }
    setInlineError(null)
    try {
      setBusy(true)
      const { error } = await supabase.auth.updateUser({ phone: toE164(phone) })
      if (error) throw error
      setStep('code')
      setResendIn(60)
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      if (/already|registered|exists|taken/i.test(msg)) {
        setInlineError('Este celular ya está asociado a otra cuenta de Trive.')
      } else if (/rate|too many|limit/i.test(msg)) {
        setInlineError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else {
        showError(msg || 'No pudimos enviar el código. Intenta de nuevo.')
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
        phone: toE164(phone),
        token: value,
        type: 'phone_change',
      })
      if (error) throw error
      await supabase.auth.refreshSession()
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
      <KeyboardAvoidingScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.iconCircle}>
          <Icon name={step === 'phone' ? 'Smartphone' : 'MessageCircle'} size={28} color={COLORS.primary} />
        </View>

        {step === 'phone' ? (
          <>
            <Text style={styles.heading}>Verifica tu celular</Text>
            <Text style={styles.body}>
              Tu número confirma tu identidad. Cada persona puede tener una sola cuenta en Trive, así que lo usamos para proteger a toda la comunidad.
            </Text>

            <Text style={styles.label}>Número de celular</Text>
            <View style={[styles.input, inlineError && styles.inputError]}>
              <Icon name="Phone" size={18} color={COLORS.primary} />
              <Text style={styles.prefix}>+57</Text>
              <TextInput
                style={styles.inputText}
                placeholder="300 000 0000"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => { setPhone(t); setInlineError(null) }}
                editable={!busy}
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
              Enviamos un código de 6 dígitos al <Text style={styles.bodyStrong}>+57 {phone.replace(/\D/g, '').replace(/^57/, '')}</Text>.
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

            <TouchableOpacity style={styles.linkRow} onPress={() => { setStep('phone'); setCode(''); setInlineError(null) }} disabled={busy}>
              <Icon name="ArrowLeft" size={14} color={COLORS.primary} />
              <Text style={styles.linkText}>Cambiar número</Text>
            </TouchableOpacity>
          </>
        )}

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
  prefix: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
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
  error: { ...TYPOGRAPHY.caption, color: COLORS.error, marginBottom: SPACING.md },
  btn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.lg },
  linkText: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '700' },
  linkTextDisabled: { color: COLORS.textTertiary },
  logoutRow: { alignItems: 'center', marginTop: SPACING.xxl },
  logoutText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, textDecorationLine: 'underline' },
})
