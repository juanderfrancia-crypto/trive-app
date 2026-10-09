import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native'
import { Text } from '../components/AppText'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Icon from '../components/Icon'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../services/supabase'
import { useDriverPayments } from './payments/useDriverPayments'
import { useDriverTodayRoutes } from './driver/useDriverTodayRoutes'
import { formatHoraPartes } from './passenger/passengerFormat'
import PublishSheet from '../components/driver/PublishSheet'
import { useCreateRouteGate } from '../hooks/useCreateRouteGate'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DriverHomeScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const setViewingAsPassenger = useAppStore((s) => s.setViewingAsPassenger)
  const { profile, fetchProfile } = useProfile(user?.id)
  const { goToCreateRoute } = useCreateRouteGate(user?.id)
  const [pendingAirportCount, setPendingAirportCount] = useState(0)
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const { payments: pendingPayments, reload: reloadPayments } = useDriverPayments(user?.id)
  const { routes: todayRoutes, reload: reloadTodayRoutes } = useDriverTodayRoutes(user?.id)
  const pendingPaymentsCount = pendingPayments.length

  const loadAirportCount = useCallback(async () => {
    const { count } = await supabase
      .from('airport_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingAirportCount(count ?? 0)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadAirportCount()
      reloadPayments()
    }, [loadAirportCount, reloadPayments])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      loadAirportCount(),
      reloadPayments(),
      reloadTodayRoutes(),
      user?.id ? fetchProfile(user.id) : Promise.resolve(),
    ])
    setRefreshing(false)
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Conductor'
  const initials = (user?.name || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const balance = (user?.balance ?? 0).toLocaleString('es-CO')

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile' as never)}
            activeOpacity={0.75}
            accessibilityLabel="Ir a mi perfil"
          >
            {user?.avatar_url && !avatarBroken ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImg}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <Icon name="Car" size={13} color={COLORS.primary} />
            <Text style={styles.modeText}>Conductor</Text>
          </View>
          <TouchableOpacity onPress={() => setViewingAsPassenger(true)} activeOpacity={0.7}>
            <Text style={styles.switchModeLinkText}>Usar como pasajero</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryCta} onPress={() => setShowPublishMenu(true)} activeOpacity={0.88}>
          <View style={styles.primaryCtaIcon}>
            <Icon name="Plus" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.primaryCtaText}>
            <Text style={styles.primaryCtaTitle}>Publicar ruta</Text>
            <Text style={styles.primaryCtaSub}>Publica cupos para hoy o para después</Text>
          </View>
          <Icon name="ChevronRight" size={18} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Tus rutas de hoy</Text>
        {todayRoutes.length === 0 ? (
          <View style={styles.emptyToday}>
            <Illustration name="proudDriver" width={150} />
            <Text style={styles.emptyTodayText}>No tienes rutas programadas para hoy</Text>
          </View>
        ) : (
          <View style={styles.ridesList}>
            {todayRoutes.map((route) => {
              const hora = formatHoraPartes(route.departure_time)
              const reservados = route.total_seats - route.available_seats
              return (
                <TouchableOpacity
                  key={route.id}
                  style={styles.rideRow}
                  onPress={() => navigation.navigate('DriverPanel' as never)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rideTime}>
                    <Text style={styles.rideHour}>{hora.hora}</Text>
                    <Text style={styles.ridePeriod}>{hora.periodo}</Text>
                    <LinearGradient
                      colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.rideTimeShadow}
                    />
                  </View>
                  <View style={styles.rideMiddle}>
                    <Text style={styles.rideRoute} numberOfLines={1}>{route.origin} → {route.destination}</Text>
                    <Text style={styles.rideSeats}>
                      {reservados} de {route.total_seats} cupos reservados
                      {route.status === 'in_progress' ? ' · En curso' : ''}
                    </Text>
                  </View>
                  <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

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

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Main' as never, { screen: 'Requests' } as never)}
          activeOpacity={0.85}
        >
          <View style={styles.cardIcon}>
            <Icon name="Plane" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Rutas personalizadas</Text>
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

      <PublishSheet
        visible={showPublishMenu}
        onClose={() => setShowPublishMenu(false)}
        onCreateRoute={goToCreateRoute}
        onRecurringRoutes={() => navigation.navigate('RecurringRoutes' as never)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  avatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  modeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primaryTint, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full,
  },
  modeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  switchModeLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, textDecorationLine: 'underline' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.xl },
  emptyToday: { alignItems: 'center', marginTop: SPACING.sm, paddingVertical: SPACING.md },
  emptyTodayText: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm },
  ridesList: { marginTop: SPACING.sm + 2, gap: SPACING.sm + 2 },
  rideRow: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.textPrimary,
    overflow: 'hidden',
  },
  rideTime: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  rideTimeShadow: { position: 'absolute', top: 0, right: -10, bottom: 0, width: 10 },
  rideHour: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  ridePeriod: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  rideMiddle: { flex: 1, justifyContent: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  rideRoute: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  rideSeats: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

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

})
