import IllustratedCard from '../components/illustrations/IllustratedCard'
import DriverProfileView from './profile/DriverProfileView'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Platform, StatusBar,
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
import { showSuccess, showError, showInfo } from '../utils/showError'
import { uploadProfilePhoto, uploadVehiclePhoto, regenerateExpiredPhotoUrl } from '../services/photoUpload'
import { supabase } from '../services/supabase'
import { getExpiryStatus } from '../utils/documentHelpers'
import AsyncStorage from '@react-native-async-storage/async-storage'
import AdminMenuButton from '../components/AdminMenuButton'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { useActiveBookingsWithChat, ActiveBookingChat } from '../hooks/useActiveBookingsWithChat'
import { getTripUnreadCountFrom, subscribeTripMessages } from '../services/trip_messages'


// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation   = useNavigation<any>()
  const user        = useAppStore((s) => s.user)
  const logoutStore = useAppStore((s) => s.logout)
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
  const [driverVehicle, setDriverVehicle] = useState<any>(null)
  const [recentRoutes, setRecentRoutes]   = useState<any[]>([])
  const [driverDocs, setDriverDocs]       = useState<Record<string, any>>({})
  const [regeneratedVehiclePhotoUrl, setRegeneratedVehiclePhotoUrl] = useState<string | null>(null)

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

  // Limpiar IDs ocultos huérfanos cuando cargan las reservas
  useEffect(() => {
    if (!activeBookings.length || !hiddenChatIds.size) return
    const activeIds = new Set(activeBookings.map((b) => b.bookingId))
    const cleaned = new Set([...hiddenChatIds].filter((id) => activeIds.has(id)))
    if (cleaned.size !== hiddenChatIds.size) {
      setHiddenChatIds(cleaned)
      AsyncStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify([...cleaned]))
    }
  }, [activeBookings])

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
    console.log('🚗 [loadDriverData] Iniciando carga de datos del vehículo...')
    const [{ data: vehicle }, { data: routes }, { data: docs }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, plate, make, year, color, status, is_active')
        .eq('driver_id', user.id)
        .in('status', ['pending', 'verified'])
        .order('is_active', { ascending: false })
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
    const { data: photoRow } = await supabase
      .from('profiles')
      .select('vehicle_photo_url')
      .eq('id', user.id)
      .maybeSingle()
    if (vehicle) {
      setDriverVehicle({
        id: vehicle.id,
        vehicle_make: vehicle.make,
        vehicle_model: null,
        vehicle_plate: vehicle.plate,
        vehicle_year: vehicle.year,
        vehicle_color: vehicle.color,
        vehicle_status: vehicle.status,
        vehicle_photo_url: photoRow?.vehicle_photo_url ?? null,
      })
    } else {
      setDriverVehicle(null)
    }
    setRecentRoutes(routes ?? [])
    if (docs) {
      const docsMap: Record<string, any> = {}
      docs.forEach((d) => { docsMap[d.document_type] = d })
      setDriverDocs(docsMap)
    }
  }, [user?.id])

  // ── Focus refresh ──────────────────────────────────────────────────────────
  // Configure StatusBar when profile screen gets focus
  useFocusEffect(useCallback(() => {
    StatusBar.setBarStyle('dark-content')
    StatusBar.setBackgroundColor(COLORS.white)
  }, []))

  // ── Focus refresh ──────────────────────────────────────────────────────────
  // isDriverRef lets useFocusEffect read the current value without being a dep,
  // preventing the loop: profile loads → isDriver changes → effect re-fires → loads again.
  const isDriverRef = useRef(isDriver)
  isDriverRef.current = isDriver

  useFocusEffect(useCallback(() => {
    if (isDriverRef.current && user?.id) {
      loadEarnings()
      loadDriverData()
    } else {
      refetchStats()
      refetchActiveBookings()
    }
  }, [user?.id, loadEarnings, loadDriverData, refetchStats, refetchActiveBookings]))

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
      
      // Subir foto y obtener URL nueva
      const newPhotoUrl = await uploadVehiclePhoto(user.id, routeId, result.assets[0].uri)
      
      // ✅ Actualizar inmediatamente el estado con la nueva URL
      if (newPhotoUrl) {
        console.log('✅ [handleVehiclePhotoUpload] URL nueva:', newPhotoUrl.substring(0, 80))
        setRegeneratedVehiclePhotoUrl(newPhotoUrl)
        
        // ✅ CRÍTICO: Actualizar driverVehicle directamente para forzar re-render
        if (driverVehicle) {
          setDriverVehicle({ ...driverVehicle, vehicle_photo_url: newPhotoUrl })
          console.log('✅ [handleVehiclePhotoUpload] driverVehicle actualizado')
        }
      }
      
      // Refrescar datos de BD para sincronizar
      await fetchProfile(user.id)
      await loadDriverData()
      showToast('Foto del vehículo actualizada')
    } catch (e: any) {
      showToast(e?.message || 'No se pudo subir la foto del vehículo', 'error')
    } finally {
      setUploadingVehiclePhoto(false)
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') showError(msg)
    else if (type === 'info') showInfo(msg)
    else showSuccess(msg)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const isFakeEmail = (email?: string | null) =>
    !email || /^[0-9a-f-]{36}@/i.test(email) || email.includes('@sms.local') || email.includes('@trive.local')
  const displayEmail = isFakeEmail(user?.email) ? null : user?.email

  const avatarUri  = user?.avatar_url || profile?.avatar_url
  const initials   = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const rating     = (profile?.rating ?? 0).toFixed(1)
  const yearsOnApp = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0
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
        <AvatarCircle size={100} />
        <View style={pv.profileInfo}>
          <TouchableOpacity style={pv.nameRow} onPress={openEditName} activeOpacity={0.7}>
            <Text style={pv.name} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textTertiary} />
          </TouchableOpacity>
          {user?.email && (
            <Text style={pv.contactInfo} numberOfLines={1}>{user.email}</Text>
          )}
          {user?.phone && (
            <Text style={pv.contactInfo} numberOfLines={1}>{user.phone}</Text>
          )}
          <View style={pv.premiumBadge}>
            <Ionicons name="star" size={12} color="#78350F" />
            <Text style={pv.premiumText}>{membershipLabel}</Text>
          </View>
        </View>
      </View>

      {/* Datos del pasajero */}
      <View style={s.section}>
        <View style={pv.dataCard}>
          {/* Rating */}
          <View style={pv.dataRow}>
            <View style={pv.dataLeft}>
              <View style={pv.dataIcon}><Ionicons name="star" size={18} color={COLORS.warning} /></View>
              <View>
                <Text style={pv.dataLabel}>Calificación</Text>
                <Text style={pv.dataValue}>{(profile?.rating ?? 0).toFixed(1)} / 5.0</Text>
              </View>
            </View>
            <View style={pv.dataRight}>
              <Text style={pv.dataYear}>{yearsOnApp} {yearsOnApp === 1 ? 'año' : 'años'}</Text>
            </View>
          </View>

          {/* Total gastado + Promedio */}
          <View style={pv.dataRowDivider} />
          <View style={pv.dataRow}>
            <View style={pv.dataLeft}>
              <View style={pv.dataIcon}><Ionicons name="wallet" size={18} color="#0040A1" /></View>
              <View>
                <Text style={pv.dataLabel}>Total gastado</Text>
                <Text style={pv.dataValue}>${(passengerStats?.totalSpent ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>
            <View style={pv.dataRight}>
              <Text style={pv.dataYearSmall}>Promedio: ${(passengerStats?.averagePerTrip ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          {/* Miembro desde */}
          <View style={pv.dataRowDivider} />
          <View style={pv.dataRow}>
            <View style={pv.dataLeft}>
              <View style={pv.dataIcon}><Ionicons name="calendar" size={18} color="#78350F" /></View>
              <View>
                <Text style={pv.dataLabel}>Miembro desde</Text>
                <Text style={pv.dataValue}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</Text>
              </View>
            </View>
          </View>

          {/* Método de login */}
          <View style={pv.dataRowDivider} />
          <View style={pv.dataRow}>
            <View style={pv.dataLeft}>
              <View style={pv.dataIcon}><Ionicons name="mail" size={18} color={COLORS.warning} /></View>
              <View>
                <Text style={pv.dataLabel}>Email</Text>
                <Text style={pv.dataValue} numberOfLines={1}>{user?.email || '—'}</Text>
              </View>
            </View>
          </View>

          {user?.phone ? (
            <>
              <View style={pv.dataRowDivider} />
              <View style={pv.dataRow}>
                <View style={pv.dataLeft}>
                  <View style={pv.dataIcon}><Ionicons name="call" size={18} color="#0040A1" /></View>
                  <View>
                    <Text style={pv.dataLabel}>Teléfono</Text>
                    <Text style={pv.dataValue}>{user.phone}</Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* CTA card */}
      <View style={s.section}>
        <TouchableOpacity onPress={handleBecomeDriver} activeOpacity={0.88}>
          <IllustratedCard scene="wheel" tone="brand" style={[pv.ctaCard, { borderRadius: RADIUS.xl }]}>
            <View style={pv.ctaOportunidad}>
              <Text style={pv.ctaOportunidadText}>OPORTUNIDAD</Text>
            </View>
            <Text style={pv.ctaTitle}>Gana dinero con{'\n'}Trive</Text>
            <Text style={pv.ctaSub}>Convierte tu tiempo libre en ingresos extra manejando con nosotros.</Text>
            <View style={pv.ctaBtn}>
              <Text style={pv.ctaBtnText}>Cambiar a modo Conductor</Text>
            </View>
          </IllustratedCard>
        </TouchableOpacity>
      </View>

      {/* Quick stat: Mis Viajes + Mis Chats + Solicitudes Aeropuerto */}
      <View style={s.section}>
        <View style={pv.statsRow}>
          <TouchableOpacity style={pv.statCard} onPress={() => navigation.navigate('TripHistory')} activeOpacity={0.75}>
            <IllustratedCard scene="trips" tone="brand" style={[pv.statCardBg, { borderRadius: RADIUS.lg }]}>
              <View style={pv.statIcon}><Ionicons name="time-outline" size={26} color="#fff" /></View>
              <Text style={pv.statTitleW}>Mis Viajes</Text>
              <Text style={pv.statSubW}>{passengerStats?.totalTrips ?? 0} completados</Text>
              <View style={pv.statProgressBar}>
                <View style={[pv.statProgressFill, { width: `${Math.min(100, ((passengerStats?.totalTrips ?? 0) / 20) * 100)}%` }]} />
              </View>
            </IllustratedCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={pv.statCard}
            onPress={() => setChatsListVisible(true)}
            activeOpacity={0.75}
          >
            <IllustratedCard scene="chat" tone="brand" style={[pv.statCardBg, { borderRadius: RADIUS.lg }]}>
              <View style={[pv.statIcon, { position: 'relative' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
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
              <View style={pv.statProgressBar}>
                <View style={[pv.statProgressFill, { width: `${Math.min(100, ((activeBookings.length ?? 0) / 5) * 100)}%` }]} />
              </View>
            </IllustratedCard>
          </TouchableOpacity>
        </View>
      </View>

      {/* Centro de Ayuda */}
      <View style={s.section}>
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('Help')} activeOpacity={0.75}>
          <View style={pv.helpRow}>
            <View style={pv.helpIcon}><Ionicons name="headset" size={20} color="#78350F" /></View>
            <View style={pv.helpText}>
              <Text style={pv.payName}>Centro de Ayuda</Text>
              <Text style={pv.paySub}>Soporte 24/7 disponible</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>


      {/* Configuración (reemplaza opciones del menú hamburguesa) */}
      <View style={s.section}>
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('Settings')} activeOpacity={0.75}>
          <View style={pv.helpRow}>
            <View style={pv.settingsIcon}><Ionicons name="settings" size={20} color={COLORS.primary} /></View>
            <View style={pv.helpText}>
              <Text style={pv.payName}>Configuración</Text>
              <Text style={pv.paySub}>Ajustes y preferencias</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={pv.footer}>TRIVE V1.0.0 • 2026</Text>
      <View style={{ height: SPACING.xxxl }} />
    </>
  )

  // ── DRIVER VIEW ───────────────────────────────────────────────────────────
  const handleVehiclePhotoError = async () => {
    const currentUrl = regeneratedVehiclePhotoUrl || driverVehicle?.vehicle_photo_url || profile?.vehicle_photo_url
    if (!currentUrl) return
    try {
      const newUrl = await regenerateExpiredPhotoUrl(currentUrl, 'vehicle-photos')
      if (newUrl === currentUrl) return
      setRegeneratedVehiclePhotoUrl(newUrl)
      await supabase.from('profiles').update({ vehicle_photo_url: newUrl }).eq('id', user?.id)
    } catch (err) {
      console.error('Error regenerando URL de foto del vehículo:', err)
    }
  }

  const monthEarnings = earnings?.thisMonthEarnings ?? 0
  const totalTrips = earnings?.completedTrips ?? profile?.total_trips ?? 0
  const vehiclePhotoUrl = regeneratedVehiclePhotoUrl || driverVehicle?.vehicle_photo_url || profile?.vehicle_photo_url || null

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {profileLoading && !profile
          ? <View style={s.loadingBox}><ActivityIndicator size="large" color={COLORS.accentLight} /></View>
          : isDriver ? (
            <DriverProfileView
              user={user}
              profile={profile}
              driverVehicle={driverVehicle}
              driverDocs={driverDocs}
              recentRoutes={recentRoutes}
              monthEarnings={monthEarnings}
              totalTrips={totalTrips}
              rating={rating}
              avatarUri={avatarUri}
              initials={initials}
              displayEmail={displayEmail}
              uploadingPhoto={uploadingPhoto}
              uploadingVehiclePhoto={uploadingVehiclePhoto}
              vehiclePhotoUrl={vehiclePhotoUrl}
              onChangeAvatar={handleProfilePhotoUpload}
              onEditName={openEditName}
              onChangeVehiclePhoto={handleVehiclePhotoUpload}
              onVehiclePhotoError={handleVehiclePhotoError}
              onOpenWallet={() => navigation.navigate('Wallet' as never)}
              onOpenEarnings={() => navigation.navigate('Earnings' as never)}
              onOpenPanel={() => navigation.navigate('DriverPanel' as never)}
              onOpenTrips={() => navigation.navigate('TripHistory' as never)}
              onOpenPaymentMethods={() => navigation.navigate('DriverPaymentMethods' as never)}
              onOpenReferral={() => navigation.navigate('Referral' as never)}
              onOpenSettings={() => navigation.navigate('Settings' as never)}
              onOpenHelp={() => navigation.navigate('Help' as never)}
              onEditVehicle={() => navigation.navigate('EditVehicle' as never, { vehicle: driverVehicle } as never)}
              onLogout={handleLogout}
            />
          ) : <PassengerView />
        }

        {!profileLoading && !isDriver && (
          <View style={s.section}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
              <View style={s.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
              </View>
              <Text style={s.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


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
              <LinearGradient
                colors={(savingName || newName.trim().length < 2) ? [COLORS.border, COLORS.border] : [COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[nm.saveBtn, (savingName || newName.trim().length < 2) && nm.saveBtnDisabled]}
              >
                <TouchableOpacity onPress={handleSaveName} disabled={savingName || newName.trim().length < 2} style={nm.saveBtnInner}>
                  {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={nm.saveText}>Guardar</Text>}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal lista de chats */}
      <Modal visible={chatsListVisible} animationType="slide" transparent onRequestClose={() => setChatsListVisible(false)}>
        <View style={cm.overlay}>
          <View style={cm.sheet}>
            {/* Handle */}
            <View style={cm.handle} />

            {/* Header */}
            <View style={cm.sheetHeader}>
              <View>
                <Text style={cm.sheetTitle}>Mis Chats</Text>
                <Text style={cm.sheetSub}>Los chats desaparecen cuando el viaje finaliza</Text>
              </View>
              <TouchableOpacity onPress={() => setChatsListVisible(false)} style={cm.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {visibleChats.length === 0 ? (
              <View style={cm.empty}>
                <LinearGradient colors={[COLORS.primaryTint, COLORS.primaryTint]} style={cm.emptyIconWrap}>
                  <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primaryLight} />
                </LinearGradient>
                <Text style={cm.emptyTitle}>Sin chats activos</Text>
                <Text style={cm.emptyText}>Aparecen aquí mientras tengas una reserva activa</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={cm.scrollContent} showsVerticalScrollIndicator={false}>
                {visibleChats.map((chat) => {
                  const unread = unreadCounts[chat.routeId] ?? 0
                  return (
                    <TouchableOpacity
                      key={chat.bookingId}
                      style={cm.chatRow}
                      onPress={() => { setSelectedChat(chat); setChatsListVisible(false); setChatModalVisible(true) }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={cm.avatar}
                      >
                        <Text style={cm.avatarText}>{chat.driverName.charAt(0).toUpperCase()}</Text>
                        {chat.routeStatus === 'in_progress' && <View style={cm.activeDot} />}
                      </LinearGradient>

                      <View style={cm.chatInfo}>
                        <View style={cm.chatInfoTop}>
                          <Text style={cm.driverName} numberOfLines={1}>{chat.driverName}</Text>
                          {chat.routeStatus === 'in_progress' && (
                            <View style={cm.inProgressPill}>
                              <Text style={cm.inProgressText}>En curso</Text>
                            </View>
                          )}
                        </View>
                        <View style={cm.routeRow}>
                          <Ionicons name="navigate-outline" size={11} color={COLORS.primary} />
                          <Text style={cm.routeText} numberOfLines={1}>{chat.origin} → {chat.destination}</Text>
                        </View>
                      </View>

                      {unread > 0 && (
                        <View style={cm.badge}>
                          <Text style={cm.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                        </View>
                      )}

                      <TouchableOpacity style={cm.deleteBtn} onPress={() => hideChat(chat.bookingId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={14} color={COLORS.textTertiary} />
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
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.primaryTint,
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.11, shadowRadius: 14, elevation: 5,
  },
  divider: { height: 1, backgroundColor: COLORS.primaryTint, marginLeft: 56 },

  avatarWrap: { position: 'relative', borderWidth: 3, borderColor: COLORS.warning, overflow: 'hidden', shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  avatarBg:   { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontWeight: '800', color: '#fff' },
  avatarBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  logoutIconWrap: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
  contactInfo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
  },
  premiumText: { fontSize: 11, fontWeight: '800', color: '#78350F', letterSpacing: 0.3 },

  ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, paddingBottom: SPACING.xxl },
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
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 8,
  },
  statIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(18,48,184,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  statCardBg: { flex: 1, padding: SPACING.lg, gap: 8, minHeight: 130 },
  statTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statSub:   { fontSize: 12, color: COLORS.textSecondary },
  statTitleW: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statSubW:   { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  statProgressBar: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: SPACING.xs, overflow: 'hidden',
  },
  statProgressFill: {
    height: '100%', backgroundColor: '#fff', borderRadius: 2,
  },

  payRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  payIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  payInfo: { flex: 1 },
  payName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paySub:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  helpRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  helpIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.warning, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  settingsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(18, 48, 184, 0.12)', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  helpText: { flex: 1 },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
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
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.primaryTint,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  secondaryActionText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.2, flex: 1 },

  // Data Card
  dataCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.primaryTint,
    paddingVertical: SPACING.md, overflow: 'hidden',
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  dataRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  dataRowDivider: {
    height: 1, backgroundColor: COLORS.primaryTint, marginVertical: SPACING.xs,
  },
  dataLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  dataIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,64,161,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  dataLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  dataValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  dataRight: { alignItems: 'flex-end' },
  dataYear: { fontSize: 12, fontWeight: '600', color: COLORS.warning },
  dataYearSmall: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  footer: {
    textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: COLORS.textTertiary, letterSpacing: 0.5,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
})

// ── Driver view styles ────────────────────────────────────────────────────────

// ── Edit name modal styles ────────────────────────────────────────────────────
const nm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, paddingBottom: 40, gap: SPACING.lg,
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  title:  { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  input:  {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  btnRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  saveBtnInner: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

// ── Chats modal styles ────────────────────────────────────────────────────────
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: SPACING.xxxl,
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.primaryTint,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryTint,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0E1A4A' },
  sheetSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl },
  empty: { alignItems: 'center', paddingVertical: 48, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyIconWrap: { width: 68, height: 68, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0E1A4A' },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    gap: SPACING.md,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', flexShrink: 0,
    overflow: 'hidden',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  activeDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: '#fff',
  },
  chatInfo: { flex: 1, gap: 4 },
  chatInfoTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontSize: 14, fontWeight: '700', color: '#0E1A4A', flex: 1 },
  inProgressPill: {
    backgroundColor: '#ECFDF5', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  inProgressText: { fontSize: 10, fontWeight: '700', color: COLORS.success },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
})

