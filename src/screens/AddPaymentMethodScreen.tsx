import { useState } from 'react'
import { View, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { METHOD_CONFIG, KEY_MIN_LENGTH, MethodType } from './DriverPaymentMethodsScreen'

export default function AddPaymentMethodScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const user = useAppStore((s) => s.user)

  const [selectedType, setSelectedType] = useState<MethodType>('nequi')
  const [value, setValue]               = useState('')
  const [holderName, setHolderName]     = useState(user?.name || '')
  const [formError, setFormError]       = useState('')
  const [saving, setSaving]             = useState(false)

  const handleSave = async () => {
    const clean = value.trim()
    if (!clean) { setFormError(selectedType === 'bre_b' ? 'Ingresa tu llave Bre-B' : 'Ingresa el número'); return }
    if (selectedType === 'bre_b') {
      if (clean.length < KEY_MIN_LENGTH) { setFormError('La llave es muy corta'); return }
    } else if (clean.replace(/\D/g, '').length < 7) {
      setFormError('Número inválido')
      return
    }
    if (!holderName.trim()) { setFormError('Ingresa el nombre del titular'); return }
    if (!user?.id) return

    setSaving(true)
    try {
      const { error } = await supabase.from('driver_payment_methods').insert({
        driver_id: user.id,
        type: selectedType,
        phone_number: selectedType === 'bre_b' ? null : clean,
        payment_key: selectedType === 'bre_b' ? clean : null,
        account_holder: holderName.trim(),
        is_active: true,
      })
      if (error) throw error
      navigation.goBack()
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
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
            <Text style={styles.title}>Agregar método digital</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Plataforma</Text>
            <View style={styles.typeRow}>
              {(Object.keys(METHOD_CONFIG) as MethodType[]).map((t) => {
                const cfg = METHOD_CONFIG[t]
                const active = selectedType === t
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, active && { borderColor: cfg.color, backgroundColor: cfg.color + '12' }]}
                    onPress={() => { setSelectedType(t); setValue(''); setFormError('') }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeBtnText, active && { color: cfg.color, fontWeight: '700' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View>
              <Text style={styles.fieldLabel}>{METHOD_CONFIG[selectedType].fieldLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={METHOD_CONFIG[selectedType].placeholder}
                placeholderTextColor={COLORS.textTertiary}
                keyboardType={selectedType === 'bre_b' ? 'default' : 'phone-pad'}
                autoCapitalize="none"
                value={value}
                onChangeText={(t) => { setValue(t); setFormError('') }}
              />
              {selectedType === 'bre_b' && (
                <Text style={styles.fieldHint}>Es la llave que ya registraste en tu banco. Los pasajeros la verán tal cual.</Text>
              )}
            </View>

            <View>
              <Text style={styles.fieldLabel}>Nombre del titular</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre tal como aparece en la app"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                value={holderName}
                onChangeText={(t) => { setHolderName(t); setFormError('') }}
              />
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
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
  fieldHint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center',
  },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.background,
  },
  formError: { fontSize: 13, color: COLORS.error },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 52, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
})
