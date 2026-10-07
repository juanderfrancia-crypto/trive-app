import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import DepthCard from '../components/DepthCard'
import Icon from '../components/Icon'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { VEHICLE_TYPES, type VehicleTypeId } from './driver/PublishRouteFlow'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'

interface Airport { name: string; city: string; iata: string }

const COLOMBIA_AIRPORTS: Airport[] = [
  { name: 'Aeropuerto El Dorado',                    city: 'Bogotá',              iata: 'BOG' },
  { name: 'Aeropuerto José María Córdova',            city: 'Medellín / Rionegro', iata: 'MDE' },
  { name: 'Aeropuerto Olaya Herrera',                 city: 'Medellín',            iata: 'EOH' },
  { name: 'Aeropuerto Alfonso Bonilla Aragón',        city: 'Cali',                iata: 'CLO' },
  { name: 'Aeropuerto Rafael Núñez',                  city: 'Cartagena',           iata: 'CTG' },
  { name: 'Aeropuerto Ernesto Cortissoz',             city: 'Barranquilla',        iata: 'BAQ' },
  { name: 'Aeropuerto Matecaña',                      city: 'Pereira',             iata: 'PEI' },
  { name: 'Aeropuerto Palonegro',                     city: 'Bucaramanga',         iata: 'BGA' },
  { name: 'Aeropuerto El Edén',                       city: 'Armenia',             iata: 'AXM' },
  { name: 'Aeropuerto Antonio Nariño',                city: 'Pasto',               iata: 'PSO' },
  { name: 'Aeropuerto Benito Salas',                  city: 'Neiva',               iata: 'NVA' },
  { name: 'Aeropuerto Gustavo Rojas Pinilla',         city: 'San Andrés',          iata: 'ADZ' },
  { name: 'Aeropuerto Camilo Daza',                   city: 'Cúcuta',              iata: 'CUC' },
  { name: 'Aeropuerto Simón Bolívar',                 city: 'Santa Marta',         iata: 'SMR' },
  { name: 'Aeropuerto Los Garzones',                  city: 'Montería',            iata: 'MTR' },
  { name: 'Aeropuerto Vanguardia',                    city: 'Villavicencio',       iata: 'VVC' },
  { name: 'Aeropuerto Almirante Padilla',             city: 'Riohacha',            iata: 'RCH' },
  { name: 'Aeropuerto Alfonso López Pumarejo',        city: 'Valledupar',          iata: 'VUP' },
  { name: 'Aeropuerto El Caraño',                     city: 'Quibdó',              iata: 'UIB' },
  { name: 'Aeropuerto Yariguíes',                     city: 'Barrancabermeja',     iata: 'EJA' },
  { name: 'Aeropuerto Las Brujas',                    city: 'Corozal',             iata: 'CZU' },
  { name: 'Aeropuerto Vásquez Cobo',                  city: 'Leticia',             iata: 'LET' },
  { name: 'Aeropuerto Antonio Roldán Betancourt',     city: 'Apartadó',            iata: 'APO' },
  { name: 'Aeropuerto Gerardo Tobar López',           city: 'Buenaventura',        iata: 'BUN' },
  { name: 'Aeropuerto La Nubia',                      city: 'Manizales',           iata: 'MZL' },
  { name: 'Aeropuerto El Embrujo',                    city: 'Providencia',         iata: 'PVA' },
  { name: 'Aeropuerto Santiago Vila Escobar',         city: 'Flandes / Girardot',  iata: 'GIR' },
  { name: 'Aeropuerto Los Colonizadores',             city: 'Arauca',              iata: 'AUC' },
  { name: 'Aeropuerto Gustavo Artunduaga Paredes',    city: 'Florencia',           iata: 'FLA' },
  { name: 'Aeropuerto Juan H. White',                 city: 'Barrancabermeja',     iata: 'EJA' },
]

type Meridiem = 'AM' | 'PM'

const formatHHMM = (texto: string): string => {
  const digitos = texto.replace(/\D/g, '').slice(0, 4)
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos
}

