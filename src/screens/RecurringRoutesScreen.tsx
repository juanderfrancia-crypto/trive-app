import { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Icon from '../components/Icon'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'
import Illustration from '../components/illustrations/Illustration'
import DepthCard from '../components/DepthCard'
import { useRoutes } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { insertNotificationForUser } from '../services/notificationInsert'
import { showSuccess, showError } from '../utils/showError'
import {
  VEHICLE_TYPES,
  VehicleTypeId,
  ROUTE_FEE,
  fmtMoney,
  toLocalISO,
} from './driver/PublishRouteFlow'

const TYPE_ICON: Record<VehicleTypeId, 'Car' | 'Bus'> = {
  auto: 'Car',
  busetica: 'Bus',
  buseta: 'Bus',
}

const parseHHMM = (texto: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim())
  if (!m) return null
  const horas = Number(m[1]), minutos = Number(m[2])
  if (horas > 23 || minutos > 59) return null
  return horas * 60 + minutos
}

const formatHHMM = (texto: string): string => {
  const digitos = texto.replace(/\D/g, '').slice(0, 4)
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos
}

interface RouteTemplate {
  id: string
  name: string
  origin: string
  destination: string
  price_per_seat: number
  total_seats: number
  vehicle_type: string
  description: string | null
  pickup_point: string | null
  route_via: string | null
  dropoff_point: string | null
  created_at: string
}

