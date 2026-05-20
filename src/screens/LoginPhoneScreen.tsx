import React, { useCallback, useRef, useState } from 'react'
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
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { useBruteForceGuard } from '../hooks/useBruteForceGuard'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { logLogin } from '../services/activityLogger'
import OfflineBanner from '../components/OfflineBanner'
import { showSuccess, showError, showInfo } from '../utils/showError'

type Method = 'phone' | 'email'
type Step = 'input' | 'otp' | 'name'

export default function LoginPhoneScreen() {
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { signInWithOTP, verifyOTP, login, loading: authLoading } = useAuth()
  const scrollRef = useRef<ScrollView>(null)
  const otpRefs = useRef<(TextInput | null)[]>([])

  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('input')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tempUser, setTempUser] = useState<any>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailGuard = useBruteForceGuard()
  const otpGuard = useBruteForceGuard()


  const switchMethod = (m: Method) => {
    setMethod(m)
    setStep('input')
    setErrors({})
    setOtp('')
    setOtpDigits(['', '', '', '', '', ''])
  }

  // ─── Phone flow ───────────────────────────────────────────────────────────

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '')
    return digits.startsWith('57') ? `+${digits}` : `+57${digits}`
  }

  const validatePhone = () => {
    if (!phone.trim()) { setErrors({ phone: 'El número telefónico es requerido' }); return false }
    if (!/^\d{7,}$/.test(phone.replace(/[^\d]/g, ''))) { setErrors({ phone: 'Ingresa un número válido (mínimo 7 dígitos)' }); return false }
    setErrors({})
    return true
  }

  const validateOTP = () => {
    if (!otp.trim()) { setErrors({ otp: 'El código OTP es requerido' }); return false }
    if (otp.length < 6) { setErrors({ otp: 'El código debe tener 6 dígitos' }); return false }
    setErrors({})
    return true
  }

  const handleSendOTP = async () => {
    if (!validatePhone()) return
    try {
      setIsSubmitting(true)
      await signInWithOTP(formatPhone(phone))
      setStep('otp')
      showSuccess(`Código enviado al +57 ${phone.replace(/[^\d]/g, '')}. Válido por 10 minutos.`)
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'otp_send_network' })
      } else if (err.message?.includes('rate')) {
        errorHandler.handle('Demasiados intentos. Por favor espera unos minutos.', ErrorType.VALIDATION, ErrorSeverity.MEDIUM, true, { context: 'otp_rate_limit' })
      } else {
        errorHandler.handle(err, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM, true, { context: 'otp_send_error' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async (code?: string) => {
    const codeToVerify = code ?? otp
    if (otpGuard.isLocked) return
    if (!codeToVerify || codeToVerify.length < 6) { setErrors({ otp: 'El código debe tener 6 dígitos' }); return }
    setErrors({})
    try {
      setIsSubmitting(true)
      const data = await verifyOTP(formatPhone(phone), codeToVerify)
      if (data?.user) {
        const { data: profile } = await (await import('../services/supabase')).supabase
          .from('profiles').select('*').eq('id', data.user.id).maybeSingle()

        const isRealName = (name: string | null) => {
          if (!name || name.trim().length < 2) return false
          if (name === 'Usuario') return false
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return false // UUID
          if (/^\+?\d{7,}$/.test(name.trim())) return false // número de teléfono
          if (name.includes('@')) return false // parece email o derivado de email
          return true
        }

        if (profile && isRealName(profile.name)) {
          // Usuario existente con nombre real → loguear directamente
          setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role, rating: profile.rating, balance: profile.balance || 0, membership_type: profile.membership_type || 'free', membership_expiry: profile.membership_expiry })
          setAuthUser(data.user)
          otpGuard.recordSuccess()
          await logLogin(data.user.id)
        } else {
          // Usuario nuevo (sin perfil o sin nombre real) → pedir nombre
          setTempUser(data.user)
          otpGuard.recordSuccess()
          setStep('name')
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'otp_verify_network' })
      } else if (err.message?.includes('invalid') || err.message?.includes('expired')) {
        otpGuard.recordFailure()
        errorHandler.handle('El código OTP es inválido o expiró. Por favor solicita uno nuevo.', ErrorType.VALIDATION, ErrorSeverity.MEDIUM, true, { context: 'otp_invalid' })
      } else {
        otpGuard.recordFailure()
        errorHandler.handle(err, ErrorType.AUTH, ErrorSeverity.MEDIUM, true, { context: 'otp_verify_error' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpDigitChange = useCallback((value: string, index: number) => {
    const digit = value.replace(/[^\d]/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    const joined = newDigits.join('')
    setOtp(joined)
    setErrors({})
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    if (joined.length === 6 && !otpGuard.isLocked) {
      handleVerifyOTP(joined)
    }
  }, [otpDigits, otpGuard.isLocked])

  const handleOtpKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits]
      newDigits[index - 1] = ''
      setOtpDigits(newDigits)
      setOtp(newDigits.join(''))
      otpRefs.current[index - 1]?.focus()
    }
  }, [otpDigits])

  const handleCompleteName = async () => {
    if (!name.trim() || name.trim().length < 2) { setErrors({ name: 'Ingresa tu nombre completo' }); return }
    try {
      setIsSubmitting(true)
      const supabaseClient = (await import('../services/supabase')).supabase
      const rawEmail = tempUser?.email ?? null
      const isFakeEmail = !rawEmail || /^[0-9a-f-]{36}@/i.test(rawEmail) || rawEmail.includes('@sms.local')
      const userEmail = isFakeEmail ? null : rawEmail
      const { data: savedProfile, error } = await supabaseClient
        .from('profiles')
        .upsert({ id: tempUser.id, name: name.trim(), email: userEmail, phone: formatPhone(phone), role: 'passenger' }, { onConflict: 'id' })
        .select()
        .single()
      if (error) { errorHandler.handleSupabaseError(error, 'create_profile_name', {}); return }
      setUser({ id: savedProfile.id, name: savedProfile.name, email: savedProfile.email, phone: savedProfile.phone, role: savedProfile.role, rating: savedProfile.rating || 0, balance: savedProfile.balance || 0, membership_type: savedProfile.membership_type || 'free', membership_expiry: savedProfile.membership_expiry || null })
      setAuthUser(tempUser)
      await logLogin(tempUser.id)
    } catch (err: any) {
      errorHandler.handle(err, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM, true, { context: 'complete_profile_name' })
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
    else if (password.length < 6) errs.password = 'Mínimo 6 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleEmailLogin = async () => {
    if (emailGuard.isLocked || !validateEmail()) return
    try {
      setIsSubmitting(true)
      const data = (await login(email.trim(), password)) as any
      if (data?.user) {
        const { data: profile, error: profileError } = await (await import('../services/supabase')).supabase
          .from('profiles').select('*').eq('id', data.user.id).maybeSingle()
        if (profileError) { errorHandler.handleSupabaseError(profileError, 'fetch_profile', { userId: data.user.id }); return }
        if (profile) setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role, rating: profile.rating, balance: profile.balance || 0, membership_type: profile.membership_type || 'free', membership_expiry: profile.membership_expiry })
        setAuthUser(data.user)
        emailGuard.recordSuccess()
        await logLogin(data.user.id)
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle('Sin conexión a internet', ErrorType.NETWORK, ErrorSeverity.HIGH, true, { context: 'login' })
      } else if (err.message?.includes('Invalid') || err.message?.includes('credentials')) {
        emailGuard.recordFailure()
        errorHandler.handle('Correo o contraseña incorrectos', ErrorType.AUTH, ErrorSeverity.MEDIUM, true, { context: 'login' })
      } else {
        emailGuard.recordFailure()
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
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <KeyboardAvoidingView
        style={s.kav}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >

          {/* Logo + encabezado */}
          <View style={s.header}>
            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          </View>

          {/* ── Name step ── */}
          {step === 'name' ? (
            <View style={s.section}>
              <View style={s.otpHeader}>
                <View style={s.otpIconCircle}>
                  <Ionicons name="person-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={s.heading}>¿Cómo te llamas?</Text>
                <Text style={s.subheading}>Ingresa tu nombre para completar tu registro en Trive</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Nombre completo</Text>
                <View style={[s.input, errors.name && s.inputError]}>
                  <Ionicons name="person-outline" size={20} color={errors.name ? COLORS.error : COLORS.textSecondary} />
                  <TextInput
                    style={s.inputText}
                    placeholder="Ej: Carlos Rodríguez"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                    value={name}
                    onChangeText={(t) => { setName(t); if (errors.name) setErrors({}) }}
                    editable={!isSubmitting}
                    autoFocus
                  />
                </View>
                {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
              </View>

              <TouchableOpacity
                style={[s.btn, isSubmitting && s.btnDisabled]}
                onPress={handleCompleteName}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.btnGradient}
                >
                  {isSubmitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Continuar</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

          ) : step === 'otp' ? (
            <View style={s.section}>
              <View style={s.otpHeader}>
                <View style={s.otpIconCircle}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={s.heading}>Revisa tu SMS</Text>
                <Text style={s.subheading}>
                  Enviamos un código de 6 dígitos al{'\n'}
                  <Text style={s.phoneHighlight}>+57 {phone.replace(/[^\d]/g, '')}</Text>
                </Text>
                <TouchableOpacity
                  style={s.changeBtn}
                  onPress={() => { setStep('input'); setOtp(''); setOtpDigits(['','','','','','']); setErrors({}) }}
                >
                  <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
                  <Text style={s.changeBtnText}>Cambiar número</Text>
                </TouchableOpacity>
              </View>

              <View style={s.otpBoxRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { otpRefs.current[i] = r }}
                    style={[
                      s.otpBox,
                      digit ? s.otpBoxFilled : null,
                      errors.otp ? s.otpBoxError : null,
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpDigitChange(v, i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    editable={!isSubmitting}
                    textAlign="center"
                    autoFocus={i === 0}
                    selectTextOnFocus
                  />
                ))}
              </View>
              {errors.otp && <Text style={[s.errorText, { textAlign: 'center', marginTop: 8 }]}>{errors.otp}</Text>}

              {isSubmitting || authLoading ? (
                <View style={s.otpLoadingRow}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                  <Text style={s.otpLoadingText}>Verificando...</Text>
                </View>
              ) : null}

              {otpGuard.isLocked && (
                <View style={s.lockBanner}>
                  <Ionicons name="lock-closed" size={14} color="#92400E" />
                  <Text style={s.lockText}>Demasiados intentos. Espera {otpGuard.formatCountdown()}</Text>
                </View>
              )}

              <TouchableOpacity style={s.resendRow} onPress={handleSendOTP} disabled={isSubmitting}>
                <Text style={s.resendText}>¿No recibiste el código? </Text>
                <Text style={s.resendLink}>Reenviar</Text>
              </TouchableOpacity>
            </View>

          ) : method === 'phone' ? (
            /* ── Phone input step ── */
            <View style={s.section}>
              <Text style={s.heading}>Ingresa tu número</Text>
              <Text style={s.subheading}>Te enviaremos un código SMS para confirmar tu identidad</Text>

              <View style={s.inputGroup}>
                <Text style={s.label}>Número de teléfono</Text>
                <View style={[s.phoneRow, errors.phone && s.inputError]}>
                  <View style={s.countryBadge}>
                    <Text style={s.countryFlag}>🇨🇴</Text>
                    <Text style={s.countryCode}>+57</Text>
                    <Ionicons name="chevron-down" size={13} color={COLORS.textSecondary} />
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
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
                  />
                </View>
                {errors.phone
                  ? <Text style={s.errorText}>{errors.phone}</Text>
                  : <Text style={s.hint}>Recibirás un código de un solo uso por SMS</Text>
                }
              </View>

              <TouchableOpacity
                style={[s.btn, isSubmitting && s.btnDisabled]}
                onPress={handleSendOTP}
                disabled={isSubmitting || authLoading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.btnGradient}
                >
                  {isSubmitting || authLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Enviar código</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TermsText />

              <TouchableOpacity style={s.emailLink} onPress={() => switchMethod('email')} disabled={isSubmitting}>
                <Text style={s.emailLinkText}>Iniciar sesión con correo electrónico</Text>
              </TouchableOpacity>
            </View>

          ) : (
            /* ── Email step ── */
            <View style={s.section}>
              <TouchableOpacity style={s.backRow} onPress={() => switchMethod('phone')}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                <Text style={s.backText}>Volver</Text>
              </TouchableOpacity>

              <Text style={s.heading}>Inicia con tu correo</Text>
              <Text style={s.subheading}>Ingresa tu correo y contraseña de Trive</Text>

              <View style={s.inputGroup}>
                <Text style={s.label}>Correo electrónico</Text>
                <View style={[s.input, errors.email && s.inputError]}>
                  <Ionicons name="mail-outline" size={20} color={errors.email ? COLORS.error : COLORS.textSecondary} />
                  <TextInput
                    style={s.inputText}
                    placeholder="tucorreo@ejemplo.com"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((p) => ({ ...p, email: '' })) }}
                    editable={!isSubmitting}
                  />
                </View>
                {errors.email && <Text style={s.errorText}>{errors.email}</Text>}
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Contraseña</Text>
                <View style={[s.input, errors.password && s.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.textSecondary} />
                  <TextInput
                    style={s.inputText}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((p) => ({ ...p, password: '' })) }}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity
                style={s.forgotBtn}
                onPress={() => navigation.navigate('RecoveryAccount' as never)}
                disabled={isSubmitting}
              >
                <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {emailGuard.isLocked && (
                <View style={s.lockBanner}>
                  <Ionicons name="lock-closed" size={14} color="#92400E" />
                  <Text style={s.lockText}>Demasiados intentos. Espera {emailGuard.formatCountdown()}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.btn, (isSubmitting || emailGuard.isLocked) && s.btnDisabled]}
                onPress={handleEmailLogin}
                disabled={isSubmitting || authLoading || emailGuard.isLocked}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#0E2699', '#1230B8', '#1A3FCC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.btnGradient}
                >
                  {isSubmitting || authLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>{emailGuard.isLocked ? `Bloqueado ${emailGuard.formatCountdown()}` : 'Iniciar sesión'}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  )
}

function TermsText() {
  const navigation = useNavigation()
  return (
    <View style={s.termsWrap}>
      <Text style={s.termsText}>
        Al continuar aceptas nuestros{' '}
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
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },

  // Header
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  logo: { width: 220, height: 100 },

  // Section
  section: {
    paddingTop: 8,
  },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 36,
  },

  // Inputs
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 62,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  hint: {
    fontSize: 12.5,
    color: COLORS.textTertiary,
    marginTop: 7,
    marginLeft: 4,
    lineHeight: 18,
  },

  // Phone row
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 62,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 4,
  },
  countryFlag: { fontSize: 18 },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 14,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Button
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnGradient: {
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Terms
  termsWrap: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Email link (secondary, low prominence)
  emailLink: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  emailLinkText: {
    fontSize: 12.5,
    color: COLORS.textTertiary,
    textDecorationLine: 'underline',
  },

  // OTP header
  otpHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  otpIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
  },
  changeBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Resend
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: { fontSize: 14, color: COLORS.textSecondary },
  resendLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  // Back row (email step)
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13.5,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // OTP boxes
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  otpBox: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  otpBoxError: {
    borderColor: COLORS.error,
  },
  otpLoadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  otpLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Lock banner
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  lockText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },

})
