import { useState, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

type MethodType = 'nequi' | 'daviplata' | 'bre_b'

interface DriverPaymentMethod {
  id: string
  driver_id: string
  type: MethodType
  phone_number: string | null
  payment_key: string | null
  account_holder: string
  is_active: boolean
}

const METHOD_CONFIG: Record<MethodType, { label: string; color: string; fieldLabel: string; placeholder: string }> = {
  nequi:     { label: 'Nequi',     color: COLORS.primary, fieldLabel: 'Número de celular', placeholder: '3XX XXX XXXX' },
  daviplata: { label: 'Daviplata', color: COLORS.error,   fieldLabel: 'Número de celular', placeholder: '3XX XXX XXXX' },
  bre_b:     { label: 'Bre-B',     color: COLORS.primary, fieldLabel: 'Llave Bre-B',       placeholder: 'Celular, cédula, correo o alias' },
}

const KEY_MIN_LENGTH = 4

function methodValue(m: DriverPaymentMethod): string {
  return (m.type === 'bre_b' ? m.payment_key : m.phone_number) ?? ''
}

export default function DriverPaymentMethodsScreen() {
  const navigation = useNavigation()
  const user = useAppStore((s) => s.user)

  const [methods, setMethods]     = useState<DriverPaymentMethod[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)

  const [selectedType, setSelectedType] = useState<MethodType>('nequi')
  const [value, setValue]               = useState('')
  const [holderName, setHolderName]     = useState('')
  const [formError, setFormError]       = useState('')

  const loadMethods = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (!error) setMethods((data as DriverPaymentMethod[]) || [])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useFocusEffect(useCallback(() => { loadMethods() }, [loadMethods]))

  const openForm = () => {
    setSelectedType('nequi')
    setValue('')
    setHolderName(user?.name || '')
    setFormError('')
    setShowForm(true)
  }

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
      setShowForm(false)
      loadMethods()
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (method: DriverPaymentMethod) => {
    Alert.alert(
      'Eliminar método',
      `¿Eliminar ${METHOD_CONFIG[method.type].label} ${methodValue(method)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await supabase.from('driver_payment_methods').update({ is_active: false }).eq('id', method.id)
            loadMethods()
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="ArrowLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Métodos de pago</Text>
        <TouchableOpacity onPress={openForm} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="CirclePlus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.infoCard}>
          <Icon name="Info" size={18} color={COLORS.primary} />
          <Text style={s.infoText}>
            Los pasajeros verán estos datos al reservar y te pagarán directamente.
            Trive no procesa ni retiene ningún pago del viaje.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>SIEMPRE DISPONIBLE</Text>
          <View style={s.methodCard}>
            <View style={[s.methodIcon, { backgroundColor: COLORS.successLight }]}>
              <Icon name="Banknote" size={22} color={COLORS.success} />
            </View>
            <View style={s.methodInfo}>
              <Text style={s.methodLabel}>Efectivo</Text>
              <Text style={s.methodSub}>Los pasajeros pueden pagarte en efectivo al subir</Text>
            </View>
            <Icon name="CircleCheck" size={18} color={COLORS.textPrimary} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>MÉTODOS DIGITALES</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : methods.length === 0 ? (
            <View style={s.emptyCard}>
              <Illustration name="walletDiag" width={150} />
              <Text style={s.emptyTitle}>Sin métodos digitales</Text>
              <Text style={s.emptySub}>Agrega Nequi, Daviplata o tu llave Bre-B para que los pasajeros puedan pagarte digitalmente.</Text>
              <TouchableOpacity style={s.addFirstBtn} onPress={openForm} activeOpacity={0.8}>
                <Icon name="CirclePlus" size={18} color={COLORS.primary} />
                <Text style={s.addFirstBtnText}>Agregar método</Text>
              </TouchableOpacity>
            </View>
          ) : (
            methods.map((m) => {
              const cfg = METHOD_CONFIG[m.type]
              return (
                <View key={m.id} style={s.methodCard}>
                  <View style={[s.methodIcon, { backgroundColor: cfg.color + '18' }]}>
                    <Icon name="Smartphone" size={22} color={cfg.color} />
                  </View>
                  <View style={s.methodInfo}>
                    <Text style={s.methodLabel}>{cfg.label}</Text>
                    <Text style={s.methodValue}>{methodValue(m)}</Text>
                    <Text style={s.methodHolder}>{m.account_holder}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(m)} style={s.iconBtn} activeOpacity={0.7}>
                    <Icon name="Trash2" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Agregar método digital</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={s.iconBtn}>
                <Icon name="X" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Plataforma</Text>
            <View style={s.typeRow}>
              {(Object.keys(METHOD_CONFIG) as MethodType[]).map((t) => {
                const cfg = METHOD_CONFIG[t]
                const active = selectedType === t
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, active && { borderColor: cfg.color, backgroundColor: cfg.color + '12' }]}
                    onPress={() => { setSelectedType(t); setValue(''); setFormError('') }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.typeBtnText, active && { color: cfg.color, fontWeight: '700' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={s.fieldLabel}>{METHOD_CONFIG[selectedType].fieldLabel}</Text>
            <TextInput
              style={s.input}
              placeholder={METHOD_CONFIG[selectedType].placeholder}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType={selectedType === 'bre_b' ? 'default' : 'phone-pad'}
              autoCapitalize="none"
              value={value}
              onChangeText={(t) => { setValue(t); setFormError('') }}
            />
            {selectedType === 'bre_b' && (
              <Text style={s.fieldHint}>Es la llave que ya registraste en tu banco. Los pasajeros la verán tal cual.</Text>
            )}

            <Text style={s.fieldLabel}>Nombre del titular</Text>
            <TextInput
              style={s.input}
              placeholder="Nombre tal como aparece en la app"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="words"
              value={holderName}
              onChangeText={(t) => { setHolderName(t); setFormError('') }}
            />

            {formError ? <Text style={s.formError}>{formError}</Text> : null}

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },

  infoCard: {
    ...SHADOWS.sm,
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.lg,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1 },

  methodCard: {
    ...SHADOWS.sm,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  methodIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  methodSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  methodValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  methodHolder: { fontSize: 13, color: COLORS.textSecondary },

  emptyCard: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: `${COLORS.primary}10` },
  addFirstBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40, gap: SPACING.md,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: -4 },
  fieldHint: { fontSize: 13, color: COLORS.textTertiary, marginTop: -4 },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center',
  },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  formError: { fontSize: 13, color: COLORS.error, marginTop: -4 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
})
