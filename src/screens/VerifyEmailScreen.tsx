import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'

type RootParamList = {
  VerifyEmail: {
    email: string
    name?: string
    phone?: string
  }
}

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<RouteProp<RootParamList, 'VerifyEmail'>>()
  const setUser     = useAppStore((s) => s.setUser)
  const setAuthUser = useAppStore((s) => s.setAuthUser)
  const { clearPendingVerification } = useAppStore.getState()
  const { confirmEmail, sendEmailVerification, loading: authLoading, error: authError } = useAuth()

  const email = route.params?.email || ''
  const [verificationCode, setVerificationCode] = useState('')
  const [errors, setErrors] = useState<{ code?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [canResend, setCanResend] = useState(false)

  // Contador para reenviar código
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const validateCode = () => {
    const newErrors: { code?: string } = {}
    if (!verificationCode.trim()) {
      newErrors.code = 'El código es requerido'
    } else if (verificationCode.length < 6) {
      newErrors.code = 'El código debe tener al menos 6 caracteres'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleVerifyEmail = async () => {
    if (!validateCode()) return

    try {
      setIsSubmitting(true)
      const data = await confirmEmail(email, verificationCode)

      if (data?.user) {
        // Fetchthe created profile
        const { data: profile } = await (await import('../services/supabase')).supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            rating: profile.rating || 0,
            balance: profile.balance || 0,
            membership_type: profile.membership_type || 'free',
            membership_expiry: profile.membership_expiry || null,
          })
        }

        setAuthUser(data.user)

        // Limpiar estado de verificación pendiente
        const { clearPendingVerification } = useAppStore.getState()
        clearPendingVerification()

        // Navegar al Main después de verificación exitosa
        navigation.navigate('Main' as never)
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'email_verify_network' }
        )
      } else if (err.message?.includes('invalid') || err.message?.includes('expired')) {
        errorHandler.handle(
          'El código es inválido o expiró. Por favor solicita uno nuevo.',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'email_code_invalid' }
        )
      } else {
        errorHandler.handle(
          err.message || 'No se pudo verificar el email',
          ErrorType.AUTH,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'email_verify_error', email }
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    try {
      setIsSubmitting(true)
      await sendEmailVerification(email)
      setTimeLeft(300)
      setCanResend(false)
      setVerificationCode('')
      errorHandler.handle(
        `✅ Código enviado nuevamente a ${email}`,
        ErrorType.UNKNOWN,
        ErrorSeverity.LOW,
        true,
        { context: 'email_resent', email }
      )
    } catch (err: any) {
      errorHandler.handle(
        err.message || 'No se pudo reenviar el código',
        ErrorType.AUTH,
        ErrorSeverity.MEDIUM,
        true,
        { context: 'email_resend_error', email }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                // Limpiar estado de verificación pendiente
                clearPendingVerification()
                // Volver a Register para cambiar datos
                navigation.navigate('Register' as never)
              }}
              disabled={isSubmitting || authLoading}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Verificar Correo</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Verification Card */}
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
            </View>

            <Text style={styles.welcomeText}>Verifica tu correo</Text>

            <Text style={styles.infoText}>
              Te enviamos un código de verificación a:
            </Text>

            <View style={styles.emailContainer}>
              <Ionicons name="mail" size={18} color={COLORS.primary} />
              <Text style={styles.emailBig}>{email}</Text>
            </View>

            <Text style={styles.instructionText}>
              Ingresa el código de 6 dígitos que recibiste en tu correo:
            </Text>

            {/* Code Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Código de Verificación</Text>
              <View style={[styles.inputContainer, errors.code && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.code ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="● ● ● ● ● ●"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="default"
                  maxLength={50}
                  value={verificationCode}
                  onChangeText={(text) => {
                    setVerificationCode(text)
                    if (errors.code) setErrors({ ...errors, code: undefined })
                  }}
                  editable={!isSubmitting && !authLoading}
                  autoCapitalize="none"
                />
              </View>
              {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Ionicons
                name="time-outline"
                size={16}
                color={timeLeft > 60 ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.timerText, { color: timeLeft > 60 ? COLORS.success : COLORS.warning }]}>
                Código válido por: {formatTime(timeLeft)}
              </Text>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyBtn, (isSubmitting || authLoading) && styles.buttonDisabled]}
              onPress={handleVerifyEmail}
              disabled={isSubmitting || authLoading}
              activeOpacity={0.85}
            >
              {isSubmitting || authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyBtnText}>Verificar Código</Text>
              )}
            </TouchableOpacity>

            {authError && <Text style={styles.errorText}>{authError}</Text>}

            {/* Resend Code */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResendCode}
              disabled={!canResend || isSubmitting}
            >
              <Text style={styles.resendText}>¿No recibiste el código?</Text>
              <Text style={[styles.resendLink, { opacity: canResend ? 1 : 0.5 }]}>
                {canResend ? ' Reenviar' : ` Espera ${formatTime(timeLeft)}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Nota importante</Text>
              <Text style={styles.infoMessage}>
                Revisa tu carpeta de spam si no ves el email en la bandeja de entrada
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  backBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  emailBig: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  instructionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  // Input
  inputWrapper: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '05',
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  timerText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },

  // Buttons
  verifyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  verifyBtnText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  resendText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  resendLink: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
})
