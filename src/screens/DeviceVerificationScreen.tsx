import { useEffect, useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { getDeviceId } from '../services/userSessions'
import { showError } from '../utils/showError'

export default function DeviceVerificationScreen() {
  const { logout } = useAuth()
  const setDeviceVerificationStatus = useAppStore((s) => s.setDeviceVerificationStatus)
  const [last4, setLast4] = useState('')
  const [busy, setBusy] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!lockedUntil) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  const remainingSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil.getTime() - now) / 1000)) : 0
  const isLocked = remainingSeconds > 0

  const handleVerify = async () => {
    if (isLocked) return
    if (last4.length !== 4) {
      setInlineError('Ingresa los últimos 4 dígitos de tu cédula')
      return
    }
    setInlineError(null)
    try {
      setBusy(true)
      const deviceId = await getDeviceId()
      const { data, error } = await supabase.rpc('verify_cedula_last4_and_register_device', {
        p_last4: last4,
        p_device_id: deviceId,
      })
      if (error) { showError('No pudimos verificar tu identidad. Intenta de nuevo.'); return }

      const result = data as { ok: boolean; locked_until?: string } | null
      if (result?.ok) {
        setDeviceVerificationStatus('recognized')
        return
      }
      if (result?.locked_until) {
        setLockedUntil(new Date(result.locked_until))
        setInlineError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else {
        setInlineError('Los dígitos no coinciden. Intenta de nuevo.')
      }
      setLast4('')
    } catch (err: any) {
      showError(err?.message || 'No pudimos verificar tu identidad. Intenta de nuevo.')
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
            <Icon name="ShieldCheck" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.heading}>Confirma que eres tú</Text>
          <Text style={styles.body}>
            Entraste desde un dispositivo que no reconocemos para esta cuenta. Ingresa los últimos 4 dígitos de tu cédula para confirmar tu identidad.
          </Text>

          <Text style={styles.label}>Últimos 4 dígitos de tu cédula</Text>
          <TextInput
            style={[styles.codeInput, inlineError && styles.inputError]}
            value={last4}
            onChangeText={(t) => {
              const clean = t.replace(/\D/g, '').slice(0, 4)
              setLast4(clean)
              setInlineError(null)
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={COLORS.textTertiary}
            editable={!busy && !isLocked}
            autoFocus
            textAlign="center"
          />
          {!!inlineError && <Text style={styles.error}>{inlineError}</Text>}
          {isLocked && <Text style={styles.error}>Intenta de nuevo en {remainingSeconds}s</Text>}

          <TouchableOpacity
            style={[styles.btn, (busy || isLocked) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={busy || isLocked}
            activeOpacity={0.88}
          >
            <LinearGradient colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Confirmar</Text>}
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
  label: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginBottom: SPACING.sm, textAlign: 'center' },
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
  inputError: { borderColor: COLORS.error },
  error: { ...TYPOGRAPHY.caption, color: COLORS.error, marginBottom: SPACING.md, textAlign: 'center' },
  btn: { ...SHADOWS.xs, shadowColor: COLORS.primary, shadowOpacity: 0.3, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
  logoutRow: { alignItems: 'center', marginTop: SPACING.xxl },
  logoutText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, textDecorationLine: 'underline' },
})
