import IllustratedCard from '../components/illustrations/IllustratedCard'
import { usePassengerBookings } from './passenger/usePassengerBookings'
import DriverProfileView from './profile/DriverProfileView'
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { APP_VERSION_LABEL } from '../config/appInfo'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { usePassengerStats } from '../hooks/usePassengerStats'
import { useDriverEarnings } from '../hooks/useDriverEarnings'
import { showSuccess, showError, showInfo } from '../utils/showError'
import { uploadProfilePhoto, uploadVehiclePhoto, regenerateExpiredPhotoUrl } from '../services/photoUpload'
import { supabase } from '../services/supabase'
import { getExpiryStatus } from '../utils/documentHelpers'
import AdminMenuButton from '../components/AdminMenuButton'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'


// Campos que la app lee del perfil pero que useProfile aún no tipa.
type ProfileExtras = {
  emergency_contact?: { name: string; phone: string } | null
}


// Fila de menú con título, subtítulo y chevron.
function MenuRow({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={pv.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={pv.menuText}>
        <Text style={pv.menuTitle}>{title}</Text>
        <Text style={pv.menuSub}>{sub}</Text>
      </View>
      <Icon name="ChevronRight" size={20} color={COLORS.textTertiary} />
    </TouchableOpacity>
  )
}

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
  const [avatarBroken, setAvatarBroken] = useState(false)
  useEffect(() => { setAvatarBroken(false) }, [user?.avatar_url, profile?.avatar_url])
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false)
  const [shouldLogout, setShouldLogout]   = useState(false)
  const [driverVehicle, setDriverVehicle] = useState<any>(null)
  const [recentRoutes, setRecentRoutes]   = useState<any[]>([])
  const [driverDocs, setDriverDocs]       = useState<Record<string, any>>({})
  const [regeneratedVehiclePhotoUrl, setRegeneratedVehiclePhotoUrl] = useState<string | null>(null)

  // Hooks called unconditionally, ID gated
  const { earnings, loadEarnings } = useDriverEarnings(isDriver ? user?.id : undefined)
  const { stats: passengerStats, refetch: refetchStats } = usePassengerStats(!isDriver ? user?.id : undefined)
  const { bookings: passengerBookings, refetch: refetchPassengerBookings } = usePassengerBookings(!isDriver ? user?.id : undefined)

  // ── Role sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.role) setIsDriver(profile.role === 'driver')
  }, [profile?.role])

  useEffect(() => {
    if (!profile && user?.role) setIsDriver(user.role === 'driver')
  }, [user?.role, profile])

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
      refetchPassengerBookings()
    }
  }, [user?.id, loadEarnings, loadDriverData, refetchStats, refetchPassengerBookings]))

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
  const PassengerView = () => {
    const extras = profile as ProfileExtras | null
    const emergencyContact = extras?.emergency_contact ?? null
    const tripsCount = passengerStats?.totalTrips ?? 0
    const porConfirmar = passengerBookings.filter((b) => b.bookingStatus === 'awaiting_confirmation').length

    return (
      <>
        <Text style={pv.title}>Mi perfil</Text>

        <View style={pv.profileRow}>
          <View style={pv.avatarWrap}>
            <TouchableOpacity style={pv.avatar} onPress={handleProfilePhotoUpload} disabled={uploadingPhoto} activeOpacity={0.85} accessibilityLabel="Cambiar foto de perfil">
              {uploadingPhoto
                ? <ActivityIndicator color={COLORS.primary} />
                : avatarUri && !avatarBroken
                  ? <Image source={{ uri: avatarUri }} style={pv.avatarImg} onError={() => setAvatarBroken(true)} />
                  : <Text style={pv.avatarInitials}>{initials}</Text>}
            </TouchableOpacity>
            <View style={pv.avatarBadge}>
              <Icon name="Camera" size={12} color={COLORS.white} />
            </View>
          </View>
          <View style={pv.profileInfo}>
            <Text style={pv.name} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
            <Text style={pv.meta}>
              Pasajero · ★ {(profile?.rating ?? 0).toFixed(1)} · {tripsCount} {tripsCount === 1 ? 'viaje' : 'viajes'}
            </Text>
            <TouchableOpacity onPress={handleProfilePhotoUpload} disabled={uploadingPhoto} activeOpacity={0.7} style={pv.linkRow}>
              <Icon name="ImagePlus" size={14} color={COLORS.primary} />
              <Text style={pv.linkText}>Cambiar foto de perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={pv.card} onPress={() => navigation.navigate('Settings')} activeOpacity={0.75}>
          <View style={pv.cardText}>
            <Text style={pv.cardTitle}>Contacto de emergencia</Text>
            <Text style={pv.cardSub}>Recibe tu ubicación en un viaje</Text>
          </View>
          {emergencyContact
            ? <View style={pv.pillOk}><Text style={pv.pillOkText}>Configurado</Text></View>
            : <View style={pv.pillWarn}><Text style={pv.pillWarnText}>Sin configurar</Text></View>}
        </TouchableOpacity>

        {/* Entrada para ser conductor: se conserva porque es la única forma de cambiar de modo. */}
        <View style={s.section}>
          <TouchableOpacity onPress={handleBecomeDriver} activeOpacity={0.88}>
            <IllustratedCard illustration="proudDriver" illustrationWidth={96} style={[pv.ctaCard, { borderRadius: RADIUS.xl }]}>
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

        <Text style={pv.sectionLabel}>Mis viajes</Text>
        <View style={pv.group}>
          <MenuRow
            title="Próximos y pendientes"
            sub={porConfirmar > 0 ? `${porConfirmar} por confirmar` : 'Sin viajes por confirmar'}
            onPress={() => navigation.navigate('Search')}
          />
          <View style={pv.rowDivider} />
          <MenuRow title="Historial" sub="Viajes completados y calificaciones" onPress={() => navigation.navigate('TripHistory')} />
          <View style={pv.rowDivider} />
          <MenuRow title="Solicitudes de aeropuerto" sub="Ofertas y chats con conductores" onPress={() => navigation.navigate('Requests')} />
        </View>

        <Text style={pv.sectionLabel}>Cuenta</Text>
        <View style={pv.group}>
          <MenuRow title="Cómo pagas" sub="Efectivo o transferencia a tu conductor" onPress={() => navigation.navigate('PaymentMethods')} />
          <View style={pv.rowDivider} />
          <MenuRow title="Datos personales" sub="Nombre, correo y teléfono" onPress={openEditName} />
          <View style={pv.rowDivider} />
          <MenuRow title="Privacidad y eliminar cuenta" sub="Tus datos y tu cuenta" onPress={() => navigation.navigate('Privacy')} />
        </View>

        <View style={s.section}>
          <TouchableOpacity style={pv.group} onPress={() => navigation.navigate('Help')} activeOpacity={0.75}>
            <View style={pv.helpRow}>
              <View style={pv.helpIcon}><Icon name="Headset" size={20} color={COLORS.primary} /></View>
              <View style={pv.helpText}>
                <Text style={pv.payName}>Centro de Ayuda</Text>
                <Text style={pv.paySub}>Soporte 24/7 disponible</Text>
              </View>
              <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <TouchableOpacity style={pv.group} onPress={() => navigation.navigate('Settings')} activeOpacity={0.75}>
            <View style={pv.helpRow}>
              <View style={pv.settingsIcon}><Icon name="Settings" size={20} color={COLORS.primary} /></View>
              <View style={pv.helpText}>
                <Text style={pv.payName}>Configuración</Text>
                <Text style={pv.paySub}>Ajustes y preferencias</Text>
              </View>
              <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={pv.footer}>Trive · versión {APP_VERSION_LABEL}</Text>
        <View style={{ height: SPACING.xxxl }} />
      </>
    )
  }

  // ── DRIVER VIEW ───────────────────────────────────────────────────────────
  const handleVehiclePhotoError = async () => {
    const currentUrl = regeneratedVehiclePhotoUrl || driverVehicle?.vehicle_photo_url || profile?.vehicle_photo_url
    if (!currentUrl) return
    try {
      const newUrl = await regenerateExpiredPhotoUrl(currentUrl, 'vehicle-photos')
      if (newUrl === currentUrl) return
      setRegeneratedVehiclePhotoUrl(newUrl)
      await supabase.from('profiles').update({ vehicle_photo_url: newUrl }).eq('id', user?.id ?? '')
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
                <Icon name="LogOut" size={18} color="#fff" />
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
  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginTop: SPACING.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginTop: SPACING.lg },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64 },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.textPrimary, borderWidth: 2, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  linkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  card: {
    ...SHADOWS.sm,
    marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  pillOk: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.successLight },
  pillOkText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  pillWarn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.warningLight },
  pillWarnText: { fontSize: 12, fontWeight: '700', color: COLORS.warningDark },


  sectionLabel: {
    marginTop: SPACING.xl, fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  group: { ...SHADOWS.sm, marginTop: SPACING.sm + 2, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  menuSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },

  // Tarjeta de conductor y ayuda/ajustes (fuera del mockup, se conservan)
  ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, paddingBottom: SPACING.xxl },
  ctaOportunidad: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  ctaOportunidadText: { fontSize: 11, fontWeight: '700', color: COLORS.white, letterSpacing: 0.5 },
  ctaTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, lineHeight: 30, letterSpacing: -0.5, marginBottom: SPACING.sm },
  ctaSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: SPACING.xl },
  ctaBtn: { alignSelf: 'stretch', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryDark },
  helpRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  helpIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, justifyContent: 'center', alignItems: 'center',
  },
  settingsIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, justifyContent: 'center', alignItems: 'center',
  },
  helpText: { flex: 1 },
  payName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

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

