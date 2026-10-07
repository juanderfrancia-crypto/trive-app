import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import DepthCard from '../components/DepthCard'
import Icon from '../components/Icon'
import Illustration, { type IllustrationName } from '../components/illustrations/Illustration'
import { useAirportNegotiation } from '../hooks/useAirportNegotiation'
import { NegotiationChatModal } from '../components/NegotiationChatModal'
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

const PRICE_RANGES = [
  { label: 'Municipios Valle del Cauca → Cali', range: '$60.000 – $120.000' },
  { label: 'Cali centro → Aeropuerto', range: '$30.000 – $60.000' },
]

type Tab = 'create' | 'my_requests' | 'active_trips' | 'completed_trips'

const TABS: { key: Tab; label: string; icon: 'Plus' | 'List' | 'Car' | 'CheckCheck' }[] = [
  { key: 'create', label: 'Crear', icon: 'Plus' },
  { key: 'my_requests', label: 'Solicitudes', icon: 'List' },
  { key: 'active_trips', label: 'Activos', icon: 'Car' },
  { key: 'completed_trips', label: 'Completados', icon: 'CheckCheck' },
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

function RouteRows({ from, to }: { from: string; to: string }) {
  return (
    <View style={s.routeRows}>
      <View style={s.routeRow}>
        <Icon name="CircleDot" size={16} color={COLORS.primary} />
        <Text style={s.routeText} numberOfLines={1}>{from}</Text>
      </View>
      <View style={s.routeRow}>
        <Icon name="MapPin" size={16} color={COLORS.textPrimary} />
        <Text style={s.routeText} numberOfLines={1}>{to}</Text>
      </View>
    </View>
  )
}

export default function AirportRequestScreen() {
  const navigation = useNavigation<any>()
  const { createRequest, requests, loading: loadingRequests, loadPassengerRequests, loadPassengerActiveTrips } = useAirportNegotiation()
  const user = useAppStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<Tab>('create')
  const [tripType, setTripType] = useState<'airport' | 'custom'>('airport')

  const [origin, setOrigin] = useState('')
  const [airportQuery, setAirportQuery] = useState('')
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [customDestination, setCustomDestination] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [passengers, setPassengers] = useState(1)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [dateStr, setDateStr] = useState(todayStr())
  const [timeStr, setTimeStr] = useState(defaultTimeStr())
  const [loading, setLoading] = useState(false)

  const activeRequests = requests.filter(r => r.passenger_id === user?.id && r.status === 'pending')
  const activeTrips = requests.filter(r => r.passenger_id === user?.id && r.status === 'accepted')
  const completedTrips = requests.filter(r => r.passenger_id === user?.id && r.status === 'completed')

  const [showChatModal, setShowChatModal] = useState(false)
  const [chatRequest, setChatRequest] = useState<any>(null)

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

  const clearAirport = () => {
    setSelectedAirport(null)
    setAirportQuery('')
    setShowDropdown(false)
  }

  const adjustPassengers = (delta: number) =>
    setPassengers(prev => Math.min(8, Math.max(1, prev + delta)))

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadPassengerRequests(user.id)
      }
    }, [user?.id, loadPassengerRequests])
  )

  React.useEffect(() => {
    if (user?.id && activeTab === 'active_trips') {
      loadPassengerActiveTrips(user.id)
    }
  }, [activeTab, user?.id, loadPassengerActiveTrips])

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
      setOrigin('')
      setAirportQuery('')
      setSelectedAirport(null)
      setCustomDestination('')
      setOfferedPrice('')
      setNotes('')
      setPassengers(1)
      setDateStr(todayStr())
      setTimeStr(defaultTimeStr())
      setActiveTab('my_requests')
    } catch (err: any) {
      showError(err.message || 'Error al publicar solicitud')
    } finally {
      setLoading(false)
    }
  }

  const openDetails = (requestId: string) =>
    navigation.navigate('AirportRequestDetails' as never, { requestId } as never)

  const renderEmpty = (illustration: IllustrationName, title: string, text: string) => (
    <View style={s.emptyState}>
      <Illustration name={illustration} width={180} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerHero}>
          <Text style={s.headerTitle}>Rutas personalizadas</Text>
          <Text style={s.headerSub}>Publica a dónde vas y recibe ofertas de conductores</Text>
        </View>
      </View>

      <View style={s.tabsContainer}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Icon name={tab.icon} size={18} color={active ? COLORS.primary : COLORS.textTertiary} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {activeTab === 'create' && (
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
            {activeRequests.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>Solicitudes activas</Text>
                {activeRequests.map(req => (
                  <TouchableOpacity key={req.id} onPress={() => openDetails(req.id)} activeOpacity={0.8}>
                    <DepthCard style={s.cardWrap} contentStyle={s.cardContent}>
                      <View style={s.cardTop}>
                        <View style={s.cardTopInfo}>
                          <Text style={s.cardDest} numberOfLines={1}>{req.destination.split(' —')[0]}</Text>
                          <Text style={s.cardMeta}>
                            {new Date(req.departure_time).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={s.priceText}>${req.offered_price.toLocaleString('es-CO')}</Text>
                      </View>
                      <View style={s.cardBottom}>
                        <View style={[s.tag, req.offered_price > req.initial_price && s.tagWarning]}>
                          <Text style={[s.tagText, req.offered_price > req.initial_price && s.tagTextWarning]}>
                            {req.offered_price > req.initial_price ? 'Precio aumentado' : 'Esperando ofertas'}
                          </Text>
                        </View>
                        <Icon name="ChevronRight" size={16} color={COLORS.textTertiary} />
                      </View>
                    </DepthCard>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <DepthCard style={s.formWrap} contentStyle={s.formContent}>
              <View style={s.field}>
                <Text style={s.label}>Origen</Text>
                <View style={s.inputRow}>
                  <Icon name="CircleDot" size={16} color={COLORS.primary} />
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
                <Text style={s.label}>Fecha y hora de salida</Text>
                <View style={s.dateRow}>
                  <View style={[s.inputRow, s.dateInput]}>
                    <Icon name="Calendar" size={15} color={COLORS.primary} />
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
                    <Icon name="Clock" size={15} color={COLORS.primary} />
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

              <View style={s.field}>
                <Text style={s.label}>Pasajeros</Text>
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
                    style={[s.counterBtn, passengers >= 8 && s.counterBtnDisabled]}
                    onPress={() => adjustPassengers(1)}
                    disabled={passengers >= 8}
                  >
                    <Icon name="Plus" size={18} color={passengers >= 8 ? COLORS.textTertiary : COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={s.counterLabel}>{passengers === 1 ? '1 persona' : `${passengers} personas`}</Text>
                </View>
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
                <View style={s.ranges}>
                  {PRICE_RANGES.map((r) => (
                    <View key={r.label} style={s.rangeRow}>
                      <View style={s.rangeDot} />
                      <Text style={s.rangeText}>{r.label}: <Text style={s.rangeValue}>{r.range}</Text></Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[s.field, s.fieldLast]}>
                <Text style={s.label}>Notas (opcional)</Text>
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
      )}

      {activeTab === 'my_requests' && (
        <ScrollView contentContainerStyle={s.scroll}>
          {loadingRequests ? (
            <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : activeRequests.length === 0 ? (
            renderEmpty('noData', 'Sin solicitudes activas', 'Crea una solicitud para que los conductores puedan verte')
          ) : (
            activeRequests.map(req => (
              <TouchableOpacity key={req.id} onPress={() => openDetails(req.id)} activeOpacity={0.8}>
                <DepthCard style={s.cardWrap} contentStyle={s.cardContent}>
                  <View style={s.cardTop}>
                    <View style={s.cardTopInfo}>
                      <RouteRows from={req.origin} to={req.destination} />
                    </View>
                    <Text style={s.priceText}>${req.offered_price.toLocaleString('es-CO')}</Text>
                  </View>
                  <View style={s.cardFooter}>
                    <View style={s.metaItem}>
                      <Icon name="Clock" size={13} color={COLORS.textTertiary} />
                      <Text style={s.metaText}>{new Date(req.departure_time).toLocaleDateString('es-CO')}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Icon name="Users" size={13} color={COLORS.textTertiary} />
                      <Text style={s.metaText}>{req.passengers} pasajero(s)</Text>
                    </View>
                    <View style={s.tag}>
                      <Text style={s.tagText}>Activa</Text>
                    </View>
                  </View>
                </DepthCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'active_trips' && (
        <ScrollView contentContainerStyle={s.scroll}>
          {loadingRequests ? (
            <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : activeTrips.length === 0 ? (
            renderEmpty('routePlanning', 'Sin viajes activos', 'Tus viajes confirmados aparecerán aquí')
          ) : (
            activeTrips.map(req => (
              <DepthCard key={req.id} style={s.cardWrap} contentStyle={s.cardContent}>
                <View style={s.cardTop}>
                  <View style={s.cardTopInfo}>
                    <RouteRows from={req.origin} to={req.destination} />
                  </View>
                  <Text style={s.priceText}>${req.offered_price.toLocaleString('es-CO')}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.detailList}>
                  <View style={s.metaItem}>
                    <Icon name="UserCircle" size={15} color={COLORS.primary} />
                    <Text style={s.detailValue}>{req.driver_name || 'Conductor'}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Icon name="Calendar" size={14} color={COLORS.textTertiary} />
                    <Text style={s.metaText}>{new Date(req.departure_time).toLocaleDateString('es-CO')}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Icon name="Clock" size={14} color={COLORS.textTertiary} />
                    <Text style={s.metaText}>{new Date(req.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Icon name="Users" size={14} color={COLORS.textTertiary} />
                    <Text style={s.metaText}>{req.passengers} {req.passengers === 1 ? 'persona' : 'personas'}</Text>
                  </View>
                  {!!req.notes && (
                    <View style={s.metaItem}>
                      <Icon name="MessageCircle" size={14} color={COLORS.textTertiary} />
                      <Text style={s.metaText} numberOfLines={1}>{req.notes}</Text>
                    </View>
                  )}
                </View>
                <View style={s.divider} />
                <TouchableOpacity
                  style={s.chatBtn}
                  onPress={() => {
                    setChatRequest(req)
                    setShowChatModal(true)
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="MessageCircle" size={16} color={COLORS.primary} />
                  <Text style={s.chatBtnText}>Chatear con el conductor</Text>
                </TouchableOpacity>
              </DepthCard>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'completed_trips' && (
        <ScrollView contentContainerStyle={s.scroll}>
          {loadingRequests ? (
            <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : completedTrips.length === 0 ? (
            renderEmpty('allChecked', 'Sin viajes completados', 'Una vez completes viajes, podrás calificar aquí')
          ) : (
            completedTrips.map(req => (
              <TouchableOpacity
                key={req.id}
                onPress={() => navigation.navigate('CompletedTrips' as never, { requestId: req.id } as never)}
                activeOpacity={0.8}
              >
                <DepthCard style={s.cardWrap} contentStyle={s.cardContent}>
                  <View style={s.cardTop}>
                    <View style={s.cardTopInfo}>
                      <RouteRows from={req.origin} to={req.destination} />
                    </View>
                    <Text style={s.priceText}>${req.offered_price.toLocaleString('es-CO')}</Text>
                  </View>
                  <View style={s.cardFooter}>
                    <View style={s.metaItem}>
                      <Icon name="UserCircle" size={15} color={COLORS.textTertiary} />
                      <Text style={s.metaText}>{req.driver_name || 'Conductor'}</Text>
                    </View>
                    <View style={[s.tag, s.tagSuccess]}>
                      <Icon name="CircleCheck" size={13} color={COLORS.success} />
                      <Text style={[s.tagText, s.tagTextSuccess]}>Completado</Text>
                    </View>
                  </View>
                </DepthCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {chatRequest && (
        <NegotiationChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          requestId={chatRequest.id}
          driverId={chatRequest.driver_id ?? ''}
          driverName={chatRequest.driver_name || 'Conductor'}
          otherUserId={chatRequest.driver_id}
        />
      )}
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

  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textTertiary },
  tabTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weight.bold },

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.xxxl },

  block: { marginBottom: SPACING.lg },
  blockTitle: { ...TYPOGRAPHY.label, color: COLORS.textTertiary, marginBottom: SPACING.sm },

  cardWrap: { marginBottom: SPACING.md },
  cardContent: { padding: SPACING.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  cardTopInfo: { flex: 1 },
  cardDest: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  cardMeta: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceText: { ...TYPOGRAPHY.h3, color: COLORS.primary, fontWeight: TYPOGRAPHY.weight.extrabold },
  routeRows: { gap: SPACING.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  routeText: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  detailList: { gap: SPACING.sm },
  detailValue: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textPrimary },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, flexShrink: 1 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
  },
  tagText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  tagWarning: { backgroundColor: COLORS.warningLight },
  tagTextWarning: { color: COLORS.warningDark },
  tagSuccess: { backgroundColor: COLORS.successLight },
  tagTextSuccess: { color: COLORS.success },

  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  chatBtnText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },

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

  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  dateInput: { flex: 3 },
  timeInput: { flex: 2 },

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

  ranges: { gap: 6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary },
  rangeText: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  rangeValue: { fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },

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

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, textAlign: 'center' },
})
