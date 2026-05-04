import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useState } from 'react'
import { supabase } from '../services/supabase'

export default function RecoveryAccountScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [email, setEmail] = useState('usuario@email.com')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSaveEmail = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert('Error', 'Ingresa un correo válido para enviar el enlace de recuperación')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) {
        throw error
      }
      Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.')
      setIsEditing(false)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar el correo de recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Recuperación de Cuenta</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Correo de Recuperación</Text>
          <Text style={styles.sectionSubtitle}>
            Usa este correo para recuperar tu cuenta si olvidas tu contraseña
          </Text>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                editable={true}
              />
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelBtn]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveBtn]}
                  onPress={handleSaveEmail}
                >
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emailCard}>
              <View style={styles.emailHeader}>
                <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
                <Text style={styles.emailText}>{email}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editLink}>Cambiar correo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Números de Emergencia</Text>
          <Text style={styles.sectionSubtitle}>
            Agrega números de teléfono para recuperar tu cuenta
          </Text>

          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={40} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No hay números agregados</Text>
            <TouchableOpacity style={styles.addBtn}>
              <Ionicons name="add-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Añadir número</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Mantén esta información actualizada para poder recuperar tu cuenta fácilmente
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    marginBottom: SPACING.lg,
  },
  emailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  emailText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  editLink: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  editContainer: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: COLORS.surfaceAlt,
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
})
