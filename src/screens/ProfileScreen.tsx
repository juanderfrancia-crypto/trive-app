import { usePassengerBookings } from './passenger/usePassengerBookings'
import DriverProfileView from './profile/DriverProfileView'
import PassengerProfileView from './profile/PassengerProfileView'
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TextInput, StatusBar } from 'react-native'
import { useKeyboardHeight } from '../hooks/useKeyboardHeight'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { APP_VERSION_LABEL } from '../config/appInfo'
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
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'


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
  // sheet está position:absolute (bottom:0), no reacciona a padding de un
  // contenedor — se le mueve el "bottom" directamente con el alto real del teclado.
  const keyboardHeight = useKeyboardHeight(editNameVisible)
  const [newName, setNewName]             = useState('')
  const [newEmail, setNewEmail]           = useState('')
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)
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
        .select('id, plate, make, year, color, status, is_active, photo_url')
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
    if (vehicle) {
      setDriverVehicle({
        id: vehicle.id,
        vehicle_make: vehicle.make,
        vehicle_model: null,
        vehicle_plate: vehicle.plate,
        vehicle_year: vehicle.year,
        vehicle_color: vehicle.color,
        vehicle_status: vehicle.status,
        vehicle_photo_url: vehicle.photo_url ?? null,
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
    if (!user?.id) return
    fetchProfile(user.id)
    if (isDriverRef.current) {
      loadEarnings()
      loadDriverData()
    } else {
      refetchStats()
      refetchPassengerBookings()
    }
  }, [user?.id, fetchProfile, loadEarnings, loadDriverData, refetchStats, refetchPassengerBookings]))

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

  // ── Datos personales (nombre + correo; el teléfono es la identidad de la cuenta y no se edita aquí) ──
  const openEditName = () => {
    setNewName(user?.name || '')
    setNewEmail(user?.email || '')
    setEmailConfirmationSent(false)
    setEditNameVisible(true)
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) return
    if (!user?.id) return

    const trimmedEmail = newEmail.trim()
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      showToast('Correo inválido', 'error')
      return
    }
    const emailChanged = trimmedEmail && trimmedEmail !== (user.email || '')

    try {
      setSavingName(true)
      const { error } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id)
      if (error) throw error
      useAppStore.getState().setUser({ ...user, name: newName.trim() })

      if (emailChanged) {
        // Esto NO crea una cuenta nueva ni cambia el login (que sigue siendo el teléfono):
        // solo actualiza el correo de contacto del mismo usuario, y Supabase no lo deja
        // efectivo hasta que el dueño del correo confirme el enlace que le llega.
        const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (emailError) throw emailError
        setEmailConfirmationSent(true)
        showToast('Revisa tu correo para confirmar el cambio')
      } else {
        setEditNameVisible(false)
        showToast('Nombre actualizado')
      }
    } catch (err: any) {
      showToast(err?.message?.includes('already') ? 'Ese correo ya está en uso' : 'No se pudo guardar', 'error')
    } finally {
      setSavingName(false)
    }
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
  // ── DRIVER VIEW ───────────────────────────────────────────────────────────
  const handleVehiclePhotoError = async () => {
    const currentUrl = regeneratedVehiclePhotoUrl || driverVehicle?.vehicle_photo_url || profile?.vehicle_photo_url
    if (!currentUrl) return
    try {
      const newUrl = await regenerateExpiredPhotoUrl(currentUrl, 'vehicle-photos')
      if (newUrl === currentUrl) return
      setRegeneratedVehiclePhotoUrl(newUrl)
      if (driverVehicle?.id) {
        await supabase.rpc('set_vehicle_photo', { p_vehicle_id: String(driverVehicle.id), p_url: newUrl })
      }
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
          ) : (
            <PassengerProfileView
              userName={user?.name}
              profile={profile}
              totalTrips={passengerStats?.totalTrips ?? 0}
              pendingConfirmationCount={passengerBookings.filter((b) => b.bookingStatus === 'awaiting_confirmation').length}
              avatarUri={avatarUri}
              avatarBroken={avatarBroken}
              initials={initials}
              uploadingPhoto={uploadingPhoto}
              onChangeAvatar={handleProfilePhotoUpload}
              onAvatarError={() => setAvatarBroken(true)}
              onOpenEmergencyContact={() => navigation.navigate('Settings')}
              onBecomeDriver={handleBecomeDriver}
              onOpenUpcomingTrips={() => navigation.navigate('Search')}
              onOpenHistory={() => navigation.navigate('TripHistory')}
              onOpenRequests={() => navigation.navigate('Requests')}
              onOpenPaymentMethods={() => navigation.navigate('PaymentMethods')}
              onEditName={openEditName}
              onOpenPrivacy={() => navigation.navigate('Privacy')}
              onOpenHelp={() => navigation.navigate('Help')}
              onOpenSettings={() => navigation.navigate('Settings')}
            />
          )
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


      {/* Modal de datos personales */}
      <Modal visible={editNameVisible} transparent animationType="fade" onRequestClose={() => setEditNameVisible(false)}>
        <TouchableOpacity style={nm.backdrop} activeOpacity={1} onPress={() => setEditNameVisible(false)} />
        <View style={[nm.sheet, { bottom: keyboardHeight }]}>
            <Text style={nm.title}>Datos personales</Text>

            <View>
              <Text style={nm.fieldLabel}>Nombre</Text>
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
            </View>

            <View>
              <Text style={nm.fieldLabel}>Correo</Text>
              <TextInput
                style={nm.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Tu correo (opcional)"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={120}
              />
              {emailConfirmationSent && (
                <Text style={nm.hint}>Te enviamos un enlace de confirmación a {newEmail}. Ábrelo para que quede guardado.</Text>
              )}
            </View>

            <View>
              <Text style={nm.fieldLabel}>Teléfono</Text>
              <View style={nm.readOnlyBox}>
                <Text style={nm.readOnlyText}>{user?.phone || 'Sin verificar'}</Text>
              </View>
              <Text style={nm.hint}>Es tu identidad de acceso, no se puede cambiar aquí.</Text>
            </View>

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
      </Modal>

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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input:  {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  readOnlyBox: {
    height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, justifyContent: 'center', backgroundColor: COLORS.background,
  },
  readOnlyText: { fontSize: 15, color: COLORS.textSecondary },
  hint: { fontSize: 12, color: COLORS.textTertiary, marginTop: 6 },
  btnRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 50, borderRadius: RADIUS.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  saveBtnInner: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

