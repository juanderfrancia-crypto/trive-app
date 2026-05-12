import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, ImageBackground, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { usePassengerStats } from '../hooks/usePassengerStats'
import { useDriverEarnings } from '../hooks/useDriverEarnings'
import Toast from '../components/Toast'
import { uploadProfilePhoto, uploadVehiclePhoto } from '../services/photoUpload'
import { supabase } from '../services/supabase'
import { getExpiryStatus } from '../utils/documentHelpers'
import AsyncStorage from '@react-native-async-storage/async-storage'
import AdminMenuButton from '../components/AdminMenuButton'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { useActiveBookingsWithChat, ActiveBookingChat } from '../hooks/useActiveBookingsWithChat'
import { getTripUnreadCountFrom, subscribeTripMessages } from '../services/trip_messages'


// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation   = useNavigation<any>()
  const { user, logout: logoutStore } = useAppStore()
  const { logout: logoutAuth } = useAuth()
  const { profile, loading: profileLoading, switchRole, fetchProfile } = useProfile(user?.id)

  const [isDriver, setIsDriver]           = useState(() => user?.role === 'driver')
  const [isLoading, setIsLoading]         = useState(false)
  const [editNameVisible, setEditNameVisible] = useState(false)
  const [newName, setNewName]             = useState('')
  const [savingName, setSavingName]       = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false)
  const [shouldLogout, setShouldLogout]   = useState(false)
  const [toastVisible, setToastVisible]   = useState(false)
  const [toastMessage, setToastMessage]   = useState('')
  const [toastType, setToastType]         = useState<'success' | 'error' | 'info'>('success')
  const [driverVehicle, setDriverVehicle] = useState<any>(null)
  const [recentRoutes, setRecentRoutes]   = useState<any[]>([])
  const [driverDocs, setDriverDocs]       = useState<Record<string, any>>({})

  // Chat
  const { bookings: activeBookings, refetch: refetchActiveBookings } = useActiveBookingsWithChat(
    !isDriver ? user?.id : undefined
  )
  const [chatsListVisible, setChatsListVisible]   = useState(false)
  const [chatModalVisible, setChatModalVisible]   = useState(false)
  const [selectedChat, setSelectedChat]           = useState<ActiveBookingChat | null>(null)
  const [hiddenChatIds, setHiddenChatIds]         = useState<Set<string>>(new Set())
  const [unreadCounts, setUnreadCounts]           = useState<Record<string, number>>({})
  const chatChannelsRef = useRef<Record<string, () => void>>({})
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const HIDDEN_CHATS_KEY = 'hidden_active_chats'

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_CHATS_KEY).then((raw) => {
      if (raw) setHiddenChatIds(new Set(JSON.parse(raw)))
    })
  }, [])

  const saveHiddenChats = async (ids: Set<string>) => {
    await AsyncStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify([...ids]))
  }

  const hideChat = (bookingId: string) => {
    Alert.alert('Eliminar chat', '¿Quieres eliminar este chat?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          const next = new Set(hiddenChatIds)
          next.add(bookingId)
          setHiddenChatIds(next)
          saveHiddenChats(next)
        },
      },
    ])
  }

  const visibleChats = activeBookings.filter((b) => !hiddenChatIds.has(b.bookingId))

  // Hooks called unconditionally, ID gated
  const { earnings, loadEarnings } = useDriverEarnings(isDriver ? user?.id : undefined)
  const { stats: passengerStats, refetch: refetchStats } = usePassengerStats(!isDriver ? user?.id : undefined)

  // ── Role sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.role) setIsDriver(profile.role === 'driver')
  }, [profile?.role])

  useEffect(() => {
    if (!profile && user?.role) setIsDriver(user.role === 'driver')
  }, [user?.role, profile])

  // ── Focus refresh ──────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    if (isDriver && user?.id) {
      loadEarnings()
      loadDriverData()
    } else {
      refetchStats()
      refetchActiveBookings()
    }
  }, [isDriver, user?.id]))

  useEffect(() => {
    if (!user || !activeBookings.length) return

    activeBookings.forEach((b) => {
      getTripUnreadCountFrom(b.routeId, user.id, b.driverId)
        .then((count) => setUnreadCounts((prev) => ({ ...prev, [b.routeId]: count })))
        .catch(() => {})

      if (!chatChannelsRef.current[b.routeId]) {
        const unsub = subscribeTripMessages(b.routeId, user!.id, b.driverId, () => {
          getTripUnreadCountFrom(b.routeId, user!.id, b.driverId)
            .then((count) => setUnreadCounts((prev) => ({ ...prev, [b.routeId]: count })))
            .catch(() => {})
        })
        chatChannelsRef.current[b.routeId] = unsub
      }
    })

    return () => {
      Object.values(chatChannelsRef.current).forEach((fn) => fn())
      chatChannelsRef.current = {}
    }
  }, [activeBookings, user?.id])

  // ── Driver vehicle + route history ─────────────────────────────────────────
  const loadDriverData = useCallback(async () => {
    if (!user?.id) return
    const [{ data: route }, { data: routes }, { data: docs }] = await Promise.all([
      supabase
        .from('routes')
        .select('id, vehicle_make, vehicle_model, vehicle_plate, vehicle_type, vehicle_photo_url, vehicle_year, vehicle_color')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('routes')
        .select('id, origin, destination, departure_time, price_per_seat, status, total_seats')
        .eq('driver_id', user.id)
        .eq('status', 'completed')
        .order('departure_time', { ascending: false })
        .limit(4),
      supabase
        .from('driver_documents')
        .select('document_type, status, expiry_date')
        .eq('driver_id', user.id),
    ])
    if (route) setDriverVehicle(route)
    setRecentRoutes(routes ?? [])
    if (docs) {
      const docsMap: Record<string, any> = {}
      docs.forEach((d) => { docsMap[d.document_type] = d })
      setDriverDocs(docsMap)
    }
  }, [user?.id])

  // ── Logout ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (shouldLogout) { performLogout(); setShouldLogout(false) }
  }, [shouldLogout])

  const handleLogout = () =>
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', style: 'destructive', onPress: () => setShouldLogout(true) },
    ], { cancelable: false })

  const performLogout = async () => {
    try { showToast('Cerrando sesión...', 'info'); await logoutAuth(); logoutStore() }
    catch { logoutStore() }
  }

  // ── Role switch ────────────────────────────────────────────────────────────
  const handleBecomeDriver = () => navigation.navigate('DriverOnboarding')

  const handleSwitchToPassenger = async () => {
    if (!user?.id || isLoading) return
    try {
      setIsLoading(true)
      const result = await switchRole(user.id, 'passenger')
      if (result) { setIsDriver(false); showToast('Ahora eres pasajero') }
    } catch { Alert.alert('Error', 'No se pudo cambiar el rol.') }
    finally { setIsLoading(false) }
  }

  // ── Name edit ─────────────────────────────────────────────────────────────
  const openEditName = () => { setNewName(user?.name || ''); setEditNameVisible(true) }

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) return
    if (!user?.id) return
    try {
      setSavingName(true)
      const { error } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id)
      if (error) throw error
      useAppStore.getState().setUser({ ...user, name: newName.trim() })
      setEditNameVisible(false)
      showToast('Nombre actualizado')
    } catch { showToast('No se pudo guardar el nombre', 'error') }
    finally { setSavingName(false) }
  }

  // ── Photo ──────────────────────────────────────────────────────────────────
  const handleProfilePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8,
      })
      if (!result.canceled && result.assets[0] && user?.id) {
        setUploadingPhoto(true)
        await uploadProfilePhoto(user.id, result.assets[0].uri)
        await fetchProfile(user.id)
        showToast('Foto de perfil actualizada')
      }
    } catch (e: any) { showToast(e.message || 'Error al subir la foto', 'error') }
    finally { setUploadingPhoto(false) }
  }

  const handleVehiclePhotoUpload = async () => {
    if (!user?.id || uploadingVehiclePhoto) return
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        showToast('Necesitamos acceso a la galería para cambiar la foto del vehículo', 'error')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      })
      if (result.canceled || !result.assets[0]?.uri) return
      setUploadingVehiclePhoto(true)
      const routeId = driverVehicle?.id != null ? String(driverVehicle.id) : null
      await uploadVehiclePhoto(user.id, routeId, result.assets[0].uri)
      await fetchProfile(user.id)
      await loadDriverData()
      showToast('Foto del vehículo actualizada')
    } catch (e: any) {
      showToast(e?.message || 'No se pudo subir la foto del vehículo', 'error')
    } finally {
      setUploadingVehiclePhoto(false)
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg); setToastType(type); setToastVisible(true)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const avatarUri  = user?.avatar_url || profile?.avatar_url
  const initials   = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const rating     = (profile?.rating ?? 0).toFixed(1)
  const yearsOnApp = profile?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : 1
  const membershipLabels: Record<string, string> = {
    premium: 'USUARIO PREMIUM', basic: 'USUARIO BÁSICO', vip: 'USUARIO VIP', free: 'PASAJERO'
  }
  const membershipLabel = membershipLabels[user?.membership_type ?? 'free'] ?? 'PASAJERO'

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const AvatarCircle = ({ size = 80, showBadge = true }: { size?: number; showBadge?: boolean }) => (
    <TouchableOpacity
      style={[s.avatarWrap, { width: size, height: size, borderRadius: RADIUS.lg }]}
      onPress={handleProfilePhotoUpload}
      disabled={uploadingPhoto}
      activeOpacity={0.85}
    >
      {uploadingPhoto
        ? <View style={[s.avatarBg, { width: size, height: size, borderRadius: RADIUS.lg }]}><ActivityIndicator color="#fff" /></View>
        : avatarUri
          ? <Image source={{ uri: avatarUri }} style={{ width: size, height: size, borderRadius: RADIUS.lg }} />
          : <LinearGradient colors={[COLORS.primaryDark, '#0a2a6e']} style={[s.avatarBg, { width: size, height: size, borderRadius: RADIUS.lg }]}>
              <Text style={[s.avatarInitial, { fontSize: size * 0.35 }]}>{initials}</Text>
            </LinearGradient>
      }
      {showBadge && (
        <View style={s.avatarBadge}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  )

  // ── PASSENGER VIEW ────────────────────────────────────────────────────────
  const PassengerView = () => (
    <>
      {/* Profile row */}
      <View style={pv.profileRow}>
        <AvatarCircle size={72} />
        <View style={pv.profileInfo}>
          <TouchableOpacity style={pv.nameRow} onPress={openEditName} activeOpacity={0.7}>
            <Text style={pv.name} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <View style={pv.premiumBadge}>
            <Ionicons name="star" size={11} color="#92400E" />
            <Text style={pv.premiumText}>{membershipLabel}</Text>
          </View>
        </View>
      </View>

      {/* CTA card */}
      <View style={s.section}>
        <TouchableOpacity onPress={handleBecomeDriver} activeOpacity={0.88}>
          <ImageBackground source={require('../../assets/banners/modoc.png')} style={pv.ctaCard} resizeMode="cover" imageStyle={{ borderRadius: RADIUS.xl }}>
            <View style={pv.ctaOverlay} pointerEvents="none" />
            <View style={pv.ctaOportunidad}>
              <Text style={pv.ctaOportunidadText}>OPORTUNIDAD</Text>
            </View>
            <Text style={pv.ctaTitle}>Gana dinero con{'\n'}Trive</Text>
            <Text style={pv.ctaSub}>Convierte tu tiempo libre en ingresos extra manejando con nosotros.</Text>
            <View style={pv.ctaBtn}>
              <Text style={pv.ctaBtnText}>Cambiar a modo Conductor</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      {/* Quick stat: Mis Viajes + Mis Chats */}
      <View style={s.section}>
        <View style={pv.statsRow}>
          <TouchableOpacity style={pv.statCard} onPress={() => navigation.navigate('TripHistory')} activeOpacity={0.8}>
            <ImageBackground source={require('../../assets/banners/viajesp.png')} style={pv.statCardBg} resizeMode="cover" imageStyle={{ borderRadius: RADIUS.lg }}>
              <View style={pv.statCardOverlay} pointerEvents="none" />
              <View style={pv.statIcon}><Ionicons name="time-outline" size={24} color="#fff" /></View>
              <Text style={pv.statTitleW}>Mis Viajes</Text>
              <Text style={pv.statSubW}>{passengerStats?.totalTrips ?? 0} completados</Text>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={pv.statCard}
            onPress={() => setChatsListVisible(true)}
            activeOpacity={0.8}
          >
            <ImageBackground source={require('../../assets/banners/chats.png')} style={pv.statCardBg} resizeMode="cover" imageStyle={{ borderRadius: RADIUS.lg }}>
              <View style={pv.statCardOverlay} pointerEvents="none" />
              <View style={[pv.statIcon, { position: 'relative' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                {totalUnread > 0 && (
                  <View style={pv.chatBadge}>
                    <Text style={pv.chatBadgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                  </View>
                )}
              </View>
              <Text style={pv.statTitleW}>Mis Chats</Text>
              <Text style={pv.statSubW}>
                {activeBookings.length > 0
                  ? `${activeBookings.length} activo${activeBookings.length !== 1 ? 's' : ''}`
                  : 'Sin chats activos'}
              </Text>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      </View>


      {/* Centro de Ayuda */}
      <View style={s.section}>
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('Help')} activeOpacity={0.8}>
          <View style={pv.helpRow}>
            <View style={pv.helpIcon}><Ionicons name="headset" size={22} color="#B45309" /></View>
            <View style={pv.helpText}>
              <Text style={pv.payName}>Centro de Ayuda</Text>
              <Text style={pv.paySub}>Soporte 24/7 disponible</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Configuración (reemplaza opciones del menú hamburguesa) */}
      <View style={s.section}>
        <TouchableOpacity style={pv.secondaryActionBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          <Ionicons name="settings-outline" size={18} color={COLORS.accentLight} />
          <Text style={pv.secondaryActionText}>Configuración</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.accentLight} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={pv.footer}>TRIVE V1.0.0 • 2026</Text>
      <View style={{ height: SPACING.xxxl }} />
    </>
  )

  // ── DRIVER VIEW ───────────────────────────────────────────────────────────
  const DriverView = () => {
    const vehicleName = driverVehicle
      ? [driverVehicle.vehicle_make, driverVehicle.vehicle_model].filter(Boolean).join(' ') || 'Vehículo'
      : '—'
    const totalTrips = earnings?.completedTrips ?? profile?.total_trips ?? 0
    const monthEarnings = earnings?.thisMonthEarnings ?? 0

    return (
      <>
        {/* Hero card */}
        <View style={dv.hero}>
          <View style={dv.heroAvatar}>
            <AvatarCircle size={90} showBadge={false} />
            <View style={dv.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color="#FBBF24" />
            </View>
          </View>
          <TouchableOpacity style={dv.heroNameRow} onPress={openEditName} activeOpacity={0.7}>
            <Text style={dv.heroName}>{user?.name || 'Conductor'}</Text>
            <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={dv.conductorBadge}>
            <Text style={dv.conductorBadgeText}>CONDUCTOR VERIFICADO</Text>
          </View>
          <View style={dv.heroStats}>
            <View style={dv.heroStat}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={dv.heroStatVal}>{rating}</Text>
            </View>
            <View style={dv.heroStatSep} />
            <View style={dv.heroStat}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={dv.heroStatVal}>{yearsOnApp} {yearsOnApp === 1 ? 'año' : 'años'} en Trive</Text>
            </View>
            <View style={dv.heroStatSep} />
            <View style={dv.heroStat}>
              <Ionicons name="car-outline" size={14} color={COLORS.textSecondary} />
              <Text style={dv.heroStatVal}>{totalTrips} viajes</Text>
            </View>
          </View>
        </View>

        {/* Billetera + Métodos de pago */}
        <View style={s.section}>
          <TouchableOpacity style={dv.walletBtn} onPress={() => navigation.navigate('Wallet' as never)} activeOpacity={0.8}>
            <View style={dv.walletLeft}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <View>
                <Text style={dv.walletLabel}>Mi Billetera</Text>
                <Text style={dv.walletSub}>Saldo para publicar viajes</Text>
              </View>
            </View>
            <View style={dv.walletRight}>
              <Text style={dv.walletBalance}>${(user?.balance ?? 0).toLocaleString('es-CO')}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={dv.walletBtn} onPress={() => navigation.navigate('DriverPaymentMethods' as never)} activeOpacity={0.8}>
            <View style={dv.walletLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color="#6C1FC6" />
              <View>
                <Text style={dv.walletLabel}>Métodos de pago</Text>
                <Text style={dv.walletSub}>Nequi y Daviplata</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Ganancias del mes */}
        <View style={s.section}>
          <ImageBackground source={require('../../assets/banners/Ganancias.png')} style={dv.earningsCard} resizeMode="cover" imageStyle={{ borderRadius: RADIUS.xl }}>
            <View style={dv.cardOverlay} pointerEvents="none" />
            <Text style={dv.earningsLabel}>GANANCIAS DEL MES</Text>
            <Text style={dv.earningsAmount}>
              ${monthEarnings.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <TouchableOpacity style={dv.detailsBtn} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.7}>
              <Text style={dv.detailsText}>Ver detalles</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.accentLight} />
            </TouchableOpacity>
          </ImageBackground>
        </View>

        {/* Acciones del conductor (mover desde hamburguesa) */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CONDUCTOR</Text>
          <View style={s.menuCard}>
            <TouchableOpacity
              style={dv.actionRow}
              onPress={() => navigation.navigate('DriverPanel')}
              activeOpacity={0.7}
            >
              <View style={[dv.actionIcon, { backgroundColor: `${COLORS.primary}12` }]}>
                <Ionicons name="speedometer-outline" size={20} color={COLORS.accentLight} />
              </View>
              <View style={dv.actionInfo}>
                <Text style={dv.actionTitle}>Panel del Conductor</Text>
                <Text style={dv.actionSub}>Gestiona viajes y estado</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity
              style={dv.actionRow}
              onPress={() => navigation.navigate('DriverRegister')}
              activeOpacity={0.7}
            >
              <View style={[dv.actionIcon, { backgroundColor: `${COLORS.success}12` }]}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.success} />
              </View>
              <View style={dv.actionInfo}>
                <Text style={dv.actionTitle}>Crear Ruta</Text>
                <Text style={dv.actionSub}>Publica un nuevo viaje</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Viajes completados */}
        <View style={s.section}>
          <ImageBackground source={require('../../assets/banners/viajesc.png')} style={dv.tripsCard} resizeMode="cover" imageStyle={{ borderRadius: RADIUS.xl }}>
            <View style={dv.cardOverlay} pointerEvents="none" />
            <View style={dv.tripsIcon}><Ionicons name="swap-horizontal-outline" size={22} color="#fff" /></View>
            <Text style={dv.tripsLabel}>VIAJES COMPLETADOS</Text>
            <View style={dv.tripsCountRow}>
              <Text style={dv.tripsCount}>{totalTrips}</Text>
              {(earnings?.pendingAmount ?? 0) > 0 && (
                <View style={dv.tripsTodayPill}>
                  <Text style={dv.tripsTodayText}>+pendientes</Text>
                </View>
              )}
            </View>
            <Text style={dv.tripsMotivation}>
              {totalTrips > 0
                ? `Llevas ${totalTrips} viajes completados. ¡Sigue así!`
                : 'Completa tu primer viaje para empezar a ganar.'}
            </Text>
          </ImageBackground>
        </View>

        {/* Mi Vehículo */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Mi Vehículo</Text>
          </View>
          <Text style={s.sectionSub}>Información técnica activa. Toca la foto para cambiarla.</Text>

          <View style={dv.vehicleCard}>
            <TouchableOpacity
              style={dv.vehiclePhotoWrap}
              onPress={handleVehiclePhotoUpload}
              disabled={uploadingVehiclePhoto}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto del vehículo"
            >
              {profile?.vehicle_photo_url || driverVehicle?.vehicle_photo_url ? (
                <Image
                  source={{ uri: profile?.vehicle_photo_url || driverVehicle?.vehicle_photo_url }}
                  style={dv.vehiclePhoto}
                />
              ) : (
                <View style={dv.vehiclePhotoEmpty}>
                  <Ionicons name="car" size={36} color={COLORS.accentLight} />
                  <Text style={dv.vehiclePhotoEmptyHint}>Añadir foto</Text>
                </View>
              )}
              {uploadingVehiclePhoto ? (
                <View style={dv.vehiclePhotoLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={dv.vehiclePhotoEditBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={dv.vehicleInfo}>
              <Text style={dv.vehicleName}>{vehicleName}</Text>
              <View style={dv.vehicleMeta}>
                {driverVehicle?.vehicle_plate && (
                  <Text style={dv.vehiclePlate}>{driverVehicle.vehicle_plate}</Text>
                )}
                {driverVehicle?.vehicle_year && (
                  <Text style={dv.vehicleMetaText}>{driverVehicle.vehicle_year}</Text>
                )}
                {driverVehicle?.vehicle_color && (
                  <Text style={dv.vehicleMetaText}>{driverVehicle.vehicle_color}</Text>
                )}
              </View>
              <View style={dv.vehicleStatus}>
                {(() => {
                  const docValues = Object.values(driverDocs)
                  const hasExpired = docValues.some((d: any) => d.status === 'expired' || getExpiryStatus(d.expiry_date)?.isExpired)
                  const hasPending = docValues.some((d: any) => d.status === 'pending' || d.status === 'verifying')
                  const allVerified = docValues.length > 0 && docValues.every((d: any) => d.status === 'verified')
                  const color = hasExpired ? COLORS.error : hasPending ? COLORS.warning : allVerified ? COLORS.success : COLORS.textTertiary
                  const label = hasExpired ? 'DOC. VENCIDO' : hasPending ? 'EN VERIFICACIÓN' : allVerified ? 'ESTADO: ÓPTIMO' : 'SIN DOCUMENTOS'
                  return (
                    <>
                      <View style={[dv.statusDot, { backgroundColor: color }]} />
                      <Text style={[dv.statusText, { color }]}>{label}</Text>
                    </>
                  )
                })()}
              </View>
            </View>
            <TouchableOpacity
              style={dv.editVehicleBtn}
              onPress={() => navigation.navigate('EditVehicle', { vehicle: driverVehicle })}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
              <Text style={dv.editVehicleBtnText}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Documentos del conductor */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documentos del Conductor</Text>
          <View style={s.menuCard}>
            {[
              { type: 'soat',     label: 'SOAT',                  icon: 'document-text-outline' },
              { type: 'licencia', label: 'Licencia de Conducir',  icon: 'id-card-outline'       },
            ].map(({ type, label, icon }, idx) => {
              const doc = driverDocs[type]
              const expiry = doc ? getExpiryStatus(doc.expiry_date) : null
              const isExpired = expiry?.isExpired || doc?.status === 'expired'
              const statusLabel = !doc
                ? 'Sin documento'
                : doc.status === 'pending' || doc.status === 'verifying'
                ? 'Pendiente de verificación'
                : isExpired
                ? 'VENCIDO'
                : expiry
                ? expiry.label
                : 'Vigente'
              const statusColor = !doc || doc.status === 'pending' || doc.status === 'verifying'
                ? COLORS.textTertiary
                : isExpired
                ? COLORS.error
                : expiry && expiry.daysLeft < 30
                ? COLORS.warning
                : COLORS.success
              const statusIcon = isExpired ? 'alert-circle' : doc?.status === 'verified' ? 'checkmark-circle' : 'time-outline'
              return (
                <View key={type}>
                  {idx > 0 && <View style={s.divider} />}
                  <View style={dv.docRow}>
                    <View style={dv.docIcon}><Ionicons name={icon as any} size={20} color={COLORS.accentLight} /></View>
                    <View style={dv.docInfo}>
                      <Text style={dv.docTitle}>{label}</Text>
                      <Text style={[dv.docSub, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Ionicons name={statusIcon as any} size={22} color={statusColor} />
                  </View>
                </View>
              )
            })}
          </View>
          <TouchableOpacity style={dv.updateDocBtn} onPress={() => navigation.navigate('DriverDocuments')} activeOpacity={0.8}>
            <Text style={dv.updateDocText}>Actualizar Documentación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dv.settingsBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={18} color={COLORS.accentLight} />
            <Text style={dv.settingsBtnText}>Configuración</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accentLight} />
          </TouchableOpacity>
        </View>

        {/* Historial de rutas */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Historial de Rutas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DriverPanel')} activeOpacity={0.7}>
              <Text style={dv.seeAll}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          {recentRoutes.length === 0 ? (
            <View style={dv.emptyRoutes}>
              <Ionicons name="map-outline" size={32} color={COLORS.textTertiary} />
              <Text style={dv.emptyRoutesText}>No hay rutas recientes</Text>
            </View>
          ) : (
            <View style={s.menuCard}>
              {recentRoutes.map((route, idx) => (
                <View key={route.id}>
                  <View style={dv.routeRow}>
                    <View style={dv.routeIcon}><Ionicons name="time-outline" size={18} color={COLORS.accentLight} /></View>
                    <View style={dv.routeInfo}>
                      <Text style={dv.routeName} numberOfLines={1}>
                        {route.origin} → {route.destination}
                      </Text>
                      <Text style={dv.routeMeta}>
                        {new Date(route.departure_time).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(route.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        {route.total_seats ? ` · ${route.total_seats} puestos` : ''}
                      </Text>
                    </View>
                    <View style={dv.routeRight}>
                      <Text style={dv.routePrice}>${(route.price_per_seat ?? 0).toLocaleString('es-CO')}</Text>
                      <View style={[dv.routeStatusPill, route.status === 'completed' && dv.routeStatusDone]}>
                        <Text style={[dv.routeStatusText, route.status === 'completed' && dv.routeStatusTextDone]}>
                          {route.status === 'completed' ? 'COMPLETADO' : route.status?.toUpperCase() ?? 'ACTIVO'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {idx < recentRoutes.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {profileLoading && !profile
          ? <View style={s.loadingBox}><ActivityIndicator size="large" color={COLORS.accentLight} /></View>
          : isDriver ? <DriverView /> : <PassengerView />
        }

        {!profileLoading && (
          <View style={s.section}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
              <Text style={s.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />

      {/* Modal editar nombre */}
      <Modal visible={editNameVisible} transparent animationType="fade" onRequestClose={() => setEditNameVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={nm.backdrop} activeOpacity={1} onPress={() => setEditNameVisible(false)} />
          <View style={nm.sheet}>
            <Text style={nm.title}>Editar nombre</Text>
            <TextInput
              style={nm.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Tu nombre completo"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="words"
              autoFocus
              maxLength={60}
            />
            <View style={nm.btnRow}>
              <TouchableOpacity style={nm.cancelBtn} onPress={() => setEditNameVisible(false)}>
                <Text style={nm.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[nm.saveBtn, (savingName || newName.trim().length < 2) && nm.saveBtnDisabled]}
                onPress={handleSaveName}
                disabled={savingName || newName.trim().length < 2}
              >
                {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={nm.saveText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal lista de chats */}
      <Modal visible={chatsListVisible} animationType="slide" transparent onRequestClose={() => setChatsListVisible(false)}>
        <View style={cm.overlay}>
          <View style={cm.sheet}>
            {/* Header */}
            <View style={cm.sheetHeader}>
              <Text style={cm.sheetTitle}>Mis Chats</Text>
              <TouchableOpacity onPress={() => setChatsListVisible(false)} style={cm.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={cm.sheetSub}>Los chats desaparecen cuando el viaje finaliza</Text>

            {visibleChats.length === 0 ? (
              <View style={cm.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textTertiary} />
                <Text style={cm.emptyTitle}>Sin chats activos</Text>
                <Text style={cm.emptyText}>Aparecen aquí mientras tengas una reserva activa</Text>
              </View>
            ) : (
              <ScrollView>
                {visibleChats.map((chat) => {
                  const unread = unreadCounts[chat.routeId] ?? 0
                  return (
                    <TouchableOpacity
                      key={chat.bookingId}
                      style={cm.chatRow}
                      onPress={() => { setSelectedChat(chat); setChatsListVisible(false); setChatModalVisible(true) }}
                      activeOpacity={0.75}
                    >
                      <View style={cm.avatar}>
                        <Text style={cm.avatarText}>{chat.driverName.charAt(0).toUpperCase()}</Text>
                        {chat.routeStatus === 'in_progress' && <View style={cm.activeDot} />}
                      </View>
                      <View style={cm.chatInfo}>
                        <Text style={cm.driverName}>{chat.driverName}</Text>
                        <Text style={cm.routeText} numberOfLines={1}>{chat.origin} → {chat.destination}</Text>
                      </View>
                      {unread > 0 && (
                        <View style={cm.badge}>
                          <Text style={cm.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                        </View>
                      )}
                      <TouchableOpacity style={cm.deleteBtn} onPress={() => hideChat(chat.bookingId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de mensajes */}
      {selectedChat && user && (
        <TripMessagesModal
          visible={chatModalVisible}
          tripId={selectedChat.routeId}
          userId={user.id}
          otherUserId={selectedChat.driverId}
          otherUserName={selectedChat.driverName}
          onClose={() => {
            setChatModalVisible(false)
            getTripUnreadCountFrom(selectedChat.routeId, user.id, selectedChat.driverId)
              .then((count) => setUnreadCounts((prev) => ({ ...prev, [selectedChat.routeId]: count })))
              .catch(() => {})
          }}
        />
      )}

      {/* Acceso admin — solo aparece si user.is_admin === true */}
      <AdminMenuButton onAdminDocumentsPress={() => navigation.navigate('AdminDocuments')} />
    </SafeAreaView>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.lg },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  sectionSub:   { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginTop: 2, marginBottom: SPACING.sm },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: 4, marginTop: SPACING.lg },

  menuCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 56 },

  avatarWrap: { position: 'relative', borderWidth: 3, borderColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  avatarBg:   { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontWeight: '800', color: '#fff' },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: `${COLORS.error}35`,
    paddingVertical: 12,
    marginBottom: SPACING.xl,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
})

// ── Passenger view styles ─────────────────────────────────────────────────────
const pv = StyleSheet.create({
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  premiumText: { fontSize: 11, fontWeight: '800', color: '#92400E', letterSpacing: 0.3 },

  ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, paddingBottom: SPACING.xxl },
  ctaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.xl },
  ctaOportunidad: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  ctaOportunidadText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  ctaTitle: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30, letterSpacing: -0.5, marginBottom: SPACING.sm },
  ctaSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: SPACING.xl },
  ctaBtn:   { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryDark },
  ctaCar: { position: 'absolute', bottom: -15, right: -20 },

  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statCard: {
    flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  statCardBg: { flex: 1, padding: SPACING.lg, gap: 6, minHeight: 120 },
  statCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: RADIUS.lg },
  statTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statSub:   { fontSize: 12, color: COLORS.textSecondary },
  statTitleW: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statSubW:   { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  payRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  payIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  payInfo: { flex: 1 },
  payName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paySub:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  helpRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  helpIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  helpText: { flex: 1 },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  chatBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  secondaryActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: `${COLORS.primary}40`,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  secondaryActionText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  footer: {
    textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: COLORS.textTertiary, letterSpacing: 0.5,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
})

// ── Driver view styles ────────────────────────────────────────────────────────
const dv = StyleSheet.create({
  hero: { padding: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.xxl, alignItems: 'center', backgroundColor: COLORS.background },
  heroAvatar: { position: 'relative', marginBottom: SPACING.md },
  verifiedBadge: { position: 'absolute', bottom: -4, right: -4 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  heroName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  conductorBadge: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: RADIUS.full, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}25`,
  },
  conductorBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.8 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroStat:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatVal: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  heroStatSep: { width: 1, height: 14, backgroundColor: COLORS.borderLight },

  earningsCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.xl,
  },
  earningsLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1, marginBottom: SPACING.sm },
  earningsAmount: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: SPACING.lg },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: SPACING.lg },
  detailsText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  actionRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  actionIcon: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  actionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  tripsCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tripsIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tripsLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  tripsCountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: 4 },
  tripsCount:    { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  tripsTodayPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tripsTodayText:    { fontSize: 11, fontWeight: '700', color: '#fff' },
  tripsMotivation:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginTop: 4 },

  vehicleCard: {
    flexDirection: 'row', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  vehiclePhotoWrap: {
    width: 120,
    height: 110,
    position: 'relative',
    backgroundColor: COLORS.surfaceAlt,
  },
  vehiclePhoto: { width: 120, height: 110, resizeMode: 'cover' },
  vehiclePhotoEmpty: {
    width: 120,
    height: 110,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  vehiclePhotoEmptyHint: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  vehiclePhotoLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehiclePhotoEditBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  vehicleInfo:   { flex: 1, padding: SPACING.md, justifyContent: 'center', gap: 4 },
  vehicleName:   { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  vehicleMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  vehiclePlate:  { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  vehicleMetaText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  vehicleStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  statusText:    { fontSize: 11, fontWeight: '700', color: COLORS.success, letterSpacing: 0.3 },

  editVehicleBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  editVehicleBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  docRow:  { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  docIcon: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: `${COLORS.primary}10`, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  docSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  updateDocBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
    paddingVertical: 12, alignItems: 'center',
  },
  updateDocText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  walletBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  walletRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  walletLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  walletSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  walletBalance: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  settingsBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  seeAll:  { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  routeRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  routeIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.primary}10`, justifyContent: 'center', alignItems: 'center' },
  routeInfo: { flex: 1 },
  routeName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  routeMeta:  { fontSize: 12, color: COLORS.textSecondary },
  routeRight: { alignItems: 'flex-end', gap: 4 },
  routePrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  routeStatusPill: { backgroundColor: COLORS.borderLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  routeStatusDone: { backgroundColor: `${COLORS.success}15` },
  routeStatusText: { fontSize: 9, fontWeight: '800', color: COLORS.textTertiary, letterSpacing: 0.3 },
  routeStatusTextDone: { color: COLORS.success },
  emptyRoutes: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyRoutesText: { fontSize: 14, color: COLORS.textSecondary },
})

// ── Edit name modal styles ────────────────────────────────────────────────────
const nm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40, gap: SPACING.lg,
  },
  title:  { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  input:  {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  btnRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

// ── Chats modal styles ────────────────────────────────────────────────────────
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: SPACING.xxxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetSub: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: 40, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  activeDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: '#fff',
  },
  chatInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  routeText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  deleteBtn: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '12',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
})

