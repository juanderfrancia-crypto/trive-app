import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image,
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

const BARS = [0.45, 0.7, 0.55, 0.88, 0.65, 0.92, 0.5]

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation   = useNavigation<any>()
  const { user, logout: logoutStore } = useAppStore()
  const { logout: logoutAuth } = useAuth()
  const { profile, loading: profileLoading, switchRole, fetchProfile } = useProfile(user?.id)

  const [isDriver, setIsDriver]           = useState(() => user?.role === 'driver')
  const [isLoading, setIsLoading]         = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false)
  const [shouldLogout, setShouldLogout]   = useState(false)
  const [toastVisible, setToastVisible]   = useState(false)
  const [toastMessage, setToastMessage]   = useState('')
  const [toastType, setToastType]         = useState<'success' | 'error' | 'info'>('success')
  const [driverVehicle, setDriverVehicle] = useState<any>(null)
  const [recentRoutes, setRecentRoutes]   = useState<any[]>([])

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
    }
  }, [isDriver, user?.id]))

  // ── Driver vehicle + route history ─────────────────────────────────────────
  const loadDriverData = useCallback(async () => {
    if (!user?.id) return
    const [{ data: route }, { data: routes }] = await Promise.all([
      supabase
        .from('routes')
        .select('id, vehicle_make, vehicle_model, vehicle_plate, vehicle_type, vehicle_photo_url')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('routes')
        .select('id, origin, destination, departure_time, price_per_seat, status, total_seats')
        .eq('driver_id', user.id)
        .order('departure_time', { ascending: false })
        .limit(4),
    ])
    if (route) setDriverVehicle(route)
    setRecentRoutes(routes ?? [])
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
      style={[s.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={handleProfilePhotoUpload}
      disabled={uploadingPhoto}
      activeOpacity={0.85}
    >
      {uploadingPhoto
        ? <View style={[s.avatarBg, { borderRadius: size / 2 }]}><ActivityIndicator color="#fff" /></View>
        : avatarUri
          ? <Image source={{ uri: avatarUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          : <LinearGradient colors={[COLORS.primaryDark, '#0a2a6e']} style={[s.avatarBg, { borderRadius: size / 2 }]}>
              <Text style={[s.avatarInitial, { fontSize: size * 0.35 }]}>{initials}</Text>
            </LinearGradient>
      }
      {showBadge && (
        <View style={s.avatarBadge}>
          {isDriver
            ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accentLight} />
            : <Ionicons name="settings" size={13} color="#fff" />
          }
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
          <Text style={pv.name} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
          <View style={pv.premiumBadge}>
            <Ionicons name="star" size={11} color="#92400E" />
            <Text style={pv.premiumText}>{membershipLabel}</Text>
          </View>
        </View>
      </View>

      {/* CTA card */}
      <View style={s.section}>
        <TouchableOpacity onPress={handleBecomeDriver} activeOpacity={0.88}>
          <LinearGradient colors={[COLORS.primaryDark, '#0a2a6e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.ctaCard}>
            <View style={pv.ctaOportunidad}>
              <Text style={pv.ctaOportunidadText}>OPORTUNIDAD</Text>
            </View>
            <Text style={pv.ctaTitle}>Gana dinero con{'\n'}Trive</Text>
            <Text style={pv.ctaSub}>Convierte tu tiempo libre en ingresos extra manejando con nosotros.</Text>
            <View style={pv.ctaBtn}>
              <Text style={pv.ctaBtnText}>Cambiar a modo Conductor</Text>
            </View>
            <Ionicons name="car-sport" size={100} color="rgba(255,255,255,0.1)" style={pv.ctaCar} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Quick stat: Mis Viajes (documentos solo en vista conductor) */}
      <View style={s.section}>
        <View style={pv.statsRow}>
          <TouchableOpacity style={pv.statCard} onPress={() => navigation.navigate('TripHistory')} activeOpacity={0.8}>
            <View style={pv.statIcon}><Ionicons name="time-outline" size={24} color={COLORS.accentLight} /></View>
            <Text style={pv.statTitle}>Mis Viajes</Text>
            <Text style={pv.statSub}>{passengerStats?.totalTrips ?? 0} completados</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Métodos de pago */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>MÉTODOS DE PAGO</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={pv.payRow} onPress={() => navigation.navigate('PaymentMethods')} activeOpacity={0.7}>
            <View style={[pv.payIcon, { backgroundColor: '#FFE4EC' }]}>
              <Ionicons name="wallet-outline" size={20} color="#E91E63" />
            </View>
            <View style={pv.payInfo}>
              <Text style={pv.payName}>Nequi</Text>
              <Text style={pv.paySub}>Principal</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.accentLight} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={pv.payRow} onPress={() => navigation.navigate('PaymentMethods')} activeOpacity={0.7}>
            <View style={[pv.payIcon, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="cash-outline" size={20} color="#4B5563" />
            </View>
            <View style={pv.payInfo}>
              <Text style={pv.payName}>Efectivo</Text>
              <Text style={pv.paySub}>Pago al finalizar</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
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
      <Text style={pv.footer}>TRIVE V4.2.0 • HECHO CON SEGURIDAD</Text>
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
        <LinearGradient colors={[COLORS.primaryDark, '#0a2a6e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dv.hero}>
          <View style={dv.heroAvatar}>
            <AvatarCircle size={90} showBadge={false} />
            <View style={dv.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.accentLight} />
            </View>
          </View>
          <Text style={dv.heroName}>{user?.name || 'Conductor'}</Text>
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
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={dv.heroStatVal}>{yearsOnApp} {yearsOnApp === 1 ? 'año' : 'años'} en Trive</Text>
            </View>
            <View style={dv.heroStatSep} />
            <View style={dv.heroStat}>
              <Ionicons name="car-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={dv.heroStatVal}>{totalTrips} viajes</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Ganancias del mes */}
        <View style={s.section}>
          <View style={dv.earningsCard}>
            <Text style={dv.earningsLabel}>GANANCIAS DEL MES</Text>
            <Text style={dv.earningsAmount}>
              ${monthEarnings.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {/* Bar chart */}
            <View style={dv.barsRow}>
              {BARS.map((h, i) => (
                <View key={i} style={dv.barWrap}>
                  <View style={[dv.bar, { height: 40 * h, backgroundColor: i === 5 ? COLORS.primaryDark : `${COLORS.primaryDark}55` }]} />
                </View>
              ))}
            </View>
            <TouchableOpacity style={dv.detailsBtn} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.7}>
              <Text style={dv.detailsText}>Ver detalles</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.accentLight} />
            </TouchableOpacity>
          </View>
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
          <View style={dv.tripsCard}>
            <View style={dv.tripsIcon}><Ionicons name="swap-horizontal-outline" size={22} color={COLORS.accentLight} /></View>
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
          </View>
        </View>

        {/* Mi Vehículo */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Mi Vehículo</Text>
            <Ionicons name="car-outline" size={20} color={COLORS.textTertiary} />
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
              {driverVehicle?.vehicle_plate && (
                <Text style={dv.vehiclePlate}>{driverVehicle.vehicle_plate}</Text>
              )}
              <View style={dv.vehicleStatus}>
                <View style={dv.statusDot} />
                <Text style={dv.statusText}>ESTADO: ÓPTIMO</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Documentos del conductor */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documentos del Conductor</Text>
          <View style={s.menuCard}>
            <View style={dv.docRow}>
              <View style={dv.docIcon}><Ionicons name="document-text-outline" size={20} color={COLORS.accentLight} /></View>
              <View style={dv.docInfo}>
                <Text style={dv.docTitle}>SOAT Vigente</Text>
                <Text style={dv.docSub}>{profile?.is_driver_verified ? 'Documento vigente' : 'Pendiente de verificación'}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={profile?.is_driver_verified ? COLORS.success : COLORS.textTertiary} />
            </View>
            <View style={s.divider} />
            <View style={dv.docRow}>
              <View style={dv.docIcon}><Ionicons name="id-card-outline" size={20} color={COLORS.accentLight} /></View>
              <View style={dv.docInfo}>
                <Text style={dv.docTitle}>Licencia de Conducir</Text>
                <Text style={dv.docSub}>{profile?.is_driver_verified ? 'Verificada' : 'En revisión'}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={profile?.is_driver_verified ? COLORS.success : COLORS.textTertiary} />
            </View>
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
            <TouchableOpacity onPress={() => navigation.navigate('TripHistory')} activeOpacity={0.7}>
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

  avatarWrap: { position: 'relative', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
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
    backgroundColor: COLORS.surface,
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4, marginBottom: 6 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  premiumText: { fontSize: 11, fontWeight: '800', color: '#92400E', letterSpacing: 0.3 },

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
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, gap: 6,
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  statTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statSub:   { fontSize: 12, color: COLORS.textSecondary },

  payRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  payIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  payInfo: { flex: 1 },
  payName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paySub:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  helpRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  helpIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  helpText: { flex: 1 },
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
  hero: { padding: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.xxl, alignItems: 'center' },
  heroAvatar: { position: 'relative', marginBottom: SPACING.md },
  verifiedBadge: { position: 'absolute', bottom: -4, right: -4 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: SPACING.sm },
  conductorBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: RADIUS.full, marginBottom: SPACING.lg,
  },
  conductorBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.8 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroStat:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatVal: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroStatSep: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },

  earningsCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  earningsLabel:  { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1, marginBottom: SPACING.sm },
  earningsAmount: { fontSize: 34, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1, marginBottom: SPACING.lg },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 44, marginBottom: SPACING.md },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:     { width: '100%', borderRadius: 4 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  detailsText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  actionRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  actionIcon: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  actionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  tripsCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tripsIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tripsLabel:    { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1 },
  tripsCountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: 4 },
  tripsCount:    { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1 },
  tripsTodayPill: {
    backgroundColor: `${COLORS.success}15`, paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tripsTodayText:    { fontSize: 11, fontWeight: '700', color: COLORS.success },
  tripsMotivation:   { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginTop: 4 },

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
  vehiclePlate:  { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  vehicleStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  statusText:    { fontSize: 11, fontWeight: '700', color: COLORS.success, letterSpacing: 0.3 },

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