const to12h = (hours24: number): { time: string; meridiem: Meridiem } => {
  const meridiem: Meridiem = hours24 >= 12 ? 'PM' : 'AM'
  const h12 = hours24 % 12 || 12
  return { time: String(h12).padStart(2, '0'), meridiem }
}

const defaultDepartureParts = () => {
  const d = new Date()
  d.setHours(d.getHours() + 2, 0, 0, 0)
  const { time, meridiem } = to12h(d.getHours())
  return { time: `${time}:${String(d.getMinutes()).padStart(2, '0')}`, meridiem }
}

const parseTime12 = (texto: string, meridiem: Meridiem): { hours: number; minutes: number } | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim())
  if (!m) return null
  const h12 = Number(m[1])
  const minutes = Number(m[2])
  if (h12 < 1 || h12 > 12 || minutes > 59) return null
  let hours = h12 % 12
  if (meridiem === 'PM') hours += 12
  return { hours, minutes }
}

const formatDateDisplay = (date: Date) =>
  date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const normalizeText = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const VEHICLE_ICON: Record<VehicleTypeId, 'Car' | 'Bus'> = {
  auto: 'Car',
  busetica: 'Bus',
  buseta: 'Bus',
}

export default function CreateAirportRequestScreen() {
  const navigation = useNavigation<any>()
  const { createRequest } = useAirportNegotiation()
  const user = useAppStore((s) => s.user)

  const [tripType, setTripType] = useState<'airport' | 'custom'>('airport')

  const [origin, setOrigin] = useState('')
  const [airportQuery, setAirportQuery] = useState('')
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [customDestination, setCustomDestination] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [vehicleType, setVehicleType] = useState<VehicleTypeId>('auto')
  const [passengers, setPassengers] = useState(1)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [departureDate, setDepartureDate] = useState(() => new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const initialTime = React.useMemo(defaultDepartureParts, [])
  const [timeStr, setTimeStr] = useState(initialTime.time)
  const [meridiem, setMeridiem] = useState<Meridiem>(initialTime.meridiem)
  const [loading, setLoading] = useState(false)

  const filteredAirports = airportQuery.length >= 2
    ? (() => {
        const q = normalizeText(airportQuery)
        return COLOMBIA_AIRPORTS.filter(a =>
          normalizeText(a.name).includes(q) ||
          normalizeText(a.city).includes(q) ||
          normalizeText(a.iata).includes(q)
        ).slice(0, 6)
      })()
    : []

  const selectAirport = (airport: Airport) => {
    setSelectedAirport(airport)
    setAirportQuery(`${airport.name} — ${airport.city}`)
    setShowDropdown(false)
  }

  const clearAirport = () => {
    setSelectedAirport(null)
    setAirportQuery('')
    setShowDropdown(false)
  }

  const maxPassengers = VEHICLE_TYPES.find((v) => v.id === vehicleType)?.maxSeats ?? 4

  const adjustPassengers = (delta: number) =>
    setPassengers(prev => Math.min(maxPassengers, Math.max(1, prev + delta)))

  const handleVehicleChange = (id: VehicleTypeId) => {
    setVehicleType(id)
    const max = VEHICLE_TYPES.find((v) => v.id === id)?.maxSeats ?? 4
    setPassengers((prev) => Math.min(prev, max))
  }

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (event.type === 'dismissed' || !selected) return
    setDepartureDate(selected)
  }

  const formatPriceInput = (text: string) => {
    const digits = text.replace(/\D/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('es-CO')
  }

  const handlePublish = async () => {
    if (!user?.id) { showError('Debes iniciar sesión'); return }
    if (!origin.trim()) { showError('Indica tu ciudad de origen'); return }

    let destination = ''
    if (tripType === 'airport') {
      if (!selectedAirport) { showError('Selecciona el aeropuerto de destino'); return }
      destination = `${selectedAirport.name} (${selectedAirport.iata}) — ${selectedAirport.city}`
    } else {
      if (!customDestination.trim()) { showError('Describe tu destino personalizado'); return }
      destination = customDestination.trim()
    }

    const time = parseTime12(timeStr, meridiem)
    if (!time) { showError('Hora en formato HH:MM (ej: 06:30)'); return }
    const departure = new Date(
      departureDate.getFullYear(),
      departureDate.getMonth(),
      departureDate.getDate(),
      time.hours,
      time.minutes
    )
    if (departure <= new Date()) { showError('La fecha y hora deben ser en el futuro'); return }
    const price = parseInt(offeredPrice.replace(/\D/g, ''), 10)
    if (!price || price <= 0) { showError('Ingresa un precio válido'); return }

    try {
      setLoading(true)
      await createRequest({
        passenger_id: user.id,
        origin: origin.trim(),
        destination,
        departure_time: departure.toISOString(),
        passengers,
        vehicle_type: vehicleType,
        offered_price: price,
        trip_type: tripType,
        notes: notes.trim() || undefined,
      })
      showSuccess('Solicitud publicada. Te avisamos cuando un conductor acepte.')
      navigation.navigate('Main', { screen: 'Requests' })
    } catch (err: any) {
      showError(err.message || 'Error al publicar solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerHero}>
          <Text style={s.headerTitle}>Nueva ruta personalizada</Text>
          <Text style={s.headerSub}>Publica a dónde vas y recibe ofertas de conductores</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.segmented}>
          <TouchableOpacity
            style={[s.segment, tripType === 'airport' && s.segmentActive]}
            onPress={() => {
              setTripType('airport')
              setCustomDestination('')
            }}
            activeOpacity={0.75}
          >
            <Icon name="Plane" size={16} color={tripType === 'airport' ? COLORS.white : COLORS.primary} />
            <Text style={[s.segmentText, tripType === 'airport' && s.segmentTextActive]}>Aeropuerto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, tripType === 'custom' && s.segmentActive]}
            onPress={() => {
              setTripType('custom')
              setSelectedAirport(null)
              setAirportQuery('')
            }}
            activeOpacity={0.75}
          >
            <Icon name="MapPin" size={16} color={tripType === 'custom' ? COLORS.white : COLORS.primary} />
            <Text style={[s.segmentText, tripType === 'custom' && s.segmentTextActive]}>Otro destino</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <DepthCard style={s.formWrap} contentStyle={s.formContent}>
            <View style={s.field}>
              <Text style={s.label}>Origen</Text>
              <View style={s.inputRow}>
                <Icon name="CircleDot" size={16} color={COLORS.primary} />
                <TextInput
                  style={s.input}
                  placeholder="Dirección, barrio o punto de salida"
                  placeholderTextColor={COLORS.textTertiary}
                  value={origin}
                  onChangeText={setOrigin}
                  returnKeyType="next"
                />
              </View>
            </View>

            {tripType === 'airport' ? (
              <View style={s.field}>
                <Text style={s.label}>Aeropuerto de destino</Text>
                <View style={[s.inputRow, selectedAirport && s.inputRowSelected]}>
                  <Icon name="Plane" size={16} color={selectedAirport ? COLORS.primary : COLORS.textTertiary} />
                  <TextInput
                    style={s.input}
                    placeholder="Busca por ciudad o aeropuerto"
                    placeholderTextColor={COLORS.textTertiary}
                    value={airportQuery}
                    onChangeText={(t) => {
                      setAirportQuery(t)
                      setSelectedAirport(null)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {airportQuery.length > 0 && (
                    <TouchableOpacity onPress={clearAirport} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Icon name="CircleX" size={17} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {showDropdown && filteredAirports.length > 0 && (
                  <View style={s.dropdown}>
                    {filteredAirports.map((airport, idx) => (
                      <TouchableOpacity
                        key={airport.iata + idx}
                        style={[s.dropdownItem, idx < filteredAirports.length - 1 && s.dropdownItemBorder]}
                        onPress={() => selectAirport(airport)}
                        activeOpacity={0.7}
                      >
                        <View style={s.dropdownIcon}>
                          <Icon name="Plane" size={13} color={COLORS.primary} />
                        </View>
                        <View style={s.dropdownTexts}>
                          <Text style={s.dropdownName}>{airport.name}</Text>
                          <Text style={s.dropdownCity}>{airport.city} · {airport.iata}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {showDropdown && airportQuery.length >= 2 && filteredAirports.length === 0 && !selectedAirport && (
                  <View style={s.dropdownEmpty}>
                    <Icon name="Search" size={15} color={COLORS.textTertiary} />
                    <Text style={s.dropdownEmptyText}>Sin resultados para "{airportQuery}"</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.field}>
                <Text style={s.label}>¿Adónde vas?</Text>
                <View style={[s.inputRow, !!customDestination && s.inputRowSelected]}>
                  <Icon name="MapPin" size={16} color={customDestination ? COLORS.primary : COLORS.textTertiary} />
                  <TextInput
                    style={s.input}
                    placeholder="Ej: Terminal Palmaseca, Casa en Pereira"
                    placeholderTextColor={COLORS.textTertiary}
                    value={customDestination}
                    onChangeText={setCustomDestination}
                    returnKeyType="next"
                  />
                  {customDestination.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomDestination('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Icon name="CircleX" size={17} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Fecha de salida</Text>
              <TouchableOpacity
                style={s.inputRow}
                onPress={() => {
                  setShowDropdown(false)
                  setShowDatePicker(true)
                }}
                activeOpacity={0.8}
              >
                <Icon name="Calendar" size={16} color={COLORS.primary} />
                <Text style={s.input}>{formatDateDisplay(departureDate)}</Text>
                <Icon name="ChevronDown" size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Hora de salida</Text>
              <View style={s.timeRow}>
                <View style={[s.inputRow, s.flex1]}>
                  <Icon name="Clock" size={16} color={COLORS.primary} />
                  <TextInput
                    style={s.input}
                    placeholder="07:00"
                    placeholderTextColor={COLORS.textTertiary}
                    value={timeStr}
                    onChangeText={(t) => setTimeStr(formatHHMM(t))}
                    keyboardType="number-pad"
                    maxLength={5}
                    onFocus={() => setShowDropdown(false)}
                  />
                </View>
                <View style={s.meridiemGroup}>
                  <TouchableOpacity
                    style={[s.meridiemBtn, meridiem === 'AM' && s.meridiemBtnActive]}
                    onPress={() => setMeridiem('AM')}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.meridiemText, meridiem === 'AM' && s.meridiemTextActive]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.meridiemBtn, meridiem === 'PM' && s.meridiemBtnActive]}
                    onPress={() => setMeridiem('PM')}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.meridiemText, meridiem === 'PM' && s.meridiemTextActive]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={departureDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onChangeDate}
              />
            )}

            {Platform.OS === 'ios' && (
              <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <View style={s.pickerOverlay}>
                  <View style={s.pickerSheet}>
                    <View style={s.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.pickerCancel}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.pickerDone}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={departureDate}
                      mode="date"
                      display="inline"
                      minimumDate={new Date()}
                      onChange={onChangeDate}
                      locale="es-CO"
                      accentColor={COLORS.primary}
                      themeVariant="light"
                    />
                  </View>
                </View>
              </Modal>
            )}

            <View style={s.field}>
              <Text style={s.label}>¿Qué vehículo necesitas?</Text>
              <View style={s.vehicleRow}>
                {VEHICLE_TYPES.map((v) => {
                  const active = vehicleType === v.id
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[s.vehicleChip, active && s.vehicleChipActive]}
                      onPress={() => handleVehicleChange(v.id)}
                      activeOpacity={0.8}
                    >
                      <Icon name={VEHICLE_ICON[v.id]} size={18} color={active ? COLORS.white : COLORS.primary} />
                      <Text style={[s.vehicleChipText, active && s.vehicleChipTextActive]}>{v.name}</Text>
                      <Text style={[s.vehicleChipSub, active && s.vehicleChipTextActive]}>Hasta {v.maxSeats}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>¿Viajas solo o con tu grupo?</Text>
              <View style={s.counterRow}>
                <TouchableOpacity
                  style={[s.counterBtn, passengers <= 1 && s.counterBtnDisabled]}
                  onPress={() => adjustPassengers(-1)}
                  disabled={passengers <= 1}
                >
                  <Icon name="Minus" size={18} color={passengers <= 1 ? COLORS.textTertiary : COLORS.primary} />
                </TouchableOpacity>
                <Text style={s.counterValue}>{passengers}</Text>
                <TouchableOpacity
                  style={[s.counterBtn, passengers >= maxPassengers && s.counterBtnDisabled]}
                  onPress={() => adjustPassengers(1)}
                  disabled={passengers >= maxPassengers}
                >
                  <Icon name="Plus" size={18} color={passengers >= maxPassengers ? COLORS.textTertiary : COLORS.primary} />
                </TouchableOpacity>
                <Text style={s.counterLabel}>{passengers === 1 ? '1 persona' : `${passengers} personas`}</Text>
              </View>
              <Text style={s.groupHint}>
                {passengers === 1
                  ? 'Viajas solo: el precio es exclusivo para ti.'
                  : `Viajan juntos: el precio cubre a las ${passengers} personas de tu grupo.`}
                {' '}Hasta {maxPassengers} con este vehículo.
              </Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Precio que ofreces</Text>
              <View style={s.inputRow}>
                <Text style={s.currency}>$</Text>
                <TextInput
                  style={[s.input, s.priceInput]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  value={offeredPrice}
                  onChangeText={(t) => setOfferedPrice(formatPriceInput(t))}
                  keyboardType="numeric"
                  onFocus={() => setShowDropdown(false)}
                />
              </View>
              <Text style={s.priceHint}>
                Tú propones el precio. El conductor puede aceptarlo o proponerte otro antes de confirmar.
              </Text>
            </View>

            <View style={[s.field, s.fieldLast]}>
              <Text style={s.label}>Notas (opcional)</Text>
              <TextInput
                style={s.notesInput}
                placeholder="Ej: número de vuelo, equipaje grande, mascota, punto de referencia..."
                placeholderTextColor={COLORS.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                onFocus={() => setShowDropdown(false)}
              />
            </View>
          </DepthCard>

          <TouchableOpacity
            style={[s.publishBtn, loading && s.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Icon name="Send" size={18} color={COLORS.white} />
                <Text style={s.publishBtnText}>Publicar solicitud</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.disclaimer}>Al publicar, los conductores verificados podrán ver tu solicitud.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerHero: { flex: 1, gap: 2 },
  headerTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    textShadowColor: COLORS.shadowBlue,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  headerSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  segmented: {
    flexDirection: 'row',
    gap: SPACING.sm,
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: RADIUS.md,
  },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  segmentTextActive: { color: COLORS.white },

  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  formWrap: { marginBottom: SPACING.lg },
  formContent: { padding: SPACING.lg, gap: SPACING.lg },
  field: { gap: SPACING.sm },
  fieldLast: { marginBottom: 0 },
  label: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  inputRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  input: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  priceInput: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold },
  currency: { ...TYPOGRAPHY.h4, color: COLORS.textSecondary },

  dropdown: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownTexts: { flex: 1 },
  dropdownName: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textPrimary },
  dropdownCity: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  dropdownEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownEmptyText: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },

  flex1: { flex: 1 },
  timeRow: { flexDirection: 'row', gap: SPACING.sm },
  meridiemGroup: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  meridiemBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  meridiemBtnActive: { backgroundColor: COLORS.primary },
  meridiemText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  meridiemTextActive: { color: COLORS.white },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15, 26, 46, 0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerCancel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  pickerDone: { ...TYPOGRAPHY.bodySmall, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },

  vehicleRow: { flexDirection: 'row', gap: SPACING.sm },
  vehicleChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  vehicleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vehicleChipText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary, marginTop: 2 },
  vehicleChipTextActive: { color: COLORS.white },
  vehicleChipSub: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, fontSize: 10 },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    minWidth: 40,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.extrabold,
  },
  counterLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginLeft: SPACING.xs },
  groupHint: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: 6 },

  priceHint: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },

  notesInput: {
    ...TYPOGRAPHY.body,
    minHeight: 80,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },

  publishBtn: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: TYPOGRAPHY.weight.bold },
  disclaimer: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
})
