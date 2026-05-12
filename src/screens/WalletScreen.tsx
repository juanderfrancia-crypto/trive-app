import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

const ROUTE_COMMISSION = 2000

export default function WalletScreen() {
  const navigation = useNavigation()
  const { user, setUser } = useAppStore()
  const [balance, setBalance] = useState<number>(user?.balance ?? 0)
  const [loading, setLoading] = useState(false)

  const loadBalance = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single()
      if (data) {
        setBalance(data.balance ?? 0)
        setUser({ ...user, balance: data.balance ?? 0 })
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useFocusEffect(useCallback(() => { loadBalance() }, [loadBalance]))

  const tripsAvailable = Math.floor(balance / ROUTE_COMMISSION)

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Mi Billetera</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Balance card */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>SALDO DISPONIBLE</Text>
          <Text style={s.balanceAmount}>
            ${balance.toLocaleString('es-CO')}
          </Text>
          <View style={s.tripsRow}>
            <Ionicons name="car-outline" size={15} color="rgba(255,255,255,0.8)" />
            <Text style={s.tripsText}>
              {tripsAvailable > 0
                ? `Puedes publicar ${tripsAvailable} viaje${tripsAvailable !== 1 ? 's' : ''}`
                : 'Saldo insuficiente para publicar viajes'}
            </Text>
          </View>
        </View>

        {/* Comisión info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Comisión por viaje publicado</Text>
              <Text style={s.infoSub}>
                Se descuentan $2.000 de tu saldo cada vez que publicas un viaje.
                El saldo no se devuelve si el viaje no tiene pasajeros.
              </Text>
            </View>
          </View>
        </View>

        {/* Recargar saldo */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RECARGAR SALDO</Text>
          <View style={s.rechargeCard}>
            <View style={s.rechargeIcon}>
              <Ionicons name="wallet-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={s.rechargeTitle}>Próximamente</Text>
            <Text style={s.rechargeSub}>
              Pronto podrás recargar tu saldo desde la app con Nequi, PSE o tarjeta.
            </Text>
            <View style={s.rechargeBtnDisabled}>
              <Ionicons name="add-circle-outline" size={18} color="#9CA3AF" />
              <Text style={s.rechargeBtnDisabledText}>Recargar saldo</Text>
            </View>
          </View>
        </View>

        {/* Historial */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>HISTORIAL DE MOVIMIENTOS</Text>
          <View style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.textTertiary} />
            <Text style={s.emptyText}>Próximamente</Text>
            <Text style={s.emptySub}>Aquí verás el historial de recargas y descuentos por viajes publicados.</Text>
          </View>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', gap: 8,
  },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tripsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tripsText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  infoCard: {
    backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}20`, padding: SPACING.lg,
  },
  infoRow: { flexDirection: 'row', gap: SPACING.md },
  infoIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  infoSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1, paddingHorizontal: 4 },

  rechargeCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  rechargeIcon: {
    width: 56, height: 56, borderRadius: RADIUS.xl,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  rechargeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  rechargeSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  rechargeBtnDisabled: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    paddingHorizontal: SPACING.xl, paddingVertical: 12,
    borderRadius: RADIUS.md, backgroundColor: '#F3F4F6',
  },
  rechargeBtnDisabledText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 },
})
