import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import * as WebBrowser from 'expo-web-browser'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

const ROUTE_COMMISSION = 2000

const AMOUNTS = [
  { label: '$5.000',  value: 5000 },
  { label: '$10.000', value: 10000 },
  { label: '$20.000', value: 20000 },
  { label: '$50.000', value: 50000 },
]

interface WalletTx {
  id: string
  amount: number
  type: 'recharge' | 'route_fee'
  status: string
  created_at: string
}

export default function WalletScreen() {
  const navigation = useNavigation()
  const { user, setUser } = useAppStore()

  const [balance, setBalance]         = useState<number>(user?.balance ?? 0)
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [selectedAmount, setSelectedAmount] = useState<number>(10000)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [paying, setPaying]           = useState(false)
  const [verifying, setVerifying]     = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoadingBalance(true)
    try {
      const [profileRes, txRes] = await Promise.all([
        supabase.from('profiles').select('balance').eq('id', user.id).single(),
        supabase.from('wallet_transactions')
          .select('id, amount, type, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      if (profileRes.data) {
        const newBalance = profileRes.data.balance ?? 0
        setBalance(newBalance)
        setUser({ ...user, balance: newBalance })
      }
      if (txRes.data) setTransactions(txRes.data as WalletTx[])
    } finally {
      setLoadingBalance(false)
    }
  }, [user?.id])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  const pollBalanceUntilUpdated = async (previousBalance: number) => {
    setVerifying(true)
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const { data } = await supabase.from('profiles').select('balance').eq('id', user!.id).single()
      const newBalance = data?.balance ?? 0
      if (newBalance > previousBalance) {
        setBalance(newBalance)
        setUser({ ...user!, balance: newBalance })
        await loadData()
        setVerifying(false)
        Alert.alert('¡Recarga exitosa!', `Se acreditaron $${(newBalance - previousBalance).toLocaleString('es-CO')} a tu billetera.`)
        return
      }
    }
    setVerifying(false)
    await loadData()
  }

  const handleRecharge = async () => {
    if (!user?.id) return
    setPaying(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-wompi-transaction', {
        body: { amount: selectedAmount },
      })
      if (error || !data?.checkoutUrl) {
        throw new Error(error?.message ?? 'No se pudo iniciar el pago')
      }

      const previousBalance = balance
      await WebBrowser.openBrowserAsync(data.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      })

      // Cuando el usuario cierra el browser, verificamos si el pago llegó
      pollBalanceUntilUpdated(previousBalance)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo iniciar el pago')
    } finally {
      setPaying(false)
    }
  }

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
          {loadingBalance ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={s.balanceLabel}>SALDO DISPONIBLE</Text>
              <Text style={s.balanceAmount}>${balance.toLocaleString('es-CO')}</Text>
              <View style={s.tripsRow}>
                <Ionicons name="car-outline" size={15} color="rgba(255,255,255,0.8)" />
                <Text style={s.tripsText}>
                  {tripsAvailable > 0
                    ? `Puedes publicar ${tripsAvailable} viaje${tripsAvailable !== 1 ? 's' : ''}`
                    : 'Saldo insuficiente para publicar viajes'}
                </Text>
              </View>
            </>
          )}
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
            <Text style={s.rechargeTitle}>Selecciona un monto</Text>
            <View style={s.amountsGrid}>
              {AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[s.amountChip, selectedAmount === a.value && s.amountChipActive]}
                  onPress={() => setSelectedAmount(a.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.amountChipText, selectedAmount === a.value && s.amountChipTextActive]}>
                    {a.label}
                  </Text>
                  {selectedAmount === a.value && (
                    <Text style={s.amountChipSub}>
                      {Math.floor(a.value / ROUTE_COMMISSION)} viaje{Math.floor(a.value / ROUTE_COMMISSION) !== 1 ? 's' : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.rechargeBtn, (paying || verifying) && s.rechargeBtnDisabled]}
              onPress={handleRecharge}
              activeOpacity={0.85}
              disabled={paying || verifying}
            >
              {paying || verifying ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.rechargeBtnText}>
                    {verifying ? 'Verificando pago...' : 'Abriendo pago...'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={s.rechargeBtnText}>
                    Recargar ${selectedAmount.toLocaleString('es-CO')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.rechargeNote}>Paga con Nequi, PSE, tarjeta débito/crédito o Bancolombia</Text>
          </View>
        </View>

        {/* Historial */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>HISTORIAL DE MOVIMIENTOS</Text>
          {transactions.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={COLORS.textTertiary} />
              <Text style={s.emptyText}>Sin movimientos</Text>
              <Text style={s.emptySub}>Aquí verás el historial de recargas y cobros por viajes publicados.</Text>
            </View>
          ) : (
            <View style={s.txList}>
              {transactions.map((tx) => (
                <View key={tx.id} style={s.txRow}>
                  <View style={[s.txIcon, { backgroundColor: tx.type === 'recharge' ? `${COLORS.success}15` : `${COLORS.error}12` }]}>
                    <Ionicons
                      name={tx.type === 'recharge' ? 'arrow-down-outline' : 'car-outline'}
                      size={18}
                      color={tx.type === 'recharge' ? COLORS.success : COLORS.error}
                    />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txLabel}>
                      {tx.type === 'recharge' ? 'Recarga' : 'Comisión publicación'}
                    </Text>
                    <Text style={s.txDate}>
                      {new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={[s.txAmount, { color: tx.type === 'recharge' ? COLORS.success : COLORS.error }]}>
                      {tx.type === 'recharge' ? '+' : '-'}${tx.amount.toLocaleString('es-CO')}
                    </Text>
                    <View style={[s.txStatus, { backgroundColor: statusColor(tx.status) + '20' }]}>
                      <Text style={[s.txStatusText, { color: statusColor(tx.status) }]}>
                        {statusLabel(tx.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function statusColor(status: string) {
  switch (status) {
    case 'approved': return COLORS.success
    case 'pending':  return '#F59E0B'
    default:         return COLORS.error
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'approved': return 'Aprobado'
    case 'pending':  return 'Pendiente'
    case 'declined': return 'Rechazado'
    case 'voided':   return 'Anulado'
    default:         return 'Error'
  }
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

  // Balance
  balanceCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', gap: 8, minHeight: 130,
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tripsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tripsText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Info
  infoCard: {
    backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}20`, padding: SPACING.lg,
  },
  infoRow: { flexDirection: 'row', gap: SPACING.md },
  infoIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  infoSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  // Section
  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1, paddingHorizontal: 4 },

  // Recharge
  rechargeCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: SPACING.lg, gap: SPACING.lg,
  },
  rechargeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  amountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  amountChip: {
    flex: 1, minWidth: '45%', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  amountChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  amountChipText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  amountChipTextActive: { color: COLORS.primary },
  amountChipSub: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  rechargeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14,
  },
  rechargeBtnDisabled: { opacity: 0.6 },
  rechargeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rechargeNote: { fontSize: 12, color: COLORS.textTertiary, textAlign: 'center' },

  // Transactions
  txList: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  txDate: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  txStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 },
})
