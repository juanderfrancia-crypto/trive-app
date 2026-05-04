import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { logLogin } from '../services/activityLogger'
import OfflineBanner from '../components/OfflineBanner'
import Toast from '../components/Toast'

type Method = 'phone' | 'email'
type Step = 'input' | 'otp'

export default function LoginPhoneScreen() {
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { signInWithOTP, verifyOTP, login, loading: authLoading } = useAuth()

  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('input')

  // Phone fields
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  // Email fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const switchMethod = (m: Method) => {
    setMethod(m)
    setStep('input')
    setErrors({})
    setOtp('')
  }

  // ─── Phone flow ───────────────────────────────────────────────────────────

  const validatePhone = () => {
    if (!phone.trim()) return setErrors({ phone: 'El número telefónico es requerido' }), false
    if (!/^\d{7,}$/.test(phone.replace(/[^\d]/g, '')))
      return setErrors({ phone: 'Ingresa un número válido (mínimo 7 dígitos)' }), false
    setErrors({})
    return true
  }

  const validateOTP = () => {
    if (!otp.trim()) return setErrors({ otp: 'El código OTP es requerido' }), false
    if (otp.length < 6) return setErrors({ otp: 'El código debe tener 6 dígitos' }), false
    setErrors({})
    return true
  }

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '')
    return digits.startsWith('57') ? `+${digits}` : `+57${digits}`
  }

  const handleSendOTP = async () => {
    if (!validatePhone()) return
    try {
      setIsSubmitting(true)
      await signInWithOTP(formatPhone(phone))
      setStep('otp')
      showToast(`Código enviado al +57 ${phone.replace(/[^\d]/g, '')}. Válido por 10 minutos.`, 'success')
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'otp_send_network' })
      } else if (err.message?.includes('rate')) {
        errorHandler.handle('Demasiados intentos. Por favor espera unos minutos.', ErrorType.VALIDATION, ErrorSeverity.MEDIUM, true, { context: 'otp_rate_limit' })
      } else {
        errorHandler.handle(err, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM, true, { context: 'otp_send_error', phone })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return
    try {
      setIsSubmitting(true)
      const data = await verifyOTP(formatPhone(phone), otp)
      if (data?.user) {
        const { data: profile, error: fetchError } = await (await import('../services/supabase')).supabase
          .from('profiles').select('*').eq('id', data.user.id).maybeSingle()

        if (fetchError && fetchError.code !== 'PGRST116') {
          errorHandler.handleSupabaseError(fetchError, 'fetch_profile_phone', { userId: data.user.id })
          return
        }

        if (profile) {
          setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role, rating: profile.rating, balance: profile.balance || 0, membership_type: profile.membership_type || 'free', membership_expiry: profile.membership_expiry })
        } else {
          const userEmail = data.user.email || `${formatPhone(phone)}@sms.local`
          const { data: insertedProfile, error: insertError } = await (await import('../services/supabase')).supabase
            .from('profiles').insert([{ id: data.user.id, name: data.user.user_metadata?.full_name || 'Usuario', email: userEmail, phone: formatPhone(phone), role: 'passenger' }]).select().single()

          if (insertError) { errorHandler.handleSupabaseError(insertError, 'create_profile_phone', { phone }); return }
          setUser({ id: insertedProfile.id, name: insertedProfile.name, email: insertedProfile.email, phone: insertedProfile.phone, role: insertedProfile.role, rating: insertedProfile.rating || 0, balance: insertedProfile.balance || 0, membership_type: insertedProfile.membership_type || 'free', membership_expiry: insertedProfile.membership_expiry || null })
        }
        setAuthUser(data.user)
        await logLogin(data.user.id)
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'otp_verify_network' })
      } else if (err.message?.includes('invalid') || err.message?.includes('expired')) {
        errorHandler.handle('El código OTP es inválido o expiró. Por favor solicita uno nuevo.', ErrorType.VALIDATION, ErrorSeverity.MEDIUM, true, { context: 'otp_invalid' })
      } else {
        errorHandler.handle(err, ErrorType.AUTH, ErrorSeverity.MEDIUM, true, { context: 'otp_verify_error', phone })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Email flow ───────────────────────────────────────────────────────────

  const validateEmail = () => {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'El correo es requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Ingresa un correo válido'
    if (!password) errs.password = 'La contraseña es requerida'
    else if (password.length < 6) errs.password = 'La contraseña debe tener al menos 6 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleEmailLogin = async () => {
    if (!validateEmail()) return
    try {
      setIsSubmitting(true)
      const data = (await login(email.trim(), password)) as any
      if (data?.user) {
        const { data: profile, error: profileError } = await (await import('../services/supabase')).supabase
          .from('profiles').select('*').eq('id', data.user.id).single()

        if (profileError) { errorHandler.handleSupabaseError(profileError, 'fetch_profile', { userId: data.user.id }); return }
        if (profile) setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role, rating: profile.rating, balance: profile.balance || 0, membership_type: profile.membership_type || 'free', membership_expiry: profile.membership_expiry })
        setAuthUser(data.user)
        await logLogin(data.user.id)
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'login' })
      } else if (err.message?.includes('Invalid') || err.message?.includes('credentials')) {
        errorHandler.handle('Correo o contraseña incorrectos', ErrorType.AUTH, ErrorSeverity.MEDIUM, true, { email, context: 'login' })
      } else {
        errorHandler.handle(err, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM, true, { context: 'login' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bg} />

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.header}>
            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={s.subtitle}>Ingresa tu número para continuar</Text>
          </View>

          {/* Card */}
          <View style={s.card}>

            {/* ── OTP step ── */}
            {step === 'otp' ? (
              <>
                <View style={s.otpInfoCard}>
                  <View style={s.otpIconWrap}>
                    <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                  </View>
                  <Text style={s.otpTitle}>Código enviado</Text>
                  <Text style={s.otpSubtitle}>Ingresa el código de 6 dígitos que recibiste en</Text>
                  <View style={s.phonePill}>
                    <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                    <Text style={s.phonePillText}>+57 {phone.replace(/[^\d]/g, '')}</Text>
                  </View>
                  <TouchableOpacity style={s.changePhoneBtn} onPress={() => { setStep('input'); setOtp(''); setErrors({}) }}>
                    <Ionicons name="arrow-back" size={15} color={COLORS.primary} />
                    <Text style={s.changePhoneText}>Cambiar número</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.inputWrap}>
                  <View style={[s.inputRow, errors.otp && s.inputErr]}>
                    <Ionicons name="lock-closed-outline" size={20} color={errors.otp ? COLORS.error : COLORS.textSecondary} />
                    <TextInput
                      style={s.input}
                      placeholder="● ● ● ● ● ●"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(t) => { setOtp(t); if (errors.otp) setErrors({}) }}
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.otp && <Text style={s.errText}>{errors.otp}</Text>}
                </View>

                <TouchableOpacity style={[s.btn, isSubmitting && s.btnDisabled]} onPress={handleVerifyOTP} disabled={isSubmitting || authLoading} activeOpacity={0.9}>
                  {isSubmitting || authLoading ? <ActivityIndicator color="#fff" /> : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Verificar código</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={s.resendBtn} onPress={handleSendOTP} disabled={isSubmitting}>
                  <Text style={s.resendText}>¿No recibiste el código?</Text>
                  <Text style={s.resendLink}> Reenviar</Text>
                </TouchableOpacity>
              </>
            ) : method === 'phone' ? (
              <>
                <View style={s.inputWrap}>
                  <View style={[s.phoneRow, errors.phone && s.inputErr]}>
                    <View style={s.countryCode}>
                      <Text style={s.countryCodeText}>+57</Text>
                      <Ionicons name="chevron-down" size={15} color={COLORS.textSecondary} />
                    </View>
                    <View style={s.phoneDivider} />
                    <TextInput
                      style={s.phoneInput}
                      placeholder="300 000 0000"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(t) => { setPhone(t); if (errors.phone) setErrors({}) }}
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.phone
                    ? <Text style={s.errText}>{errors.phone}</Text>
                    : <Text style={s.inputHint}>Te enviaremos un código SMS para confirmar</Text>
                  }
                </View>

                <TouchableOpacity style={[s.btn, isSubmitting && s.btnDisabled]} onPress={handleSendOTP} disabled={isSubmitting || authLoading} activeOpacity={0.9}>
                  {isSubmitting || authLoading ? <ActivityIndicator color="#fff" /> : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Enviar código de acceso</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TermsText />

                <TouchableOpacity style={s.switchMethod} onPress={() => switchMethod('email')}>
                  <Text style={s.switchMethodText}>¿Prefieres usar correo electrónico?</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.inputWrap}>
                  <View style={[s.inputRow, errors.email && s.inputErr]}>
                    <Ionicons name="mail-outline" size={20} color={errors.email ? COLORS.error : COLORS.textSecondary} />
                    <TextInput
                      style={s.input}
                      placeholder="tucorreo@ejemplo.com"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((p) => ({ ...p, email: undefined })) }}
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.email && <Text style={s.errText}>{errors.email}</Text>}
                </View>

                <View style={s.inputWrap}>
                  <View style={[s.inputRow, errors.password && s.inputErr]}>
                    <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.textSecondary} />
                    <TextInput
                      style={s.input}
                      placeholder="••••••••"
                      placeholderTextColor={COLORS.textTertiary}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((p) => ({ ...p, password: undefined })) }}
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={s.errText}>{errors.password}</Text>}
                </View>

                <TouchableOpacity style={s.forgotBtn} onPress={() => navigation.navigate('RecoveryAccount' as never)} disabled={isSubmitting}>
                  <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.btn, isSubmitting && s.btnDisabled]} onPress={handleEmailLogin} disabled={isSubmitting || authLoading} activeOpacity={0.9}>
                  {isSubmitting || authLoading ? <ActivityIndicator color="#fff" /> : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Iniciar Sesión</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TermsText />

                <TouchableOpacity style={s.switchMethod} onPress={() => switchMethod('phone')}>
                  <Text style={s.switchMethodText}>¿Prefieres usar tu número de teléfono?</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register' as never)} disabled={isSubmitting}>
              <Text style={s.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  )
}

