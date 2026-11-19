import { useState } from 'react'
import { View, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const [newName, setNewName] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)

  const handleSave = async () => {
    if (!newName.trim() || newName.trim().length < 2) return
    if (!user?.id) return

    try {
      setSavingName(true)
      const { error } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id)
      if (error) throw error
      useAppStore.getState().setUser({ ...user, name: newName.trim() })
      showSuccess('Nombre actualizado')
      navigation.goBack()
    } catch (err: any) {
      showError('No se pudo guardar')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <KeyboardAvoidingScreen style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="ChevronLeft" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Datos personales</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.formCard}>
            <View>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Tu nombre completo"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                maxLength={60}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Teléfono</Text>
              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyText}>{user?.phone || 'Sin verificar'}</Text>
              </View>
              <Text style={styles.hint}>Es tu identidad de acceso, no se puede cambiar aquí.</Text>
            </View>

            <LinearGradient
              colors={(savingName || newName.trim().length < 2) ? [COLORS.border, COLORS.border] : [COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, (savingName || newName.trim().length < 2) && styles.saveBtnDisabled]}
            >
              <TouchableOpacity onPress={handleSave} disabled={savingName || newName.trim().length < 2} style={styles.saveBtnInner}>
                {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Guardar</Text>}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  container: { padding: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  formCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.lg, ...SHADOWS.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.background,
  },
  readOnlyBox: {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, justifyContent: 'center', backgroundColor: COLORS.background,
  },
  readOnlyText: { fontSize: 15, color: COLORS.textSecondary },
  hint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 6 },
  saveBtn: { height: 52, borderRadius: RADIUS.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.sm },
  saveBtnInner: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
