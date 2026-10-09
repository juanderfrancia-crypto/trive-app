import { useCallback, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import * as WebBrowser from 'expo-web-browser'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { isDriverRole } from '../utils/userRole'
import { supabase } from '../services/supabase'
import Icon, { type IconName } from '../components/Icon'
import { MIN_REVIEWS_TO_SHOW_RATING } from '../config/reputation'

const ROUTE_COMMISSION = 2000
const TX_PAGE_SIZE = 15
const RECHARGE_MIN = 10000

const AMOUNTS = [
  { label: '$10.000', value: 10000 },
  { label: '$20.000', value: 20000 },
  { label: '$50.000', value: 50000 },
  { label: '$100.000', value: 100000 },
]

interface WalletTx {
  id: string
  amount: number
  type: 'recharge' | 'route_fee'
  status: string
  created_at: string
}

// Etiquetas de cada tipo de movimiento del libro (ver wallet_transactions_type_check).
const WALLET_LABELS: Record<string, string> = {
  recharge: 'Recarga',
  route_fee: 'Publicación de ruta',
  route_fee_refund: 'Devolución de publicación',
  airport_fee: 'Viaje de aeropuerto aceptado',
  airport_refund: 'Reembolso de viaje de aeropuerto',
  referral_bonus: 'Bono por referido',
  referral_discount: 'Descuento de bienvenida',
  admin_credit: 'Ajuste a favor',
  admin_debit: 'Ajuste en contra',
}

// Ícono y color por tipo de movimiento, en vez de solo "recarga vs todo lo demás".
const WALLET_ICONS: Record<string, { icon: IconName; color: string }> = {
  recharge: { icon: 'ArrowDown', color: COLORS.success },
  route_fee: { icon: 'Car', color: COLORS.error },
  route_fee_refund: { icon: 'RefreshCw', color: COLORS.success },
  airport_fee: { icon: 'Plane', color: COLORS.error },
  airport_refund: { icon: 'RefreshCw', color: COLORS.success },
  referral_bonus: { icon: 'Gift', color: COLORS.success },
  referral_discount: { icon: 'Gift', color: COLORS.success },
  admin_credit: { icon: 'Plus', color: COLORS.success },
  admin_debit: { icon: 'Minus', color: COLORS.error },
}

// "Hoy", "Ayer" o el mes (con año si ya no es el actual), para agrupar el historial
// igual que las apps de billetera: nada de una lista plana sin fin.
function txGroupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  const sameYear = d.getFullYear() === now.getFullYear()
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: sameYear ? undefined : 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function WalletScreen() {
  const navigation = useNavigation()
  const user    = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)

  const [balance, setBalance]         = useState<number>(user?.balance ?? 0)
  const [driverStats, setDriverStats] = useState({ rating: 0, trips: 0, reviews: 0 })
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [hasMoreTx, setHasMoreTx] = useState(false)
  const [loadingMoreTx, setLoadingMoreTx] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<number>(10000)
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [paying, setPaying]           = useState(false)
  const [verifying, setVerifying]     = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoadingBalance(true)
    try {
      const [profileRes, txRes, tripsRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('balance, rating').eq('id', user.id).single(),
        supabase.from('wallet_transactions')
          .select('id, amount, type, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, TX_PAGE_SIZE),
        supabase.from('routes')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', user.id)
          .eq('status', 'completed'),
        supabase.from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewee_id', user.id),
      ])
      if (profileRes.data) {
        setDriverStats({
          rating: profileRes.data.rating ?? 0,
          trips: tripsRes.count ?? 0,
          reviews: reviewsRes.count ?? 0,
        })
        const newBalance = profileRes.data.balance ?? 0
        setBalance(newBalance)
        setUser({ ...user, balance: newBalance })
      }
      if (txRes.data) {
        const page = txRes.data as WalletTx[]
        setHasMoreTx(page.length > TX_PAGE_SIZE)
        setTransactions(page.slice(0, TX_PAGE_SIZE))
      }
    } finally {
      setLoadingBalance(false)
    }
  }, [user?.id])

  const loadMoreTransactions = async () => {
    if (!user?.id || loadingMoreTx) return
    setLoadingMoreTx(true)
    try {
      const from = transactions.length
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, amount, type, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, from + TX_PAGE_SIZE)

      const page = (data as WalletTx[]) ?? []
      setHasMoreTx(page.length > TX_PAGE_SIZE)
      setTransactions((prev) => [...prev, ...page.slice(0, TX_PAGE_SIZE)])
    } finally {
      setLoadingMoreTx(false)
    }
  }

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

  const customAmountValue = parseInt(customAmount.replace(/\D/g, ''), 10) || 0
  const effectiveAmount = showCustomAmount ? customAmountValue : selectedAmount

  const handleRecharge = async () => {
    if (!user?.id) return
    if (effectiveAmount < RECHARGE_MIN) {
      Alert.alert('Monto muy bajo', `La recarga mínima es $${RECHARGE_MIN.toLocaleString('es-CO')}.`)
      return
    }
    setPaying(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-wompi-transaction', {
        body: { amount: effectiveAmount },
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

  const initials = (user?.name ?? 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Icon name="ArrowLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Mi Billetera</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={{ alignItems: 'center' }}>
          <Illustration name="addingFunds" width={170} />
        </View>

        {/* Balance card */}
        <View style={s.balanceCard}>
          {loadingBalance ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              {isDriverRole(user) && (
                <View style={s.identityRow}>
                  <View style={s.identityAvatar}>
                    <Text style={s.identityInitials}>{initials}</Text>
                  </View>
                  <View style={s.identityText}>
                    <Text style={s.identityName} numberOfLines={1}>{user?.name ?? 'Conductor'}</Text>
                    <Text style={s.identitySub}>
                      {driverStats.reviews >= MIN_REVIEWS_TO_SHOW_RATING ? `★ ${driverStats.rating.toFixed(1)}` : 'Nuevo en Trive'} ·{driverStats.trips} {driverStats.trips === 1 ? 'ruta' : 'rutas'}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={s.balanceLabel}>SALDO DISPONIBLE</Text>
              <Text style={s.balanceAmount}>${balance.toLocaleString('es-CO')}</Text>
              <View style={s.tripsRow}>
                <Icon name="Car" size={15} color="rgba(255,255,255,0.8)" />
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
              <Icon name="Info" size={20} color={COLORS.primary} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoTitle}>Comisión por viaje publicado</Text>
              <Text style={s.infoSub}>
                Se descuentan $2.000 de tu saldo cada vez que publicas una ruta.
                Si cancelas antes de pulsar "Salir" y la ruta no tiene reservas confirmadas, se devuelven a tu saldo.
              </Text>
            </View>
          </View>
        </View>

        {/* Recargar saldo */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RECARGAR SALDO</Text>
          <View style={s.rechargeCard}>
            <Text style={s.rechargeTitle}>Selecciona un monto</Text>
            <Text style={s.rechargeMin}>Recarga mínima: ${RECHARGE_MIN.toLocaleString('es-CO')}</Text>
            <View style={s.amountsGrid}>
              {AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[s.amountChip, !showCustomAmount && selectedAmount === a.value && s.amountChipActive]}
                  onPress={() => { setSelectedAmount(a.value); setShowCustomAmount(false) }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.amountChipText, !showCustomAmount && selectedAmount === a.value && s.amountChipTextActive]}>
                    {a.label}
                  </Text>
                  {!showCustomAmount && selectedAmount === a.value && (
                    <Text style={s.amountChipSub}>
                      {Math.floor(a.value / ROUTE_COMMISSION)} viaje{Math.floor(a.value / ROUTE_COMMISSION) !== 1 ? 's' : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.amountChip, showCustomAmount && s.amountChipActive]}
                onPress={() => setShowCustomAmount(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.amountChipText, showCustomAmount && s.amountChipTextActive]}>Otro monto</Text>
              </TouchableOpacity>
            </View>

            {showCustomAmount && (
              <View>
                <View style={s.customAmountRow}>
                  <Text style={s.customAmountPrefix}>$</Text>
                  <TextInput
                    style={s.customAmountInput}
                    value={customAmount}
                    onChangeText={(t) => setCustomAmount(t.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="Ej: 15.000"
                    placeholderTextColor={COLORS.textTertiary}
                    autoFocus
                  />
                </View>
                {customAmountValue > 0 && customAmountValue < RECHARGE_MIN && (
                  <Text style={s.customAmountError}>El mínimo es ${RECHARGE_MIN.toLocaleString('es-CO')}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[s.rechargeBtn, (paying || verifying || effectiveAmount < RECHARGE_MIN) && s.rechargeBtnDisabled]}
              onPress={handleRecharge}
              activeOpacity={0.85}
              disabled={paying || verifying || effectiveAmount < RECHARGE_MIN}
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
                  <Icon name="CirclePlus" size={20} color="#fff" />
                  <Text style={s.rechargeBtnText}>
                    Recargar{effectiveAmount > 0 ? ` $${effectiveAmount.toLocaleString('es-CO')}` : ''}
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
              <Icon name="Receipt" size={32} color={COLORS.textTertiary} />
              <Text style={s.emptyText}>Sin movimientos</Text>
              <Text style={s.emptySub}>Aquí verás el historial de recargas y cobros por viajes publicados.</Text>
            </View>
          ) : (
            <View style={s.txList}>
              {transactions.map((tx, i) => {
                const group = txGroupLabel(tx.created_at)
                const showHeader = i === 0 || txGroupLabel(transactions[i - 1].created_at) !== group
                const iconInfo = WALLET_ICONS[tx.type] ?? { icon: 'Receipt' as IconName, color: COLORS.textSecondary }
                return (
                  <View key={tx.id}>
                    {showHeader && (
                      <Text style={[s.txGroupHeader, i === 0 && s.txGroupHeaderFirst]}>{group}</Text>
                    )}
                    <View style={s.txRow}>
                      <View style={[s.txIcon, { backgroundColor: `${iconInfo.color}15` }]}>
                        <Icon name={iconInfo.icon} size={18} color={iconInfo.color} />
                      </View>
                      <View style={s.txInfo}>
                        <Text style={s.txLabel}>
                          {WALLET_LABELS[tx.type] ?? 'Movimiento'}
                        </Text>
                        <Text style={s.txDate}>
                          {new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={s.txRight}>
                        <Text style={[s.txAmount, { color: tx.amount >= 0 ? COLORS.success : COLORS.error }]}>
                          {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('es-CO')}
                        </Text>
                        <View style={[s.txStatus, { backgroundColor: statusColor(tx.status) + '20' }]}>
                          <Text style={[s.txStatusText, { color: statusColor(tx.status) }]}>
                            {statusLabel(tx.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}

              {hasMoreTx && (
                <TouchableOpacity
                  style={s.loadMoreBtn}
                  onPress={loadMoreTransactions}
                  disabled={loadingMoreTx}
                  activeOpacity={0.75}
                >
                  {loadingMoreTx ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <Text style={s.loadMoreText}>Ver más movimientos</Text>
                  )}
                </TouchableOpacity>
              )}
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
    case 'pending':  return COLORS.warning
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },

  // Balance
  balanceCard: {
    ...SHADOWS.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.28,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'stretch', gap: 6, minHeight: 130,
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(8, 45, 102, 0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', marginBottom: 6 },
  identityAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  identityInitials: { color: '#fff', fontWeight: '800', fontSize: 16 },
  identityText: { flex: 1 },
  identityName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  identitySub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  tripsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tripsText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // Info
  infoCard: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.lg, padding: SPACING.lg,
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
    ...SHADOWS.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, gap: SPACING.lg,
  },
  rechargeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  rechargeMin: { fontSize: 12, color: COLORS.textTertiary, marginTop: -SPACING.sm },
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
  customAmountRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  customAmountPrefix: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
  customAmountInput: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, paddingVertical: SPACING.md },
  customAmountError: { fontSize: 12, color: COLORS.error, marginTop: SPACING.xs },
  rechargeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14,
  },
  rechargeBtnDisabled: { opacity: 0.6 },
  rechargeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rechargeNote: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center' },

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
  txDate: { fontSize: 13, color: COLORS.textTertiary, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  txStatusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  txGroupHeader: {
    fontSize: 12, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs,
    backgroundColor: COLORS.surfaceAlt,
  },
  txGroupHeaderFirst: { paddingTop: SPACING.sm },
  loadMoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // Empty
  emptyCard: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 },
})
