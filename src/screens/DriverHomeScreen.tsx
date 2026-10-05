import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../services/supabase'
import { useDriverPayments } from './payments/useDriverPayments'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DriverHomeScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { profile } = useProfile(user?.id)
  const [pendingAirportCount, setPendingAirportCount] = useState(0)
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const { payments: pendingPayments, reload: reloadPayments } = useDriverPayments(user?.id)
  const pendingPaymentsCount = pendingPayments.length

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('airport_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }) => setPendingAirportCount(count ?? 0))
      reloadPayments()
    }, [reloadPayments])
  )

  const firstName = user?.name?.split(' ')[0] ?? 'Conductor'
  const balance = (user?.balance ?? 0).toLocaleString('es-CO')

  const goTo = (screen: string) => {
    setShowPublishMenu(false)
    setTimeout(() => navigation.navigate(screen as never), 150)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.modePill}>
            <Icon name="Car" size={13} color={COLORS.primary} />
            <Text style={styles.modeText}>Conductor</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Illustration name="proudDriver" width={200} />
        </View>

        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Saldo para publicar</Text>
          <Text style={styles.walletValue}>${balance}</Text>
          <Text style={styles.walletHint}>Cada ruta que publicas cuesta $2.000.</Text>
          <TouchableOpacity
            style={styles.walletBtn}
            onPress={() => navigation.navigate('Wallet' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.walletBtnText}>Ver billetera</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.total_trips ?? 0}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>★ {user?.rating ? Number(user.rating).toFixed(1) : '--'}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryCta} onPress={() => setShowPublishMenu(true)} activeOpacity={0.88}>
          <View style={styles.primaryCtaIcon}>
            <Icon name="Plus" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.primaryCtaText}>
            <Text style={styles.primaryCtaTitle}>Publicar ruta</Text>
            <Text style={styles.primaryCtaSub}>Vende cupos para hoy o para después</Text>
          </View>
          <Icon name="ChevronRight" size={18} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AirportFeed' as never)}
          activeOpacity={0.85}
        >
          <View style={styles.cardIcon}>
            <Icon name="Plane" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Viajes especiales</Text>
            <Text style={styles.cardSub}>
              {pendingAirportCount > 0 ? `${pendingAirportCount} solicitudes esperando respuesta` : 'Sin solicitudes pendientes'}
            </Text>
          </View>
          {pendingAirportCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingAirportCount > 99 ? '99+' : pendingAirportCount}</Text>
            </View>
          )}
          <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DriverPayments' as never)}
          activeOpacity={0.85}
        >
          <View style={styles.cardIcon}>
            <Icon name="Banknote" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Pagos por confirmar</Text>
            <Text style={styles.cardSub}>
              {pendingPaymentsCount > 0
                ? `${pendingPaymentsCount} ${pendingPaymentsCount === 1 ? 'pago esperando' : 'pagos esperando'} tu confirmación`
                : 'Sin pagos pendientes de confirmar'}
            </Text>
          </View>
          {pendingPaymentsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingPaymentsCount > 99 ? '99+' : pendingPaymentsCount}</Text>
            </View>
          )}
          <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DriverPanel' as never)}
          activeOpacity={0.85}
        >
          <View style={styles.cardIcon}>
            <Icon name="LayoutDashboard" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Mi panel</Text>
            <Text style={styles.cardSub}>Reservas, pasajeros y estado de tus rutas</Text>
          </View>
          <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {showPublishMenu && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTap} activeOpacity={1} onPress={() => setShowPublishMenu(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>¿Qué quieres hacer?</Text>

            <TouchableOpacity style={styles.sheetItem} onPress={() => goTo('DriverRegister')} activeOpacity={0.8}>
              <View style={styles.sheetIcon}>
                <Icon name="CirclePlus" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetItemTitle}>Crear ruta</Text>
                <Text style={styles.sheetItemSub}>Publica un viaje nuevo ahora</Text>
              </View>
              <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => goTo('RecurringRoutes')} activeOpacity={0.8}>
              <View style={styles.sheetIcon}>
                <Icon name="Repeat" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetItemTitle}>Plantillas de ruta</Text>
                <Text style={styles.sheetItemSub}>Publica tus rutas habituales rápido</Text>
              </View>
              <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primaryTint, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full,
  },
  modeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  walletCard: { ...SHADOWS.md, shadowColor: COLORS.primary, shadowOpacity: 0.28, marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.xl, backgroundColor: COLORS.primary },
  walletLabel: { fontSize: 13, fontWeight: '600', color: COLORS.white, opacity: 0.85 },
  walletValue: { fontSize: 32, fontWeight: '800', color: COLORS.white, marginTop: SPACING.xs, letterSpacing: -0.5 },
  walletHint: { fontSize: 13, color: COLORS.white, opacity: 0.85, marginTop: SPACING.xs, lineHeight: 19 },
  walletBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    marginTop: SPACING.lg, height: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  walletBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },

  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  stat: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },

  primaryCta: {
    marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.textPrimary, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  primaryCtaIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryCtaText: { flex: 1 },
  primaryCtaTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  primaryCtaSub: { fontSize: 13, color: COLORS.white, opacity: 0.75, marginTop: 2 },

  card: {
    ...SHADOWS.sm,
    marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,26,46,0.35)', justifyContent: 'flex-end' },
  overlayTap: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: SPACING.xxxl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.lg },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  sheetIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, alignItems: 'center', justifyContent: 'center' },
  sheetText: { flex: 1 },
  sheetItemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sheetItemSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
})
