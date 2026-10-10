import { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { Text } from '../../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../../components/Icon'
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../theme/theme'
import Illustration from '../../components/illustrations/Illustration'
import { useRoutes, PublishRoutePayload, Route } from '../../hooks/useRoutes'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../services/supabase'
import { insertNotificationForUser } from '../../services/notificationInsert'
import { showSuccess } from '../../utils/showError'

export type VehicleTypeId = 'auto' | 'busetica' | 'buseta'
export type PaymentMethodId = 'efectivo' | 'nequi' | 'daviplata'

function formatTimeInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

export const VEHICLE_TYPES: { id: VehicleTypeId; name: string; maxSeats: number }[] = [
  { id: 'auto', name: 'Auto', maxSeats: 4 },
  { id: 'busetica', name: 'Minivan', maxSeats: 18 },
  { id: 'buseta', name: 'Bus', maxSeats: 55 },
]

const PAYMENT_METHODS: { id: PaymentMethodId; name: string }[] = [
  { id: 'efectivo', name: 'Efectivo' },
  { id: 'nequi', name: 'Nequi' },
  { id: 'daviplata', name: 'Daviplata' },
]

// Cobro por publicar. Solo para mostrarlo; el descuento lo hace publish_route en el servidor.
export const ROUTE_FEE = 2000

export const fmtMoney = (amount: number) => `$${amount.toLocaleString('es-CO')}`

// Hora local sin zona horaria (TIMESTAMP sin zona en la base de datos).
export const toLocalISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const parseHHMM = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

const dateAt = (dayOffset: number, time: { h: number; m: number }) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(time.h, time.m, 0, 0)
  return d
}

const formatTime12 = (value: string) => {
  const t = parseHHMM(value)
  if (!t) return value
  const suffix = t.h < 12 ? 'a. m.' : 'p. m.'
  return `${t.h % 12 || 12}:${String(t.m).padStart(2, '0')} ${suffix}`
}

interface Draft {
  vehicleType: VehicleTypeId | null
  origin: string
  destination: string
  departureDay: 0 | 1 // 0 = hoy, 1 = mañana
  departureTime: string // HH:MM
  arrivalTime: string // HH:MM, opcional
  price: string
  seats: string
  paymentMethods: PaymentMethodId[]
  pickup: string
  routeVia: string
  dropoffPoint: string
  description: string
  saveAsTemplate: boolean
}

const INITIAL_DRAFT: Draft = {
  vehicleType: null,
  origin: '',
  destination: '',
  departureDay: 0,
  departureTime: '',
  arrivalTime: '',
  price: '',
  seats: '',
  paymentMethods: [],
  pickup: '',
  routeVia: '',
  dropoffPoint: '',
  description: '',
  saveAsTemplate: false,
}

interface VehicleInfo {
  make: string
  plate: string
}

interface Props {
  onExit: () => void
  onOpenPanel: () => void
  onOpenHome: () => void
  onOpenWallet: () => void
}

const STEP_LABELS = [
  'Paso 1 de 4 · Antes de publicar',
  'Paso 2 de 4 · Datos del viaje',
  'Paso 3 de 4 · Revisión',
  '',
]

