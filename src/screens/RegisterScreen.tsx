import { useState, useRef } from 'react'
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
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS } from '../theme/colors'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { register, loading: authLoading, error: authError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const lastRegisterAttempt = useRef<number>(0)

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim() || name.trim().length < 3) {
      newErrors.name = 'Ingresa tu nombre completo'
    }

    if (!email.trim()) {
      newErrors.email = 'El correo es requerido'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Ingresa un correo válido'
    }

    if (!phone.trim()) {
      newErrors.phone = 'El teléfono es requerido'
    } else if (!/^\+?\d{10,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Ingresa un teléfono válido'
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (password.length < 6) {
      newErrors.password = 'Debe tener al menos 6 caracteres'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return

    // Prevenir múltiples intentos rápidos (debounce)
    const now = Date.now()
    if (now - lastRegisterAttempt.current < 3000) {
      Alert.alert('Espera un momento', 'Por favor espera unos segundos antes de intentar nuevamente')
      return
    }
    lastRegisterAttempt.current = now

    try {
      setIsSubmitting(true)
      const data = await register(
        email.trim(),
        password,
        name.trim(),
        phone.trim()
      )

      if (data?.user) {
        // Guardar estado de verificación pendiente
        const { setPendingVerification } = useAppStore.getState()
        setPendingVerification(email.trim(), name.trim(), phone.trim())
        
        // Navegar a pantalla de verificación de email
        // @ts-ignore - Navigation params type
        navigation.navigate('VerifyEmail' as never, {
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
        } as never)
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Error al crear la cuenta'
      
      // Detectar y manejar error de rate limit
      if (errorMessage.includes('rate limit') || errorMessage.includes('too_many_requests')) {
        errorMessage = 'Demasiados intentos. Por favor espera 1 hora antes de intentar nuevamente.'
      } else if (errorMessage.includes('already exists')) {
        errorMessage = 'Este correo ya está registrado. Intenta iniciar sesión.'
      } else if (errorMessage.includes('invalid')) {
        errorMessage = 'Datos inválidos. Revisa tu información.'
      }
      
      Alert.alert('Error en el Registro', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputProps = (field: string, value: string, setValue: (v: string) => void) => ({
    value,
    onChangeText: (text: string) => {
      setValue(text)
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    },
  })

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate para empezar a viajar
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, errors.name && styles.inputError]}>
            <Ionicons name="person-outline" size={20} color={errors.name ? '#D32F2F' : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
              {...inputProps('name', name, setName)}
              editable={!isSubmitting}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={[styles.inputContainer, errors.email && styles.inputError]}>
            <Ionicons name="mail-outline" size={20} color={errors.email ? '#D32F2F' : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              {...inputProps('email', email, setEmail)}
              editable={!isSubmitting}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
            <Ionicons name="call-outline" size={20} color={errors.phone ? '#D32F2F' : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Ej: +57 300 123 4567"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
              {...inputProps('phone', phone, setPhone)}
              editable={!isSubmitting}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={[styles.inputContainer, errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#D32F2F' : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              {...inputProps('password', password, setPassword)}
              editable={!isSubmitting}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? '#D32F2F' : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              {...inputProps('confirmPassword', confirmPassword, setConfirmPassword)}
              editable={!isSubmitting}
            />
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          {authError && <Text style={styles.errorText}>{authError}</Text>}

          <TouchableOpacity 
            style={[styles.registerBtn, (isSubmitting || authLoading) && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={isSubmitting || authLoading}
          >
            {isSubmitting || authLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.registerBtnText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} disabled={isSubmitting}>
            <Text style={styles.footerLink}>Inicia Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  form: {
    gap: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