function TermsText() {
  const navigation = useNavigation()
  return (
    <View style={s.termsWrap}>
      <Text style={s.termsText}>
        Al continuar, aceptas nuestros{' '}
        <Text style={s.termsLink} onPress={() => navigation.navigate('TermsOfService' as never)}>
          Términos de uso
        </Text>
        {' '}y{' '}
        <Text style={s.termsLink} onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
          Política de privacidad
        </Text>
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },

  // Header
  header: { paddingBottom: SPACING.md, alignItems: 'center' },
  logo: { width: 260, height: 65, marginBottom: 10 },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...SHADOWS.lg,
  },
  // Inputs
  inputWrap: { marginBottom: SPACING.lg },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countryCodeText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  phoneDivider: { width: 1, height: 26, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
  phoneInput: { flex: 1, fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 58,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputErr: { borderColor: COLORS.error, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  errText: { fontSize: 12, color: COLORS.error, marginTop: 5, marginLeft: 4 },
  inputHint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 7, marginLeft: 4 },

  // Button
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Terms
  termsWrap: { marginTop: SPACING.md, paddingHorizontal: SPACING.sm },
  termsText: { fontSize: 11.5, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 17 },
  termsLink: { color: COLORS.primary, fontWeight: '600' },

  // Switch method
  switchMethod: { alignItems: 'center', marginTop: SPACING.lg, paddingVertical: SPACING.xs },
  switchMethodText: { fontSize: 13.5, color: COLORS.primary, fontWeight: '600' },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.md },
  forgotText: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '600' },

  // OTP info card
  otpInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  otpIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.success + '15',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  otpTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  otpSubtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  phonePill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, marginBottom: SPACING.md,
  },
  phonePillText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary, fontWeight: '700', fontSize: 17 },
  changePhoneBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xs },
  changePhoneText: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '600' },

  // Resend
  resendBtn: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  resendText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  resendLink: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '600' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  footerLink: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary, fontWeight: '600' },
})