export default function PublishRouteFlow({ onExit, onOpenPanel, onOpenHome, onOpenWallet }: Props) {
  const insets = useSafeAreaInsets()
  const user = useAppStore((s) => s.user)
  const setBalance = useAppStore((s) => s.setBalance)
  const { createRoute } = useRoutes()

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT)
  const [publishedDraft, setPublishedDraft] = useState<Draft | null>(null)
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null)
  const [vehicleLoaded, setVehicleLoaded] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const balance = user?.balance ?? 0
  const selectedType = VEHICLE_TYPES.find((v) => v.id === draft.vehicleType)
  const maxSeats = selectedType?.maxSeats ?? 0

  useEffect(() => {
    if (!user?.id) return
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('vehicles')
          .select('make, plate')
          .eq('driver_id', user.id)
          .eq('is_active', true)
          .eq('status', 'verified')
          .maybeSingle()
        if (active) setVehicle(data ? { make: data.make, plate: data.plate } : null)
      } catch {
        if (active) setVehicle(null)
      } finally {
        if (active) setVehicleLoaded(true)
      }
    })()
    return () => {
      active = false
    }
  }, [user?.id])

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const togglePayment = (id: PaymentMethodId) =>
    setDraft((d) => ({
      ...d,
      paymentMethods: d.paymentMethods.includes(id)
        ? d.paymentMethods.filter((m) => m !== id)
        : [...d.paymentMethods, id],
    }))

  const validateDraft = (): string | null => {
    if (!draft.origin.trim()) return 'Escribe la ciudad de origen.'
    if (!draft.destination.trim()) return 'Escribe la ciudad de destino.'
    if (!draft.pickup.trim()) return 'Escribe el punto de salida en el municipio de origen.'
    if (!draft.dropoffPoint.trim()) return 'Escribe el punto de llegada en el destino.'
    const dep = parseHHMM(draft.departureTime)
    if (!dep) return 'Escribe la hora de salida en formato HH:MM.'
    if (draft.departureDay === 0 && dateAt(0, dep) < new Date(Date.now() - 15 * 60000)) {
      return 'La hora de salida ya pasó. Elige una hora de hoy en adelante o de mañana.'
    }
    if (draft.arrivalTime.trim() && !parseHHMM(draft.arrivalTime)) {
      return 'La llegada debe tener formato HH:MM, o déjala vacía.'
    }
    if (!draft.vehicleType) return 'Elige el tipo de vehículo.'
    const price = Number(draft.price)
    if (!draft.price.trim() || !(price > 0)) return 'Escribe un precio por cupo válido.'
    const seats = Number(draft.seats)
    if (!draft.seats.trim() || !Number.isInteger(seats) || seats < 1 || seats > maxSeats) {
      return `Los cupos deben estar entre 1 y ${maxSeats} para este tipo de vehículo.`
    }
    return null
  }

  const buildPayload = (): PublishRoutePayload => {
    const dep = dateAt(draft.departureDay, parseHHMM(draft.departureTime)!)
    const payload: PublishRoutePayload = {
      origin: draft.origin.trim(),
      destination: draft.destination.trim(),
      departure_time: toLocalISO(dep),
      price_per_seat: Number(draft.price),
      total_seats: Number(draft.seats),
      vehicle_type: draft.vehicleType as VehicleTypeId,
      route_via: draft.routeVia.trim(),
      dropoff_point: draft.dropoffPoint.trim(),
    }
    const arr = parseHHMM(draft.arrivalTime)
    if (arr) {
      const a = dateAt(draft.departureDay, arr)
      if (a <= dep) a.setDate(a.getDate() + 1)
      payload.arrival_time = toLocalISO(a)
    }
    if (draft.description.trim()) payload.description = draft.description.trim()
    payload.pickup_point = draft.pickup.trim()
    payload.pickup_point_custom = true
    return payload
  }

  const goToReview = () => {
    const error = validateDraft()
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setStep(2)
  }

  const handlePublish = async () => {
    if (submitting) return
    if (!user?.id) {
      setServerError('Usuario no autenticado.')
      setStep(0)
      return
    }
    setSubmitting(true)
    setServerError(null)

    const payload = buildPayload()
    let route: Route | undefined
    try {
      // El servidor valida documentos, cédula, vehículo y saldo, en ese orden.
      // Su mensaje se muestra tal cual en el paso de requisitos.
      route = await createRoute(payload)
    } catch (err: any) {
      setServerError(err?.message || 'No se pudo publicar el viaje. Intenta de nuevo.')
      setStep(0)
      setSubmitting(false)
      return
    }

    // A partir de aquí la ruta ya existe en el servidor; lo siguiente es secundario.
    insertNotificationForUser(user.id, {
      user_id: user.id,
      type: 'trip_update',
      title: 'Ruta publicada',
      message: `Tu ruta ${payload.origin} → ${payload.destination} está activa. Los pasajeros ya pueden verla y reservar.`,
      data: { route_id: route?.id },
      is_read: false,
    }).catch(() => {})

    if (draft.saveAsTemplate) {
      const { error } = await supabase.from('route_templates').insert({
        driver_id: user.id,
        name: `${payload.origin} → ${payload.destination}`,
        origin: payload.origin,
        destination: payload.destination,
        price_per_seat: payload.price_per_seat,
        total_seats: payload.total_seats,
        vehicle_type: payload.vehicle_type,
        description: payload.description ?? null,
        pickup_point: payload.pickup_point ?? null,
        route_via: payload.route_via,
        dropoff_point: payload.dropoff_point,
      })
      if (error && __DEV__) console.warn('No se guardó la plantilla:', error.message)
    }

    const { data: prof } = await supabase.from('profiles').select('balance').eq('id', user.id).single()
    if (prof?.balance !== undefined) setBalance(prof.balance ?? 0)

    showSuccess('¡Viaje publicado! Los pasajeros ya pueden verlo.')
    setPublishedDraft(draft)
    setSubmitting(false)
    setStep(3)
  }

  const resetFlow = () => {
    setDraft(INITIAL_DRAFT)
    setPublishedDraft(null)
    setServerError(null)
    setFormError(null)
    setStep(0)
  }

  const goBack = () => {
    if (step === 0) onExit()
    else setStep(step - 1)
  }

  // ── Paso 1: requisitos (Publica1) ──────────────────────────────────────────
  const renderRequirements = () => (
    <>
      <Text style={styles.title}>Estás listo para publicar</Text>
      <Text style={styles.subtitle}>Revisamos esto antes de dejar publicar tu viaje.</Text>

      <View style={styles.requirementList}>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Documentos aprobados</Text>
          <Text style={styles.rowSub}>Trive revisa tus documentos de conductor</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Cédula registrada</Text>
          <Text style={styles.rowSub}>Número de cédula en tu perfil</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Vehículo aprobado</Text>
          <Text style={styles.rowSub}>
            {vehicle
              ? `${vehicle.make} · ${vehicle.plate}`
              : vehicleLoaded
                ? 'Sin vehículo aprobado todavía'
                : 'Cargando vehículo...'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Saldo para publicar</Text>
          <Text style={styles.rowSub}>
            {`Necesitas ${fmtMoney(ROUTE_FEE)} · tienes ${fmtMoney(balance)}`}
          </Text>
        </View>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>Si algo falta, la app te dice exactamente qué es y cómo resolverlo.</Text>
      </View>

      {serverError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No puedes publicar todavía</Text>
          <Text style={styles.errorText}>{serverError}</Text>
          {/saldo/i.test(serverError) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenWallet} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Ir a billetera</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )

  // ── Paso 2: datos del viaje (Publica2) ─────────────────────────────────────
  const renderData = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Vehículo</Text>
        <Text style={styles.fieldValue}>
          {vehicle
            ? `${vehicle.make} · ${vehicle.plate}`
            : vehicleLoaded
              ? 'Sin vehículo aprobado'
              : 'Cargando...'}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Tipo de vehículo</Text>
      <View style={styles.chipRow}>
        {VEHICLE_TYPES.map((v) => {
          const active = draft.vehicleType === v.id
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => update('vehicleType', v.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{v.name}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Origen</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Ej: Puerto Tejada"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.origin}
            onChangeText={(t) => update('origin', t)}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Destino</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Ej: Cali"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.destination}
            onChangeText={(t) => update('destination', t)}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Día de salida</Text>
      <View style={styles.chipRow}>
        {[
          { id: 0 as const, name: 'Hoy' },
          { id: 1 as const, name: 'Mañana' },
        ].map((d) => {
          const active = draft.departureDay === d.id
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => update('departureDay', d.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.name}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Salida (HH:MM)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="14:30"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.departureTime}
            onChangeText={(t) => update('departureTime', formatTimeInput(t))}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Llegada (opcional)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Sin definir"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.arrivalTime}
            onChangeText={(t) => update('arrivalTime', formatTimeInput(t))}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Precio por cupo</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="15000"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.price}
            onChangeText={(t) => update('price', t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Cupos</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="4"
            placeholderTextColor={COLORS.textTertiary}
            value={draft.seats}
            onChangeText={(t) => update('seats', t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.fieldHint}>
            {selectedType ? `máx. ${maxSeats} en ${selectedType.name.toLowerCase()}` : 'Elige el tipo de vehículo'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Medios de pago que aceptas</Text>
        <View style={[styles.chipRow, { marginTop: SPACING.sm }]}>
          {PAYMENT_METHODS.map((m) => {
            const active = draft.paymentMethods.includes(m.id)
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => togglePayment(m.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <Text style={styles.fieldHint}>Trive no cobra ni retiene el pago de los pasajeros.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Punto de salida</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Ej: Parque principal de Puerto Tejada"
          placeholderTextColor={COLORS.textTertiary}
          value={draft.pickup}
          onChangeText={(t) => update('pickup', t)}
        />
        <Text style={styles.fieldHint}>De qué punto del origen sale el carro.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Por dónde va (opcional)</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Ej: Por la Simón Bolívar, sin pasar por Cañas Gordas"
          placeholderTextColor={COLORS.textTertiary}
          value={draft.routeVia}
          onChangeText={(t) => update('routeVia', t)}
        />
        <Text style={styles.fieldHint}>Solo si tomas una vía distinta a la directa.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Punto de llegada</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Ej: Jardín Plaza, Cali"
          placeholderTextColor={COLORS.textTertiary}
          value={draft.dropoffPoint}
          onChangeText={(t) => update('dropoffPoint', t)}
        />
        <Text style={styles.fieldHint}>A qué punto del destino llega el carro.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.fieldInput, styles.multiline]}
          placeholder="Aire acondicionado, equipaje pequeño"
          placeholderTextColor={COLORS.textTertiary}
          value={draft.description}
          onChangeText={(t) => update('description', t)}
          multiline
        />
      </View>

      {formError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      )}
    </>
  )

  // ── Paso 3: revisión y cobro (Publica3) ────────────────────────────────────
  const renderReview = () => {
    const dayLabel = draft.departureDay === 0 ? 'Hoy' : 'Mañana'
    const typeName = selectedType?.name ?? ''
    return (
      <>
        <Text style={styles.title}>Revisa antes de publicar</Text>

        <View style={[styles.card, styles.reviewCard]}>
          <Text style={styles.routeTitle}>{`${draft.origin.trim()} → ${draft.destination.trim()}`}</Text>
          <Text style={styles.rowSub}>
            {`${dayLabel} · ${formatTime12(draft.departureTime)}${draft.pickup.trim() ? ` · ${draft.pickup.trim()}` : ''}`}
          </Text>
          <View style={styles.divider} />
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Cupos</Text>
            <Text style={styles.summaryValue}>{`${draft.seats} × ${fmtMoney(Number(draft.price))}`}</Text>
          </View>
          <View style={[styles.summaryLine, { marginTop: SPACING.sm }]}>
            <Text style={styles.summaryLabel}>Vehículo</Text>
            <Text style={styles.summaryValue}>
              {vehicle ? `${vehicle.make} · ${vehicle.plate}` : typeName}
            </Text>
          </View>
        </View>

        <View style={[styles.card, styles.costCard]}>
          <Text style={styles.costLabel}>Cobro por publicar</Text>
          <View style={[styles.summaryLine, { marginTop: SPACING.md }]}>
            <Text style={styles.costItem}>Publicar esta ruta</Text>
            <Text style={styles.costItemStrong}>{fmtMoney(ROUTE_FEE)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: COLORS.border }]} />
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Saldo actual</Text>
            <Text style={styles.summaryLabel}>{fmtMoney(balance)}</Text>
          </View>
          <View style={[styles.summaryLine, { marginTop: SPACING.sm }]}>
            <Text style={styles.summaryLabel}>Saldo después</Text>
            <Text style={styles.summaryValue}>{fmtMoney(balance - ROUTE_FEE)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => update('saveAsTemplate', !draft.saveAsTemplate)}
          activeOpacity={0.85}
        >
          <Icon
            name={draft.saveAsTemplate ? 'SquareCheckBig' : 'Square'}
            size={22}
            color={draft.saveAsTemplate ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={styles.toggleText}>Guardar como ruta frecuente</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          El cobro de {fmtMoney(ROUTE_FEE)} se descuenta de tu saldo al publicar. Los pasajeros te pagan directo por
          los medios que publicaste; Trive no retiene ese dinero.
        </Text>
      </>
    )
  }

  // ── Paso 4: publicado (Publica4) ───────────────────────────────────────────
  const renderDone = () => {
    if (!publishedDraft) return null
    const dayLabel = publishedDraft.departureDay === 0 ? 'Hoy' : 'Mañana'
    return (
      <>
        <View style={{ alignItems: 'center' }}>
          <Illustration name="postOnline" width={200} />
        </View>
        <Text style={styles.doneTitle}>Viaje publicado</Text>
        <Text style={styles.subtitle}>
          Ya aparece en la búsqueda de pasajeros. Te avisamos cuando alguien reserve.
        </Text>

        <View style={[styles.card, styles.reviewCard]}>
          <View style={styles.cardRow}>
            <Text style={styles.rowSubStrong}>{`${dayLabel} · ${formatTime12(publishedDraft.departureTime)}`}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Programado</Text>
            </View>
          </View>
          <Text style={[styles.routeTitle, { marginTop: SPACING.sm }]}>
            {`${publishedDraft.origin.trim()} → ${publishedDraft.destination.trim()}`}
          </Text>
          <Text style={styles.rowSub}>{`0 de ${publishedDraft.seats} cupos reservados`}</Text>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Cuando termines el recorrido, marca la ruta como completada en tu panel para cerrar el viaje.
          </Text>
        </View>
      </>
    )
  }

  const renderFooter = () => {
    if (step === 0) {
      return <PrimaryButton label="Continuar" onPress={() => setStep(1)} />
    }
    if (step === 1) {
      return <PrimaryButton label="Revisar publicación" onPress={goToReview} />
    }
    if (step === 2) {
      return (
        <>
          <PrimaryButton
            label={`Publicar viaje · ${fmtMoney(ROUTE_FEE)}`}
            onPress={handlePublish}
            loading={submitting}
          />
          <SecondaryButton label="Editar datos" onPress={() => setStep(1)} />
        </>
      )
    }
    return (
      <View style={styles.doneRow}>
        <TouchableOpacity style={styles.doneOutlineBtn} onPress={resetFlow} activeOpacity={0.85}>
          <Text style={styles.doneOutlineText}>Publicar otra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneOutlineBtn} onPress={onOpenHome} activeOpacity={0.85}>
          <Text style={styles.doneOutlineText}>Ir al inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.donePrimaryBtn} onPress={onOpenPanel} activeOpacity={0.85}>
          <Text style={styles.donePrimaryText}>Ver mi panel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingScreen>
      {step < 3 && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}

      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.progressSeg, { backgroundColor: i <= step ? COLORS.primary : COLORS.border }]}
          />
        ))}
      </View>
      {!!STEP_LABELS[step] && <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && renderRequirements()}
        {step === 1 && renderData()}
        {step === 2 && renderReview()}
        {step === 3 && renderDone()}
      </ScrollView>

      <View style={styles.footer}>{renderFooter()}</View>
      </KeyboardAvoidingScreen>
    </View>
  )
}

function PrimaryButton({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, loading && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.secondaryOutlineText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: SPACING.xl },
  flex: { flex: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -SPACING.sm },
  progressRow: { flexDirection: 'row', gap: SPACING.sm },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm },
  content: { paddingTop: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
  footer: { paddingVertical: SPACING.lg, gap: SPACING.sm },

  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, fontWeight: '800' },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.xs },
  doneTitle: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, fontWeight: '800', marginTop: SPACING.lg },

  requirementList: { gap: SPACING.sm, marginTop: SPACING.sm },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primaryTint,
  },
  reviewCard: { padding: SPACING.lg },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary },
  rowSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
  rowSubStrong: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  routeTitle: { ...TYPOGRAPHY.subtitle2, fontWeight: '800', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.md },

  noteBox: { borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surfaceAlt },
  noteText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  legal: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },

  errorBox: { borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.errorLight, gap: SPACING.xs },
  errorTitle: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.error },
  errorText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary },

  sectionLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  chipText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },

  row: { flexDirection: 'row', gap: SPACING.sm },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  fieldLabel: { ...TYPOGRAPHY.caption, fontWeight: '600', color: COLORS.textSecondary },
  fieldValue: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.xs },
  fieldInput: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    padding: 0,
    marginTop: SPACING.xs,
  },
  multiline: { minHeight: 48, textAlignVertical: 'top' },
  fieldHint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },

  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  summaryValue: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary },
  costCard: { backgroundColor: COLORS.surfaceAlt, borderWidth: 0, borderBottomWidth: 0, marginTop: SPACING.md },
  costLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  costItem: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary },
  costItemStrong: { ...TYPOGRAPHY.bodyMedium, fontWeight: '800', color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  toggleText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textPrimary },

  pill: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  pillText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },

  primaryBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...TYPOGRAPHY.button, fontWeight: '700', color: COLORS.white },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  secondaryBtnText: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.primary },
  secondaryOutlineBtn: {
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutlineText: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary },
  doneRow: { flexDirection: 'row', gap: SPACING.sm },
  doneOutlineBtn: {
    flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
  },
  doneOutlineText: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  donePrimaryBtn: {
    flex: 1, height: 50, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  donePrimaryText: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },
})
