import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import { validatePassword } from '../utils/validations'
import { logPasswordChange } from '../services/activityLogger'
import { useAuth } from '../hooks/useAuth'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const newErrors: typeof errors = {}

    if (!currentPassword) {
      newErrors.currentPassword = 'Ingresa tu contraseña actual'
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      newErrors.newPassword = validation.error
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // Verificar contraseña actual re-autenticando
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const email = authUser?.email
      if (!email) throw new Error('No se encontró el correo de la cuenta')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        setErrors({ currentPassword: 'Contraseña actual incorrecta' })
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      if (user?.id) await logPasswordChange(user.id)

      Alert.alert('Contraseña actualizada', 'Tu contraseña se actualizó correctamente.')
      navigation.goBack()
    } catch (err: any) {
      console.error('Error actualizando contraseña:', err)
      Alert.alert('Error', err.message || 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Cambiar contraseña</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.description}>
            Ingresa la nueva contraseña para tu cuenta. Debe tener al menos 6 caracteres.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Contraseña actual</Text>
              <View style={[styles.inputContainer, errors.currentPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.currentPassword ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text)
                    if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: undefined }))
                  }}
                />
              </View>
              {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={[styles.inputContainer, errors.newPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.newPassword ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text)
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }))
                  }}
                />
              </View>
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text)
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }}
                />
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Actualizar contraseña</Text>
              )}
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
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  inputWrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  input: {
    flex: 1,
    height: 48,
    marginLeft: SPACING.sm,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body,
  },
  submitBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.background,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  inputError: {
    borderColor: COLORS.error,
  },
})
