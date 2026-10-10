import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, ScrollView, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'

export default function RecoveryAccountScreen() {
  const navigation = useNavigation()
  const accountEmail = useAppStore((s) => s.user?.email ?? '')
  const [email, setEmail] = useState(accountEmail)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleSend = async () => {
    const target = email.trim()
    if (!target || !/\S+@\S+\.\S+/.test(target)) {
      Alert.alert('Correo inválido', 'Ingresa el correo con el que te registraste.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(target)
      if (error) throw error
      setSentTo(target)
    } catch (err: any) {
      Alert.alert('No se pudo enviar', err.message || 'Intenta de nuevo en unos minutos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recupera tu acceso</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <KeyboardAvoidingScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.illustrationCard}>
          <Illustration name="mobileEncryption" width={200} />
        </View>

        {sentTo ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Icon name="CircleCheck" size={26} color={COLORS.success} />
            </View>
            <Text style={styles.heading}>Revisa tu correo</Text>
            <Text style={styles.body}>
              Enviamos un enlace para crear una nueva contraseña a{' '}
              <Text style={styles.bodyStrong}>{sentTo}</Text>. Si no lo ves, revisa la carpeta de spam.
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Volver a iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.heading}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.body}>
              Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
            </Text>

            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.input}>
              <Icon name="Mail" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.inputText}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Enviar enlace</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },

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
  headerTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800' },

  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  illustrationCard: {
    height: 220,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },

  heading: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  body: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.xl },
  bodyStrong: { fontWeight: '700', color: COLORS.textPrimary },

  label: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    height: 58,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xl,
  },
  inputText: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.textPrimary },

  btn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  btnGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },

  successCard: {
    ...SHADOWS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.sm,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  secondaryBtn: {
    marginTop: SPACING.xl,
    height: 52,
    alignSelf: 'stretch',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...TYPOGRAPHY.button, color: COLORS.primary, fontWeight: '800' },
})