export default function RecurringRoutesScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const setBalance = useAppStore((s) => s.setBalance)
  const { createRoute } = useRoutes()

  // ── Plantillas ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<RouteTemplate[]>([])
  const [tmplLoading, setTmplLoading] = useState(true)

  // ── Modal crear/editar plantilla ───────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<RouteTemplate | null>(null)
  const [fName, setFName] = useState('')
  const [fOrigin, setFOrigin] = useState('')
  const [fDest, setFDest] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fSeats, setFSeats] = useState('')
  const [fVehicle, setFVehicle] = useState<VehicleTypeId>('auto')
  const [fVia, setFVia] = useState('')

  // ── Modal publicar desde plantilla ─────────────────────────────────────────
  const [publishTarget, setPublishTarget] = useState<RouteTemplate | null>(null)
  const [departureTime, setDepartureTime] = useState('')
  const [durationText, setDurationText] = useState('03:00')
  const [pubVia, setPubVia] = useState('')
  const [publishing, setPublishing] = useState(false)

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

  useFocusEffect(useCallback(() => { loadTemplates() }, [loadTemplates]))

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
    setFVehicle(tpl.vehicle_type as VehicleTypeId)
    setFVia(tpl.description ?? '')
    setEditTarget(tpl)
    setShowCreate(true)
  }

  const handleSaveTemplate = async () => {
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
      name: fName.trim() || autoName,
      origin: fOrigin.trim(),
      destination: fDest.trim(),
      price_per_seat: price,
      total_seats: seats,
      vehicle_type: fVehicle,
      description: fVia.trim() || null,
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

  // Publicar desde plantilla: el servidor valida requisitos y cobra; su mensaje llega tal cual.
  const handlePublish = async () => {
    if (!publishTarget || !user?.id) return
    let delay = 0
    if (departureTime.trim()) {
      const salida = parseHHMM(departureTime)
      if (salida === null) { showError('Escribe la hora de salida en formato HH:MM.'); return }
      const ahora = new Date()
      const dep = new Date(ahora)
      dep.setHours(Math.floor(salida / 60), salida % 60, 0, 0)
      delay = Math.round((dep.getTime() - ahora.getTime()) / 60000)
      if (delay < 0) { showError('La hora de salida ya pasó.'); return }
    }
    const duration = parseHHMM(durationText)
    if (!duration) { showError('Escribe la duración en formato HH:MM.'); return }

    setPublishing(true)
    try {
      const depDt = new Date(Date.now() + delay * 60000)
      const arrDt = new Date(depDt.getTime() + duration * 60000)

      const newRoute = await createRoute({
        origin: publishTarget.origin,
        destination: publishTarget.destination,
        departure_time: toLocalISO(depDt),
        arrival_time: toLocalISO(arrDt),
        price_per_seat: publishTarget.price_per_seat,
        total_seats: publishTarget.total_seats,
        vehicle_type: publishTarget.vehicle_type as VehicleTypeId,
        description: publishTarget.description ?? undefined,
        route_via: pubVia.trim() || undefined,
        pickup_point: publishTarget.pickup_point ?? undefined,
        pickup_point_custom: !!publishTarget.pickup_point,
        dropoff_point: publishTarget.dropoff_point ?? undefined,
      })

      const { data: prof } = await supabase
        .from('profiles').select('balance').eq('id', user.id).single()
      if (prof?.balance !== undefined) setBalance(prof.balance ?? 0)

      insertNotificationForUser(user.id, {
        user_id: user.id,
        type: 'trip_update',
        title: 'Ruta publicada',
        message: `Tu ruta ${publishTarget.origin} → ${publishTarget.destination} está activa.`,
        data: { route_id: newRoute?.id },
        is_read: false,
      }).catch(() => {})

      setPublishTarget(null)
      setDepartureTime(''); setDurationText('03:00'); setPubVia('')
      showSuccess('¡Viaje publicado! Los pasajeros ya pueden reservar.')
    } catch (err: any) {
      showError(err.message || 'No se pudo publicar la ruta.')
    } finally {
      setPublishing(false)
    }
  }

  if (tmplLoading) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.headerTitle}>Rutas frecuentes</Text>
          <Text style={styles.headerSub}>Publica tus rutas habituales en segundos</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { resetForm(); setShowCreate(true) }}
          activeOpacity={0.85}
        >
          <Icon name="Plus" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceStrip}>
        <Icon name="Wallet" size={16} color={COLORS.primary} />
        <Text style={styles.balanceText}>
          Saldo: <Text style={styles.balanceStrong}>{fmtMoney(user?.balance ?? 0)}</Text>
        </Text>
        <View style={styles.costPill}>
          <Text style={styles.costPillText}>Publicar = {fmtMoney(ROUTE_FEE)}</Text>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {templates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Illustration name="schedule" width={170} />
            <Text style={styles.emptyTitle}>Sin rutas frecuentes</Text>
            <Text style={styles.emptySub}>Guarda tus rutas habituales y publícalas en un toque.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { resetForm(); setShowCreate(true) }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Crear mi primera plantilla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map((tpl) => (
            <DepthCard key={tpl.id} style={styles.cardWrap} contentStyle={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Icon
                    name={TYPE_ICON[tpl.vehicle_type as VehicleTypeId] ?? 'Car'}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardName} numberOfLines={1}>{tpl.name}</Text>
                  <Text style={styles.cardRoute} numberOfLines={1}>{tpl.origin} → {tpl.destination}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(tpl)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="Pencil" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(tpl.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="Trash2" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardMeta}>
                <View style={styles.metaChip}>
                  <Icon name="Banknote" size={13} color={COLORS.primary} />
                  <Text style={styles.metaText}>{fmtMoney(tpl.price_per_seat)} / asiento</Text>
                </View>
                <View style={styles.metaChip}>
                  <Icon name="Users" size={13} color={COLORS.primary} />
                  <Text style={styles.metaText}>{tpl.total_seats} cupos</Text>
                </View>
                {!!tpl.description && (
                  <View style={styles.metaChip}>
                    <Icon name="Route" size={13} color={COLORS.primary} />
                    <Text style={styles.metaText} numberOfLines={1}>{tpl.description}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => { setPublishTarget(tpl); setPubVia(tpl.route_via ?? '') }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Publicar ahora</Text>
              </TouchableOpacity>
            </DepthCard>
          ))
        )}
      </ScrollView>

      {/* ── Modal crear/editar plantilla ── */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingScreen style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Editar plantilla' : 'Nueva plantilla'}</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm() }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="X" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label="Nombre (opcional)" placeholder='Ej: "Armenia → Cali mañana"' value={fName} onChangeText={setFName} />
              <FormField label="Origen *" placeholder="Ej: Armenia - Centro" value={fOrigin} onChangeText={setFOrigin} />
              <FormField label="Destino *" placeholder="Ej: Cali - Terminal" value={fDest} onChangeText={setFDest} />
              <FormField label="Precio por cupo *" placeholder="Ej: 25000" value={fPrice} onChangeText={setFPrice} keyboardType="numeric" />
              <FormField label="Cupos *" placeholder="Ej: 4" value={fSeats} onChangeText={setFSeats} keyboardType="numeric" />

              <Text style={styles.formLabel}>Tipo de vehículo *</Text>
              <View style={styles.chipRow}>
                {VEHICLE_TYPES.map((v) => {
                  const active = fVehicle === v.id
                  return (
                    <TouchableOpacity key={v.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setFVehicle(v.id)} activeOpacity={0.85}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{v.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <FormField label="Vía / parada (opcional)" placeholder="Ej: La Paila" value={fVia} onChangeText={setFVia} />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveTemplate} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{editTarget ? 'Actualizar plantilla' : 'Guardar plantilla'}</Text>
              </TouchableOpacity>
              <View style={{ height: SPACING.xxl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingScreen>
      </Modal>

      {/* ── Modal publicar desde plantilla ── */}
      {publishTarget && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPublishTarget(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
              <View style={styles.handle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Publicar viaje</Text>
                <TouchableOpacity onPress={() => { setPublishTarget(null); setDepartureTime(''); setDurationText('03:00'); setPubVia('') }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="X" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.pubSummary}>
                  <View style={styles.pubPoint}>
                    <Icon name="CircleDot" size={16} color={COLORS.primary} />
                    <Text style={styles.pubRoute}>{publishTarget.origin}</Text>
                  </View>
                  <View style={styles.pubPoint}>
                    <Icon name="MapPin" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.pubRoute}>{publishTarget.destination}</Text>
                  </View>
                  <View style={styles.pubChips}>
                    <View style={styles.metaChip}>
                      <Icon name="Banknote" size={13} color={COLORS.primary} />
                      <Text style={styles.metaText}>{fmtMoney(publishTarget.price_per_seat)} / asiento</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Icon name="Users" size={13} color={COLORS.primary} />
                      <Text style={styles.metaText}>{publishTarget.total_seats} cupos</Text>
                    </View>
                  </View>
                </View>

                <FormField label="Hora de salida (HH:MM)" placeholder="Vacío = ahora · Ej: 14:30" value={departureTime} onChangeText={(t) => setDepartureTime(formatHHMM(t))} keyboardType="number-pad" />
                <FormField label="Duración del viaje (HH:MM)" placeholder="Ej: 03:00" value={durationText} onChangeText={(t) => setDurationText(formatHHMM(t))} keyboardType="number-pad" />

                <FormField label="Por donde voy (opcional)" placeholder="Ej: La Paila, autopista sur" value={pubVia} onChangeText={setPubVia} />

                <View style={styles.costNote}>
                  <Icon name="Info" size={16} color={COLORS.primary} />
                  <Text style={styles.costNoteText}>
                    Se descontarán {fmtMoney(ROUTE_FEE)} de tu saldo. Saldo disponible: {fmtMoney(user?.balance ?? 0)}.
                  </Text>
                </View>

              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.primaryBtn, publishing && styles.btnDisabled]} onPress={handlePublish} disabled={publishing} activeOpacity={0.85}>
                  {publishing ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Confirmar y publicar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

function FormField({ label, placeholder, value, onChangeText, keyboardType }: {
  label: string; placeholder: string; value: string
  onChangeText: (t: string) => void; keyboardType?: any
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl, paddingTop: SPACING.sm, gap: SPACING.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', marginLeft: -SPACING.sm },
  headerTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800' },
  headerSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  balanceStrip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.xl, marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryTint,
  },
  balanceText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, flex: 1 },
  balanceStrong: { fontWeight: '700', color: COLORS.primary },
  costPill: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.white },
  costPillText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },

  emptyWrap: { alignItems: 'center', paddingTop: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '700' },
  emptySub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },

  cardWrap: { marginBottom: SPACING.md },
  card: { gap: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary },
  cardRoute: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  metaText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  primaryBtn: {
    height: 50, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
  },
  primaryBtnText: { ...TYPOGRAPHY.button, fontWeight: '700', color: COLORS.white },
  btnDisabled: { opacity: 0.6 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.textPrimary + '66' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl, maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: '800' },

  pubSummary: { gap: SPACING.sm, marginBottom: SPACING.lg },
  pubPoint: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pubChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  pubRoute: { ...TYPOGRAPHY.subtitle2, fontWeight: '800', color: COLORS.textPrimary },

  formField: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, marginTop: SPACING.sm,
  },
  formLabel: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },
  formInput: {
    ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary,
    padding: 0, marginTop: SPACING.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chipCell: { width: '23%', alignItems: 'center' },
  sectionLabel: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  modalFooter: { paddingTop: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  chipText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  customInput: {
    width: 72, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, textAlign: 'center',
  },

  costNote: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg,
    padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt,
  },
  costNoteText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, flex: 1 },
})
