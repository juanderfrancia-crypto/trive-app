import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Clipboard,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

const REFERRER_REWARD = 2000
const REFERRED_REWARD = 1000

interface ReferredDriver {
  id: string
  name: string
  created_at: string
  first_route_published: boolean
}

const generateCode = (userId: string) =>
  'TRV' + userId.replace(/-/g, '').slice(0, 6).toUpperCase()

export default function ReferralScreen() {
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const user       = useAppStore((s) => s.user)

  const [referralCode,  setReferralCode]  = useState<string | null>(null)
  const [referred,      setReferred]      = useState<ReferredDriver[]>([])
  const [loading,       setLoading]       = useState(true)
  const [savingCode,    setSavingCode]    = useState(false)
  const [copied,        setCopied]        = useState(false)

  const totalEarned = referred.filter((r) => r.first_route_published).length * REFERRER_REWARD

  // ── Load code and referred list ────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      let code = profile?.referral_code as string | null

      // If no code yet, generate and save
      if (!code) {
        code = generateCode(user.id)
        setSavingCode(true)
        await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', user.id)
        setSavingCode(false)
      }

      setReferralCode(code)

      // Load referred drivers
      const { data: referredProfiles } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .eq('referred_by', code)
        .order('created_at', { ascending: false })

      if (referredProfiles) {
        // Check which ones have published at least one route
        const withRoutes = await Promise.all(
          referredProfiles.map(async (p: any) => {
            const { count } = await supabase
              .from('routes')
              .select('id', { count: 'exact', head: true })
              .eq('driver_id', p.id)
            return {
              id:                   p.id,
              name:                 p.name || 'Conductor',
              created_at:           p.created_at,
              first_route_published: (count ?? 0) > 0,
            }
          })
        )
        setReferred(withRoutes)
      }
    } catch {}
    setLoading(false)
  }, [user?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // ── Copy code ──────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!referralCode) return
    Clipboard.setString(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Share via WhatsApp / native share ─────────────────────────────────────
  const handleShare = async () => {
    if (!referralCode) return
    const message =
      `🚗 *¡Únete a Trive como conductor!*\n\n` +
      `Publica tus rutas y gana dinero llevando pasajeros.\n\n` +
      `Usa mi código al registrarte y tu primera publicación te costará solo $${(2000 - REFERRED_REWARD).toLocaleString('es-CO')}:\n\n` +
      `🎁 *Código: ${referralCode}*\n\n` +
      `Descarga la app Trive y empieza hoy.`
    try {
      await Share.share({ message })
    } catch {}
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Referidos</Text>
          <Text style={styles.headerSub}>Gana $2.000 por cada conductor que traigas</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Code card ──────────────────────────────────────────────────── */}
        <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.codeCard}>
          <Text style={styles.codeLabel}>TU CÓDIGO DE REFERIDO</Text>
          {savingCode ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.codeValue}>{referralCode}</Text>
          )}
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
              <Text style={styles.codeBtnText}>{copied ? 'Copiado' : 'Copiar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.codeBtn, styles.codeBtnShare]} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={[styles.codeBtnText, { color: '#25D366' }]}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>¿Cómo funciona?</Text>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Comparte tu código con otros conductores</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Se registran en Trive e ingresan tu código</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>
              Cuando publican su primera ruta, tú recibes{' '}
              <Text style={styles.highlight}>${REFERRER_REWARD.toLocaleString('es-CO')}</Text> en tu billetera
            </Text>
          </View>
          <View style={[styles.step, { marginBottom: 0 }]}>
            <View style={[styles.stepNum, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="gift-outline" size={14} color={COLORS.success} />
            </View>
            <Text style={styles.stepText}>
              El conductor nuevo recibe{' '}
              <Text style={styles.highlight}>${REFERRED_REWARD.toLocaleString('es-CO')}</Text> de descuento en su primera publicación
            </Text>
          </View>
        </View>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{referred.length}</Text>
            <Text style={styles.statLbl}>Referidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{referred.filter((r) => r.first_route_published).length}</Text>
            <Text style={styles.statLbl}>Activos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>
              ${totalEarned.toLocaleString('es-CO')}
            </Text>
            <Text style={styles.statLbl}>Ganado</Text>
          </View>
        </View>

        {/* ── Referred list ──────────────────────────────────────────────── */}
        {referred.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Conductores referidos</Text>
            {referred.map((r) => (
              <View key={r.id} style={styles.referredRow}>
                <View style={styles.referredAvatar}>
                  <Text style={styles.referredInitial}>{r.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referredName}>{r.name}</Text>
                  <Text style={styles.referredDate}>
                    Se unió {new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {r.first_route_published ? (
                  <View style={styles.activePill}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.activePillText}>+$2.000</Text>
                  </View>
                ) : (
                  <View style={styles.pendingPill}>
                    <Ionicons name="time-outline" size={13} color={COLORS.warning} />
                    <Text style={styles.pendingPillText}>Pendiente</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {referred.length === 0 && (
          <View style={styles.emptyWrap}>
            <LinearGradient colors={['#EEF2FF', '#E4EBFF']} style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={28} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Aún no tienes referidos</Text>
            <Text style={styles.emptySub}>Comparte tu código y empieza a ganar</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F4F6FF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.md },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E9EBF2',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F4F6FF', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  headerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  // Code card
  codeCard: {
    borderRadius: 20, padding: SPACING.xl, alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#0E2699', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  codeLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 8 },
  codeValue: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 20 },
  codeActions: { flexDirection: 'row', gap: 12 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  codeBtnShare: { backgroundColor: 'rgba(37,211,102,0.15)', borderColor: 'rgba(37,211,102,0.3)' },
  codeBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // How it works
  howCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: '#E9EBF2',
    shadowColor: '#0E2699', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  howTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  stepText:    { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  highlight:   { fontWeight: '700', color: COLORS.primary },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#E9EBF2', marginBottom: SPACING.lg,
    shadowColor: '#0E2699', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: SPACING.lg },
  statVal: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  statLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#E9EBF2', marginVertical: SPACING.md },

  // List
  listSection: {
    backgroundColor: '#fff', borderRadius: 18, padding: SPACING.lg,
    borderWidth: 1, borderColor: '#E9EBF2',
    shadowColor: '#0E2699', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  referredRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F4F6FF' },
  referredAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  referredInitial: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  referredName:    { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  referredDate:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activePillText:  { fontSize: 11, fontWeight: '700', color: COLORS.success },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pendingPillText: { fontSize: 11, fontWeight: '600', color: COLORS.warning },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: SPACING.xl, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySub:   { fontSize: 13, color: COLORS.textSecondary },
})
