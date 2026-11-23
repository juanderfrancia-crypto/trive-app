import { useState, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { AppAlert } from '../components/AppAlert'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

export type MethodType = 'nequi' | 'daviplata' | 'bre_b'

interface DriverPaymentMethod {
  id: string
  driver_id: string
  type: MethodType
  phone_number: string | null
  payment_key: string | null
  account_holder: string
  is_active: boolean
}

export const METHOD_CONFIG: Record<MethodType, { label: string; color: string; fieldLabel: string; placeholder: string }> = {
  nequi:     { label: 'Nequi',     color: COLORS.primary, fieldLabel: 'Número de celular', placeholder: '3XX XXX XXXX' },
  daviplata: { label: 'Daviplata', color: COLORS.error,   fieldLabel: 'Número de celular', placeholder: '3XX XXX XXXX' },
  bre_b:     { label: 'Bre-B',     color: COLORS.primary, fieldLabel: 'Llave Bre-B',       placeholder: 'Celular, cédula, correo o alias' },
}

export const KEY_MIN_LENGTH = 4

function methodValue(m: DriverPaymentMethod): string {
  return (m.type === 'bre_b' ? m.payment_key : m.phone_number) ?? ''
}

export default function DriverPaymentMethodsScreen() {
  const navigation = useNavigation()
  const user = useAppStore((s) => s.user)

  const [methods, setMethods]     = useState<DriverPaymentMethod[]>([])
  const [loading, setLoading]     = useState(false)

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
    navigation.navigate('AddPaymentMethod' as never)
  }

  const handleDelete = (method: DriverPaymentMethod) => {
    AppAlert.confirm({
      title: 'Eliminar método',
      message: `¿Eliminar ${METHOD_CONFIG[method.type].label} ${methodValue(method)}?`,
      confirmText: 'Eliminar',
      destructive: true,
      onConfirm: async () => {
        await supabase.from('driver_payment_methods').update({ is_active: false }).eq('id', method.id)
        loadMethods()
      },
    })
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
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.lg, padding: SPACING.lg,
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
})
