import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { useAppStore } from '../store/useAppStore'
import { showSuccess, showError } from '../utils/showError'

// ─── Lista de aeropuertos colombianos ────────────────────────────────────────
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

// ─── Destinos populares en Cali ────────────────────────────────────────────
interface Destination { name: string; code: string }

const CALI_DESTINATIONS: Destination[] = [
  { name: 'Unicentro', code: 'UNI' },
  { name: 'Jardín Plaza', code: 'JAR' },
  { name: 'Centro Comercial (Centro)', code: 'CC' },
  { name: 'Terminal de Buses', code: 'TER' },
  { name: 'Hospital Universitario', code: 'HU' },
  { name: 'Centro Histórico', code: 'CH' },
  { name: 'San Fernando', code: 'SF' },
  { name: 'Exito Menga', code: 'EM' },
  { name: 'Carrefour Mayorca', code: 'CM' },
  { name: 'Centro de Eventos', code: 'CE' },
]

const PRICE_RANGES = [
  { label: 'Municipios Valle del Cauca → Cali', range: '$60.000 – $120.000' },
  { label: 'Cali centro → Aeropuerto', range: '$30.000 – $60.000' },
]

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const defaultTimeStr = () => {
  const d = new Date()
  d.setHours(d.getHours() + 2, 0, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AirportRequestScreen() {
  const navigation = useNavigation()
  const { createRequest, requests, loading: loadingRequests } = useAirportNegotiation()
  const user = useAppStore((s) => s.user)

  // Tab state
  const [activeTab, setActiveTab] = useState<'create' | 'my_requests'>('create')

  // Trip type state
  const [tripType, setTripType] = useState<'airport' | 'custom'>('airport')

  const [origin, setOrigin] = useState('')
  const [airportQuery, setAirportQuery] = useState('')
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [selectedCaliDest, setSelectedCaliDest] = useState<Destination | null>(null)
  const [customDestination, setCustomDestination] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [passengers, setPassengers] = useState(1)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [dateStr, setDateStr] = useState(todayStr())
  const [timeStr, setTimeStr] = useState(defaultTimeStr())
  const [loading, setLoading] = useState(false)

  // Filtrar solicitudes activas del pasajero actual
  const activeRequests = requests.filter(r => r.passenger_id === user?.id && r.status === 'pending')

  const filteredAirports = airportQuery.length >= 2
    ? COLOMBIA_AIRPORTS.filter(a =>
        a.name.toLowerCase().includes(airportQuery.toLowerCase()) ||
        a.city.toLowerCase().includes(airportQuery.toLowerCase()) ||
        a.iata.toLowerCase().includes(airportQuery.toLowerCase())
      ).slice(0, 6)
    : []

  const selectAirport = (airport: Airport) => {
    setSelectedAirport(airport)
    setAirportQuery(`${airport.name} — ${airport.city}`)
    setShowDropdown(false)
  }

  const selectCaliDestination = (dest: Destination) => {
    setSelectedCaliDest(dest)
    setShowDropdown(false)
  }

  const clearAirport = () => {
    setSelectedAirport(null)
    setAirportQuery('')
    setShowDropdown(false)
  }

  const clearCaliDest = () => {
    setSelectedCaliDest(null)
  }

  const clearCustomDest = () => {
    setCustomDestination('')
  }

  const adjustPassengers = (delta: number) =>
    setPassengers(prev => Math.min(8, Math.max(1, prev + delta)))

  const formatPriceInput = (text: string) => {
    const digits = text.replace(/\D/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('es-CO')
  }

  const handlePublish = async () => {
    if (!user?.id) { showError('Debes iniciar sesión'); return }
    if (!origin.trim()) { showError('Indica tu ciudad de origen'); return }

    // Validar destino según tipo
    let destination = ''
    if (tripType === 'airport') {
      if (!selectedAirport) { showError('Selecciona el aeropuerto de destino'); return }
      destination = `${selectedAirport.name} (${selectedAirport.iata}) — ${selectedAirport.city}`
    } else {
      if (!customDestination.trim()) { showError('Describe tu destino personalizado'); return }
      destination = customDestination.trim()
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { showError('Fecha en formato AAAA-MM-DD (ej: 2026-06-15)'); return }
    if (!/^\d{2}:\d{2}$/.test(timeStr)) { showError('Hora en formato HH:MM (ej: 06:30)'); return }
    const departure = new Date(`${dateStr}T${timeStr}:00`)
    if (isNaN(departure.getTime())) { showError('Fecha u hora inválida'); return }
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
        offered_price: price,
        trip_type: tripType,
        notes: notes.trim() || undefined,
      })
      showSuccess('Solicitud publicada. Te avisamos cuando un conductor acepte.')
      navigation.goBack()
    } catch (err: any) {
      showError(err.message || 'Error al publicar solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* Header con gradiente */}
      <LinearGradient
        colors={['#0E2699', '#1230B8', '#1A3FCC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerHero}>
          <Ionicons name="car-sport" size={22} color="rgba(255,255,255,0.9)" />
          <Text style={s.headerTitle}>Solicitar Viaje</Text>
          <Text style={s.headerSub}>Publica y espera ofertas</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setActiveTab(activeTab === 'create' ? 'my_requests' : 'create')}
          style={s.tabToggleBtn}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'create' ? 'list' : 'add'} 
            size={22} 
            color="#fff" 
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* TAB: CREAR SOLICITUD */}
      {activeTab === 'create' && (
        <>
          {/* Trip type selector */}
          <View style={s.tripTypeSelector}>
        <TouchableOpacity
          style={[s.tripTypeBtn, tripType === 'airport' && s.tripTypeBtnActive]}
          onPress={() => {
            setTripType('airport')
            setCustomDestination('')
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="airplane" size={18} color={tripType === 'airport' ? '#fff' : COLORS.primary} />
          <Text style={[s.tripTypeBtnText, tripType === 'airport' && s.tripTypeBtnTextActive]}>Aeropuerto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tripTypeBtn, tripType === 'custom' && s.tripTypeBtnActive]}
          onPress={() => {
            setTripType('custom')
            setSelectedAirport(null)
            setAirportQuery('')
            setSelectedCaliDest(null)
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="location" size={18} color={tripType === 'custom' ? '#fff' : COLORS.primary} />
          <Text style={[s.tripTypeBtnText, tripType === 'custom' && s.tripTypeBtnTextActive]}>Otro</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Sección de solicitudes activas */}
        {activeRequests.length > 0 && (
          <View style={s.activeRequestsSection}>
            <View style={s.sectionHeader}>
              <Ionicons name="list" size={18} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Mis solicitudes activas</Text>
            </View>
            <View style={s.activeRequestsList}>
              {activeRequests.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={s.activeRequestCard}
                  onPress={() => navigation.navigate('AirportRequestDetails' as never, { requestId: req.id } as never)}
                  activeOpacity={0.75}
                >
                  <View style={s.activeRequestTop}>
                    <View style={s.activeRequestInfo}>
                      <Text style={s.activeRequestDest} numberOfLines={1}>
                        {req.destination.split(' —')[0]}
                      </Text>
                      <Text style={s.activeRequestTime} numberOfLines={1}>
                        {new Date(req.departure_time).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={s.activeRequestPriceBox}>
                      <Text style={s.activeRequestPrice}>
                        ${req.offered_price.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  </View>
                  <View style={s.activeRequestBottom}>
                    <View style={[s.activeRequestBadge, req.offered_price > req.initial_price && s.activeRequestBadgeUpdated]}>
                      <Ionicons name="alert-circle" size={13} color={req.offered_price > req.initial_price ? '#F59E0B' : COLORS.primary} />
                      <Text style={[s.activeRequestBadgeText, req.offered_price > req.initial_price && s.activeRequestBadgeTextUpdated]}>
                        {req.offered_price > req.initial_price ? 'Precio aumentado' : 'Esperando ofertas'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Formulario con sombra */}
        <View style={s.formCard}>

          {/* Origen */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>ORIGEN</Text>
            <View style={s.inputRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Ej: Palmira, Buga, Cali..."
                placeholderTextColor={COLORS.textTertiary}
                value={origin}
                onChangeText={setOrigin}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={s.divider} />

          {/* Destino - Aeropuerto */}
          {tripType === 'airport' && (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>AEROPUERTO DESTINO</Text>
                <View style={[s.inputRow, selectedAirport && s.inputRowSelected]}>
                  <Ionicons
                    name="airplane-outline"
                    size={18}
                    color={selectedAirport ? COLORS.primary : COLORS.textTertiary}
                    style={s.inputIcon}
                  />
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
                      <Ionicons name="close-circle" size={17} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Dropdown */}
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
                          <Ionicons name="airplane" size={13} color={COLORS.primary} />
                        </View>
                        <View style={s.dropdownTexts}>
                          <Text style={s.dropdownName}>{airport.name}</Text>
                          <Text style={s.dropdownCity}>{airport.city} · {airport.iata}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Sin resultados */}
                {showDropdown && airportQuery.length >= 2 && filteredAirports.length === 0 && !selectedAirport && (
                  <View style={s.dropdownEmpty}>
                    <Ionicons name="search-outline" size={15} color={COLORS.textTertiary} />
                    <Text style={s.dropdownEmptyText}>Sin resultados para "{airportQuery}"</Text>
                  </View>
                )}
              </View>
              <View style={s.divider} />
            </>
          )}

          {/* Destino - Personalizado */}
          {tripType === 'custom' && (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>¿ADÓNDE VAS?</Text>
                <View style={[s.inputRow, customDestination && s.inputRowSelected]}>
                  <Ionicons name="location-outline" size={18} color={customDestination ? COLORS.primary : COLORS.textTertiary} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="Describe tu destino (ej: Terminal Palmaseca, Casa en Pereira)"
                    placeholderTextColor={COLORS.textTertiary}
                    value={customDestination}
                    onChangeText={setCustomDestination}
                    returnKeyType="next"
                  />
                  {customDestination.length > 0 && (
                    <TouchableOpacity onPress={clearCustomDest} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Ionicons name="close-circle" size={17} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={s.divider} />
            </>
          )}

          {/* Fecha y hora */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>FECHA Y HORA DE SALIDA</Text>
            <View style={s.dateRow}>
              <View style={[s.inputRow, s.dateInput]}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={COLORS.textTertiary}
                  value={dateStr}
                  onChangeText={setDateStr}
                  keyboardType="numeric"
                  maxLength={10}
                  onFocus={() => setShowDropdown(false)}
                />
              </View>
              <View style={[s.inputRow, s.timeInput]}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="HH:MM"
                  placeholderTextColor={COLORS.textTertiary}
                  value={timeStr}
                  onChangeText={setTimeStr}
                  keyboardType="numeric"
                  maxLength={5}
                  onFocus={() => setShowDropdown(false)}
                />
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Personas */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>PERSONAS</Text>
            <View style={s.counterRow}>
              <TouchableOpacity
                style={[s.counterBtn, passengers <= 1 && s.counterBtnDisabled]}
                onPress={() => adjustPassengers(-1)}
                disabled={passengers <= 1}
              >
                <Ionicons name="remove" size={18} color={passengers <= 1 ? COLORS.textTertiary : COLORS.primary} />
              </TouchableOpacity>
              <View style={s.counterValueBox}>
                <Text style={s.counterValueText}>{passengers}</Text>
              </View>
              <TouchableOpacity
                style={[s.counterBtn, passengers >= 8 && s.counterBtnDisabled]}
                onPress={() => adjustPassengers(1)}
                disabled={passengers >= 8}
              >
                <Ionicons name="add" size={18} color={passengers >= 8 ? COLORS.textTertiary : COLORS.primary} />
              </TouchableOpacity>
              <Text style={s.counterLabel}>
                {passengers === 1 ? '1 persona' : `${passengers} personas`}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Precio */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>PRECIO QUE OFRECES</Text>
            <View style={s.inputRow}>
              <Text style={s.currencyPrefix}>$</Text>
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
            <View style={s.rangesBox}>
              {PRICE_RANGES.map((r) => (
                <View key={r.label} style={s.rangeRow}>
                  <View style={s.rangeDot} />
                  <Text style={s.rangeText}>{r.label}: <Text style={s.rangeValue}>{r.range}</Text></Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.divider} />

          {/* Notas */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>NOTAS (OPCIONAL)</Text>
            <TextInput
              style={s.notesInput}
              placeholder="Ej: Vuelo a las 8am, salgo a las 5am..."
              placeholderTextColor={COLORS.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              onFocus={() => setShowDropdown(false)}
            />
          </View>

        </View>

        {/* Botón publicar */}
        <TouchableOpacity
          style={[s.publishBtnWrap, loading && s.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#0E2699', '#1230B8', '#1A3FCC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.publishBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={s.publishBtnText}>Publicar solicitud</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Al publicar, los conductores verificados podrán ver tu solicitud.
        </Text>
      </ScrollView>
      </>
      )}

      {/* TAB: MIS SOLICITUDES */}
      {activeTab === 'my_requests' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {loadingRequests ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : activeRequests.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="folder-outline" size={48} color={COLORS.textTertiary} style={s.emptyIcon} />
              <Text style={s.emptyTitle}>Sin solicitudes activas</Text>
              <Text style={s.emptyText}>Crea una solicitud para que los conductores puedan verte</Text>
            </View>
          ) : (
            <View style={s.requestsList}>
              {activeRequests.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={s.requestCard}
                  onPress={() => navigation.navigate('AirportRequestDetails' as never, { requestId: req.id } as never)}
                  activeOpacity={0.75}
                >
                  <View style={s.requestCardHeader}>
                    <View>
                      <Text style={s.requestFrom}>{req.origin}</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.textTertiary} />
                      <Text style={s.requestTo}>{req.destination}</Text>
                    </View>
                    <View style={s.requestPrice}>
                      <Text style={s.requestPriceLabel}>Ofrecido</Text>
                      <Text style={s.requestPriceValue}>${req.offered_price.toLocaleString('es-CO')}</Text>
                    </View>
                  </View>
                  <View style={s.requestDivider} />
                  <View style={s.requestCardFooter}>
                    <View style={s.requestDetail}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
                      <Text style={s.requestDetailText}>
                        {new Date(req.departure_time).toLocaleDateString('es-CO')}
                      </Text>
                    </View>
                    <View style={s.requestDetail}>
                      <Ionicons name="people-outline" size={13} color={COLORS.textTertiary} />
                      <Text style={s.requestDetailText}>{req.passengers} pasajero(s)</Text>
                    </View>
                    <View style={[s.requestBadge, s.requestBadgeActive]}>
                      <Text style={s.requestBadgeText}>Activa</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },

  // Header con gradiente
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerHero: { flex: 1, alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  scroll: { paddingBottom: 40 },

  formCard: {
    backgroundColor: '#fff',
  },
  fieldGroup: { padding: SPACING.lg },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.8, marginBottom: SPACING.sm,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.md, paddingVertical: 11,
  },
  inputRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },

  // Autocomplete dropdown
  dropdown: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  dropdownTexts: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  dropdownCity: { fontSize: 12, color: COLORS.textTertiary, marginTop: 1 },
  dropdownEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  dropdownEmptyText: { fontSize: 13, color: COLORS.textTertiary },

  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },

  currencyPrefix: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginRight: 6 },
  priceInput: { fontSize: 18, fontWeight: '700' },

  rangesBox: { marginTop: SPACING.sm, gap: 5 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rangeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, opacity: 0.4 },
  rangeText: { fontSize: 12, color: '#94A3B8' },
  rangeValue: { fontWeight: '600', color: COLORS.textSecondary },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  counterBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterValueBox: {
    width: 44, height: 38, borderRadius: RADIUS.md,
    backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: COLORS.primary + '40',
    justifyContent: 'center', alignItems: 'center',
  },
  counterValueText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  counterLabel: { fontSize: 14, color: COLORS.textSecondary, marginLeft: SPACING.sm },

  notesInput: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: 15, color: COLORS.textPrimary, minHeight: 80,
    textAlignVertical: 'top',
  },

  publishBtnWrap: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md, overflow: 'hidden',
    shadowColor: '#1230B8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: 15,
  },
  publishBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  disclaimer: {
    fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.lg,
  },

  // Active requests section
  activeRequestsSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  activeRequestsList: {
    gap: SPACING.sm,
  },
  activeRequestCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
  },
  activeRequestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activeRequestInfo: {
    flex: 1,
  },
  activeRequestDest: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  activeRequestTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  activeRequestPriceBox: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  activeRequestPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  activeRequestBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  activeRequestBadgeUpdated: {
    backgroundColor: '#FEF3C7',
  },
  activeRequestBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
  },
  activeRequestBadgeTextUpdated: {
    color: '#92400E',
  },

  // Trip type selector
  tripTypeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
  },
  tripTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  tripTypeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tripTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripTypeBtnTextActive: {
    color: '#fff',
  },

  // Destination chips
  destinationScroll: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
    marginRight: SPACING.sm,
  },
  destChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  destChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  destChipTextSelected: {
    color: '#fff',
  },

  // Tab toggle button
  tabToggleBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },

  // Empty state
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    marginBottom: SPACING.lg,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
  },

  // Requests list
  requestsList: {
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  requestFrom: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  requestTo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
  },
  requestPrice: {
    alignItems: 'flex-end',
  },
  requestPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  requestPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  requestDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: SPACING.lg,
  },
  requestCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  requestDetailText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  requestBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  requestBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
})


