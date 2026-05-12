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
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { useBruteForceGuard } from '../hooks/useBruteForceGuard'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { logLogin } from '../services/activityLogger'
import OfflineBanner from '../components/OfflineBanner'
import Toast from '../components/Toast'

type Method = 'phone' | 'email'
type Step = 'input' | 'otp' | 'name'

export default function LoginPhoneScreen() {
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { signInWithOTP, verifyOTP, login, loading: authLoading } = useAuth()

  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('input')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tempUser, setTempUser] = useState<any>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const emailGuard = useBruteForceGuard()
  const otpGuard = useBruteForceGuard()

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
      showToast(`Código enviado al +57 ${phone.replace(/[^\d]/g, '')}. Válido por 10 minutos.`, 'success')
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

  const handleVerifyOTP = async () => {
    if (otpGuard.isLocked || !validateOTP()) return
    try {
      setIsSubmitting(true)
      const data = await verifyOTP(formatPhone(phone), otp)
      if (data?.user) {
        const { data: profile } = await (await import('../services/supabase')).supabase
          .from('profiles').select('*').eq('id', data.user.id).maybeSingle()

        if (profile && profile.name && profile.name !== 'Usuario') {
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

  const handleCompleteName = async () => {
    if (!name.trim() || name.trim().length < 2) { setErrors({ name: 'Ingresa tu nombre completo' }); return }
    try {
      setIsSubmitting(true)
      const supabaseClient = (await import('../services/supabase')).supabase
      const userEmail = tempUser?.email || `${formatPhone(phone)}@sms.local`
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

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                {isSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Continuar</Text>
                }
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
                  onPress={() => { setStep('input'); setOtp(''); setErrors({}) }}
                >
                  <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
                  <Text style={s.changeBtnText}>Cambiar número</Text>
                </TouchableOpacity>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Código de verificación</Text>
                <View style={[s.input, errors.otp && s.inputError]}>
                  <Ionicons name="keypad-outline" size={20} color={errors.otp ? COLORS.error : COLORS.textSecondary} />
                  <TextInput
                    style={s.inputText}
                    placeholder="● ● ● ● ● ●"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(t) => { setOtp(t); if (errors.otp) setErrors({}) }}
                    editable={!isSubmitting}
                    textAlign="center"
                  />
                </View>
                {errors.otp && <Text style={s.errorText}>{errors.otp}</Text>}
              </View>

              {otpGuard.isLocked && (
                <View style={s.lockBanner}>
                  <Ionicons name="lock-closed" size={14} color="#92400E" />
                  <Text style={s.lockText}>Demasiados intentos. Espera {otpGuard.formatCountdown()}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.btn, (isSubmitting || otpGuard.isLocked) && s.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={isSubmitting || authLoading || otpGuard.isLocked}
                activeOpacity={0.88}
              >
                {isSubmitting || authLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>{otpGuard.isLocked ? `Bloqueado ${otpGuard.formatCountdown()}` : 'Verificar código'}</Text>
                }
              </TouchableOpacity>

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
                {isSubmitting || authLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Enviar código</Text>
                }
              </TouchableOpacity>

              <TermsText />

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerLabel}>o continúa con</Text>
                <View style={s.dividerLine} />
              </View>

              <TouchableOpacity style={s.altBtn} onPress={() => switchMethod('email')} disabled={isSubmitting}>
                <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                <Text style={s.altBtnText}>Correo electrónico</Text>
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
                {isSubmitting || authLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>{emailGuard.isLocked ? `Bloqueado ${emailGuard.formatCountdown()}` : 'Iniciar sesión'}</Text>
                }
              </TouchableOpacity>
            </View>
          )}

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
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  logo: { width: 200, height: 80 },

  // Section
  section: {
    paddingTop: 8,
  },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
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
    height: 58,
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
    height: 58,
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
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
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
    marginTop: 20,
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

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerLabel: {
    fontSize: 12.5,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },

  // Alt button (email)
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '08',
  },
  altBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // OTP header
  otpHeader: {
    alignItems: 'center',
    marginBottom: 32,
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

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 36,
  },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
})
