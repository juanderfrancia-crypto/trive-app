import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRoutes } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { insertNotificationForUser } from '../services/notificationInsert'
import { showSuccess, showError } from '../utils/showError'

const ROUTE_COMMISSION = 2000

const VEHICLE_TYPES = [
  { id: 'auto',     name: 'Auto',     maxSeats: 4,  icon: 'car-sport' as const },
  { id: 'taxi',     name: 'Taxi',     maxSeats: 4,  icon: 'car'       as const },
  { id: 'busetica', name: 'Minivan', maxSeats: 15, icon: 'bus'        as const },
  { id: 'buseta',   name: 'Buseta',   maxSeats: 70, icon: 'bus'       as const },
]

const DELAY_OPTIONS   = [0, 5, 10, 15, 20]
const DURATION_OPTIONS = [60, 90, 120, 150, 180, 240]

interface RouteTemplate {
  id: string
  name: string
  origin: string
  destination: string
  price_per_seat: number
  total_seats: number
  vehicle_type: string
  description: string
  created_at: string
}

const toLocalISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const fmtDuration = (mins: number) =>
  mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`

export default function RecurringRoutesScreen() {
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const user       = useAppStore((s) => s.user)
  const setBalance = useAppStore((s) => s.setBalance)
  const { createRoute } = useRoutes()

  // ── Templates ──────────────────────────────────────────────────────────────
  const [templates, setTemplates]     = useState<RouteTemplate[]>([])
  const [tmplLoading, setTmplLoading] = useState(true)

  // ── Vehicle data ───────────────────────────────────────────────────────────
  const [vehicleData,    setVehicleData]    = useState<any>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)

  // ── Create/edit-template modal ─────────────────────────────────────────────
  const [showCreate,  setShowCreate]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<RouteTemplate | null>(null)
  const [fName,    setFName]    = useState('')
  const [fOrigin,  setFOrigin]  = useState('')
  const [fDest,    setFDest]    = useState('')
  const [fPrice,   setFPrice]   = useState('')
  const [fSeats,   setFSeats]   = useState('')
  const [fVehicle, setFVehicle] = useState('auto')
  const [fVia,     setFVia]     = useState('')

  // ── Publish modal ──────────────────────────────────────────────────────────
  const [publishTarget, setPublishTarget]   = useState<RouteTemplate | null>(null)
  const [delayMins,     setDelayMins]       = useState(0)
  const [customDelay,   setCustomDelay]     = useState('')
  const [durationMins,  setDurationMins]    = useState(180)
  const [customDuration, setCustomDuration] = useState('')
  const [pubVia,        setPubVia]          = useState('')
  const [publishing,    setPublishing]      = useState(false)

  // ── Persistence helpers ────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('route_templates')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
      if (!error && data) setTemplates(data)
    } catch {}
    setTmplLoading(false)
  }, [user?.id])

  // ── Vehicle from Supabase ──────────────────────────────────────────────────
  const loadVehicleData = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('routes')
        .select('vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setVehicleData(data)
    } catch {}
    setVehicleLoading(false)
  }, [user?.id])

  useFocusEffect(useCallback(() => { loadTemplates() }, [loadTemplates]))
  useEffect(() => { loadVehicleData() }, [loadVehicleData])

  // ── Reset create form ──────────────────────────────────────────────────────
  const resetForm = () => {
    setFName(''); setFOrigin(''); setFDest(''); setFPrice('')
    setFSeats(''); setFVehicle('auto'); setFVia('')
    setEditTarget(null)
  }

  const openEdit = (tpl: RouteTemplate) => {
    setFName(tpl.name)
    setFOrigin(tpl.origin)
    setFDest(tpl.destination)
    setFPrice(String(tpl.price_per_seat))
    setFSeats(String(tpl.total_seats))
    setFVehicle(tpl.vehicle_type)
    setFVia(tpl.description)
    setEditTarget(tpl)
    setShowCreate(true)
  }

  // ── Add template ───────────────────────────────────────────────────────────
  const handleAddTemplate = async () => {
    if (!fOrigin.trim() || !fDest.trim()) {
      Alert.alert('Campos requeridos', 'Completa origen y destino.')
      return
    }
    const price = parseFloat(fPrice)
    const seats = parseInt(fSeats, 10)
    if (!price || price < 1000) {
      Alert.alert('Precio inválido', 'El precio mínimo es $1.000.')
      return
    }
    const vt = VEHICLE_TYPES.find((v) => v.id === fVehicle)
    if (!seats || seats < 1 || seats > (vt?.maxSeats ?? 70)) {
      Alert.alert('Asientos inválidos', `Ingresa entre 1 y ${vt?.maxSeats} asientos para ${vt?.name}.`)
      return
    }
    if (!user?.id) return
    const autoName = `${fOrigin.trim().split(' - ')[0]} → ${fDest.trim().split(' - ')[0]}`
    const payload = {
      name:           fName.trim() || autoName,
      origin:         fOrigin.trim(),
      destination:    fDest.trim(),
      price_per_seat: price,
      total_seats:    seats,
      vehicle_type:   fVehicle,
      description:    fVia.trim() || null,
    }

    try {
      if (editTarget) {
        const { error } = await supabase
          .from('route_templates')
          .update(payload)
          .eq('id', editTarget.id)
          .eq('driver_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('route_templates')
          .insert({ ...payload, driver_id: user.id })
        if (error) throw error
      }
      await loadTemplates()
      setShowCreate(false)
      resetForm()
    } catch (err: any) {
      showError(err.message || 'No se pudo guardar la plantilla.')
    }
  }

  // ── Delete template ────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert('Eliminar plantilla', '¿Eliminar esta ruta frecuente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('route_templates').delete().eq('id', id)
          setTemplates((prev) => prev.filter((t) => t.id !== id))
        },
      },
    ])
  }

  // ── Publish from template ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!publishTarget || !vehicleData || !user?.id) return
    setPublishing(true)
    try {
      const balance = user?.balance ?? 0
      if (balance < ROUTE_COMMISSION) {
        Alert.alert(
          'Saldo insuficiente',
          `Necesitas $${ROUTE_COMMISSION.toLocaleString('es-CO')} para publicar.\nTu saldo: $${balance.toLocaleString('es-CO')}.`,
          [{ text: 'Ir a billetera', onPress: () => { setPublishTarget(null); navigation.navigate('Wallet' as never) } }, { text: 'Cerrar', style: 'cancel' }]
        )
        return
      }

      const delay    = customDelay.trim()    ? parseInt(customDelay, 10)    : delayMins
      const duration = customDuration.trim() ? parseInt(customDuration, 10) : durationMins
      const now   = new Date()
      const depDt = new Date(now.getTime() + delay * 60000)
      const arrDt = new Date(depDt.getTime() + duration * 60000)

      const routeData = {
        driver_id:      user.id,
        origin:         publishTarget.origin,
        destination:    publishTarget.destination,
        departure_time: toLocalISO(depDt),
        arrival_time:   toLocalISO(arrDt),
        price_per_seat: publishTarget.price_per_seat,
        total_seats:    publishTarget.total_seats,
        available_seats: publishTarget.total_seats,
        vehicle_make:   vehicleData.vehicle_make,
        vehicle_model:  vehicleData.vehicle_model || '',
        vehicle_year:   vehicleData.vehicle_year,
        vehicle_plate:  vehicleData.vehicle_plate,
        vehicle_color:  vehicleData.vehicle_color,
        vehicle_type:   publishTarget.vehicle_type,
        status:         'scheduled',
        description:    pubVia.trim() || null,
      }

      const newRoute = await createRoute(routeData as any)

      // Refresh balance from Supabase
      const { data: prof } = await supabase
        .from('profiles').select('balance').eq('id', user.id).single()
      if (prof?.balance !== undefined) setBalance(prof.balance)

      insertNotificationForUser(user.id, {
        user_id: user.id,
        type: 'trip_update',
        title: 'Ruta publicada',
        message: `Tu ruta ${publishTarget.origin} → ${publishTarget.destination} está activa.`,
        data: { route_id: newRoute?.id },
        is_read: false,
      }).catch(() => {})

      setPublishTarget(null)
      setDelayMins(0); setCustomDelay(''); setDurationMins(180); setCustomDuration(''); setPubVia('')
      showSuccess('¡Ruta publicada! Los pasajeros ya pueden reservar.')
    } catch (err: any) {
      showError(err.message || 'No se pudo publicar la ruta.')
    } finally {
      setPublishing(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (tmplLoading) {
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
          <Text style={styles.headerTitle}>Rutas Frecuentes</Text>
          <Text style={styles.headerSub}>Publica tus rutas habituales en segundos</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { resetForm(); setShowCreate(true) }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.addBtnGrad}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Balance strip */}
      <View style={styles.balanceStrip}>
        <Ionicons name="wallet-outline" size={15} color={COLORS.primary} />
        <Text style={styles.balanceText}>
          Saldo: <Text style={{ fontWeight: '700', color: COLORS.primary }}>${(user?.balance ?? 0).toLocaleString('es-CO')}</Text>
        </Text>
        <View style={styles.costPill}>
          <Text style={styles.costPillText}>Publicar = ${ROUTE_COMMISSION.toLocaleString('es-CO')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {templates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <LinearGradient colors={['#EEF2FF', '#E4EBFF']} style={styles.emptyIcon}>
              <Ionicons name="repeat" size={32} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Sin rutas frecuentes</Text>
            <Text style={styles.emptySub}>Guarda tus rutas habituales y publícalas en un toque.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => { resetForm(); setShowCreate(true) }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.emptyBtnGrad}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Crear mi primera plantilla</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map((tpl) => {
            const vt = VEHICLE_TYPES.find((v) => v.id === tpl.vehicle_type)
            return (
              <View key={tpl.id} style={styles.card}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <LinearGradient colors={['#EEF2FF', '#E4EBFF']} style={styles.cardIcon}>
                    <Ionicons name={vt?.icon ?? 'car-outline'} size={20} color={COLORS.primary} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{tpl.name}</Text>
                    <Text style={styles.cardRoute} numberOfLines={1}>{tpl.origin} → {tpl.destination}</Text>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(tpl)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil" size={14} color="#1230B8" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(tpl.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Meta row */}
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>${tpl.price_per_seat.toLocaleString('es-CO')} / asiento</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{tpl.total_seats} puestos</Text>
                  </View>
                  {!!tpl.description && (
                    <View style={styles.metaItem}>
                      <Ionicons name="git-branch-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>Vía {tpl.description}</Text>
                    </View>
                  )}
                </View>

                {/* Publish button */}
                {vehicleLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
                ) : !vehicleData ? (
                  <View style={styles.noVehicleWarn}>
                    <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.noVehicleText}>Crea al menos una ruta para registrar tu vehículo.</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.publishBtn}
                    onPress={() => { setPublishTarget(tpl); setPubVia(tpl.description || '') }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.publishBtnGrad}>
                      <Ionicons name="flash" size={16} color="#fff" />
                      <Text style={styles.publishBtnText}>Publicar ahora</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* ── CREATE MODAL ──────────────────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Editar plantilla' : 'Nueva plantilla'}</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm() }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label="Nombre (opcional)" placeholder='Ej: "Armenia → Cali mañana"' value={fName} onChangeText={setFName} />
              <FormField label="Origen *" placeholder='Ej: Armenia - Centro' value={fOrigin} onChangeText={setFOrigin} />
              <FormField label="Destino *" placeholder='Ej: Cali - Terminal' value={fDest} onChangeText={setFDest} />
              <FormField label="Precio / asiento *" placeholder='Ej: 25000' value={fPrice} onChangeText={setFPrice} keyboardType="numeric" />
              <FormField label="Total asientos *" placeholder='Ej: 4' value={fSeats} onChangeText={setFSeats} keyboardType="numeric" />

              {/* Vehicle type */}
              <Text style={styles.formLabel}>Tipo de vehículo *</Text>
              <View style={styles.vtRow}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vtChip, fVehicle === v.id && styles.vtChipActive]}
                    onPress={() => setFVehicle(v.id)}
                  >
                    <Ionicons name={v.icon} size={14} color={fVehicle === v.id ? '#fff' : COLORS.textSecondary} />
                    <Text style={[styles.vtChipText, fVehicle === v.id && styles.vtChipTextActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormField label="Vía / parada (opcional)" placeholder='Ej: La Paila' value={fVia} onChangeText={setFVia} />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTemplate} activeOpacity={0.85}>
                <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.saveBtnGrad}>
                  <Text style={styles.saveBtnText}>{editTarget ? 'Actualizar plantilla' : 'Guardar plantilla'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PUBLISH MODAL ─────────────────────────────────────────────────── */}
      {publishTarget && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPublishTarget(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.handle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Publicar ruta</Text>
                <TouchableOpacity onPress={() => { setPublishTarget(null); setCustomDuration(''); setPubVia('') }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Route summary */}
                <View style={styles.pubSummary}>
                  <Text style={styles.pubRoute}>{publishTarget.origin}</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} style={{ marginHorizontal: 4 }} />
                  <Text style={styles.pubRoute}>{publishTarget.destination}</Text>
                </View>
                <View style={styles.pubMeta}>
                  <Text style={styles.pubMetaText}>${publishTarget.price_per_seat.toLocaleString('es-CO')} · {publishTarget.total_seats} puestos</Text>
                </View>

                {/* Departure delay */}
                <Text style={styles.formLabel}>¿Cuándo sales?</Text>
                <View style={styles.optRow}>
                  {DELAY_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.optChip, delayMins === m && !customDelay && styles.optChipActive]}
                      onPress={() => { setDelayMins(m); setCustomDelay('') }}
                    >
                      <Text style={[styles.optChipText, delayMins === m && !customDelay && styles.optChipTextActive]}>
                        {m === 0 ? 'Ahora' : `${m}m`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Ej: 35"
                    placeholderTextColor={COLORS.textTertiary}
                    value={customDelay}
                    onChangeText={setCustomDelay}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.customLabel}>min personalizados</Text>
                </View>

                {/* Duration */}
                <Text style={[styles.formLabel, { marginTop: SPACING.lg }]}>Duración del viaje</Text>
                <View style={styles.optRow}>
                  {DURATION_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.optChip, durationMins === m && !customDuration && styles.optChipActive]}
                      onPress={() => { setDurationMins(m); setCustomDuration('') }}
                    >
                      <Text style={[styles.optChipText, durationMins === m && !customDuration && styles.optChipTextActive]}>
                        {fmtDuration(m)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Ej: 200"
                    placeholderTextColor={COLORS.textTertiary}
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.customLabel}>min personalizados</Text>
                </View>

                {/* Por donde voy */}
                <Text style={[styles.formLabel, { marginTop: SPACING.lg }]}>Por donde voy (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder='Ej: La Paila, autopista sur'
                  placeholderTextColor={COLORS.textTertiary}
                  value={pubVia}
                  onChangeText={setPubVia}
                />

                {/* Cost warning */}
                <View style={styles.costWarn}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.costWarnText}>
                    Se descontarán <Text style={{ fontWeight: '700' }}>${ROUTE_COMMISSION.toLocaleString('es-CO')}</Text> de tu billetera.
                    Saldo disponible: <Text style={{ fontWeight: '700' }}>${(user?.balance ?? 0).toLocaleString('es-CO')}</Text>
                  </Text>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handlePublish} disabled={publishing} activeOpacity={0.85}>
                  {publishing ? (
                    <View style={styles.saveBtnGrad}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : (
                    <LinearGradient colors={['#0E2699', '#1230B8', '#1A3FCC']} style={styles.saveBtnGrad}>
                      <Ionicons name="flash" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Confirmar y publicar</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ── Small helper component ────────────────────────────────────────────────────
function FormField({ label, placeholder, value, onChangeText, keyboardType }: {
  label: string; placeholder: string; value: string
  onChangeText: (t: string) => void; keyboardType?: any
}) {
  return (
    <>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F4F6FF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.sm },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E9EBF2',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F4F6FF', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  headerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  addBtn:      { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addBtnGrad:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Balance strip
  balanceStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1, borderBottomColor: '#D6E0FF',
  },
  balanceText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  costPill: {
    backgroundColor: '#D6E0FF', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  costPillText: { fontSize: 12, fontWeight: '600', color: '#0E2699' },

  // Empty state
  emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptySub:     { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn:     { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Template card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: '#E9EBF2',
    shadowColor: '#0E2699',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md },
  cardIcon:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardName:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardRoute:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  editBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#D6E0FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    justifyContent: 'center', alignItems: 'center',
  },
  cardMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: 12, color: COLORS.textSecondary },

  noVehicleWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  noVehicleText: { flex: 1, fontSize: 12, color: COLORS.warning },

  publishBtn:     { borderRadius: 12, overflow: 'hidden' },
  publishBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  publishBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingBottom: 32,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D6E0FF', alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#E9EBF2',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  // Form
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: SPACING.md },
  formInput: {
    borderWidth: 1, borderColor: '#D6E0FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.textPrimary, backgroundColor: '#F8F9FF',
  },

  // Vehicle type chips
  vtRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  vtChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#D6E0FF', backgroundColor: '#F8F9FF',
  },
  vtChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vtChipText:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  vtChipTextActive: { color: '#fff', fontWeight: '600' },

  // Save button
  saveBtn:     { borderRadius: 14, overflow: 'hidden', marginTop: SPACING.xl },
  saveBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Publish modal extras
  pubSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginBottom: 4,
  },
  pubRoute: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  pubMeta:  { alignItems: 'center', marginBottom: SPACING.lg },
  pubMetaText: { fontSize: 13, color: COLORS.textSecondary },

  optRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#D6E0FF', backgroundColor: '#F8F9FF',
  },
  optChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optChipText:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  optChipTextActive: { color: '#fff', fontWeight: '600' },

  customRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  customInput: {
    borderWidth: 1, borderColor: '#D6E0FF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 15, color: COLORS.textPrimary, backgroundColor: '#F8F9FF', width: 70,
  },
  customLabel: { fontSize: 13, color: COLORS.textSecondary },

  costWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginTop: SPACING.lg,
    borderWidth: 1, borderColor: '#D6E0FF',
  },
  costWarnText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
})
