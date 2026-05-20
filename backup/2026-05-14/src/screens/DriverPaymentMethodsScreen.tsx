import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

type MethodType = 'nequi' | 'daviplata'

interface DriverPaymentMethod {
  id: string
  driver_id: string
  type: MethodType
  phone_number: string
  account_holder: string
  is_active: boolean
}

const METHOD_CONFIG: Record<MethodType, { label: string; color: string; icon: string; placeholder: string }> = {
  nequi:     { label: 'Nequi',     color: '#6C1FC6', icon: 'phone-portrait-outline', placeholder: '3XX XXX XXXX' },
  daviplata: { label: 'Daviplata', color: '#E31E24', icon: 'phone-portrait-outline', placeholder: '3XX XXX XXXX' },
}

export default function DriverPaymentMethodsScreen() {
  const navigation = useNavigation()
  const { user } = useAppStore()

  const [methods, setMethods]     = useState<DriverPaymentMethod[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)

  const [selectedType, setSelectedType] = useState<MethodType>('nequi')
  const [phoneNumber, setPhoneNumber]   = useState('')
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
    setPhoneNumber('')
    setHolderName(user?.name || '')
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!phoneNumber.trim()) { setFormError('Ingresa el número'); return }
    if (phoneNumber.replace(/\D/g, '').length < 7) { setFormError('Número inválido'); return }
    if (!holderName.trim()) { setFormError('Ingresa el nombre del titular'); return }
    if (!user?.id) return

    setSaving(true)
    try {
      const { error } = await supabase.from('driver_payment_methods').insert({
        driver_id: user.id,
        type: selectedType,
        phone_number: phoneNumber.trim(),
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
      `¿Eliminar ${METHOD_CONFIG[method.type].label} ${method.phone_number}?`,
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Métodos de pago</Text>
        <TouchableOpacity onPress={openForm} style={s.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={s.infoText}>
            Los pasajeros verán estos datos al reservar y te pagarán directamente.
            Trive no procesa ni retiene ningún pago del viaje.
          </Text>
        </View>

        {/* Efectivo — siempre disponible */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SIEMPRE DISPONIBLE</Text>
          <View style={s.methodCard}>
            <View style={[s.methodIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="cash-outline" size={22} color="#16A34A" />
            </View>
            <View style={s.methodInfo}>
              <Text style={s.methodLabel}>Efectivo</Text>
              <Text style={s.methodSub}>Los pasajeros pueden pagarte en efectivo al subir</Text>
            </View>
            <View style={s.methodBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            </View>
          </View>
        </View>

        {/* Métodos digitales */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MÉTODOS DIGITALES</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : methods.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="phone-portrait-outline" size={32} color={COLORS.textTertiary} />
              <Text style={s.emptyTitle}>Sin métodos digitales</Text>
              <Text style={s.emptySub}>Agrega Nequi, Daviplata o Bancolombia para que los pasajeros puedan pagarte digitalmente.</Text>
              <TouchableOpacity style={s.addFirstBtn} onPress={openForm} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={s.addFirstBtnText}>Agregar método</Text>
              </TouchableOpacity>
            </View>
          ) : (
            methods.map((m) => {
              const cfg = METHOD_CONFIG[m.type]
              return (
                <View key={m.id} style={s.methodCard}>
                  <View style={[s.methodIcon, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                  </View>
                  <View style={s.methodInfo}>
                    <Text style={s.methodLabel}>{cfg.label}</Text>
                    <Text style={s.methodPhone}>{m.phone_number}</Text>
                    <Text style={s.methodHolder}>{m.account_holder}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(m)} style={s.deleteBtn} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </View>

      </ScrollView>

      {/* Modal agregar método */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Agregar método digital</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tipo */}
            <Text style={s.fieldLabel}>Plataforma</Text>
            <View style={s.typeRow}>
              {(Object.keys(METHOD_CONFIG) as MethodType[]).map((t) => {
                const cfg = METHOD_CONFIG[t]
                const active = selectedType === t
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, active && { borderColor: cfg.color, backgroundColor: cfg.color + '12' }]}
                    onPress={() => setSelectedType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.typeBtnText, active && { color: cfg.color, fontWeight: '700' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Número */}
            <Text style={s.fieldLabel}>Número</Text>
            <TextInput
              style={s.input}
              placeholder={METHOD_CONFIG[selectedType].placeholder}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(t) => { setPhoneNumber(t); setFormError('') }}
            />

            {/* Titular */}
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
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Guardar</Text>}
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  addBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}20`, padding: SPACING.md,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1 },

  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  methodIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  methodSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  methodPhone: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  methodHolder:{ fontSize: 12, color: COLORS.textSecondary },
  methodBadge: { paddingLeft: 8 },
  deleteBtn:   { padding: 8 },

  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptySub:   { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
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
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: -4 },
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
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
