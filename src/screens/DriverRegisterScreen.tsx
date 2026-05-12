import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRoutes } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { insertNotificationForUser } from '../services/notificationInsert'

const VEHICLE_TYPES = [
  { id: 'auto', name: 'Auto', maxSeats: 4, icon: 'car-sport' as const },
  { id: 'taxi', name: 'Taxi', maxSeats: 4, icon: 'car' as const },
  { id: 'busetica', name: 'Busetica', maxSeats: 15, icon: 'bus' as const },
  { id: 'buseta', name: 'Buseta', maxSeats: 70, icon: 'bus' as const },
]

export default function DriverRegisterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { user } = useAppStore()
  const { createRoute, loading: routeLoading, error: routeError } = useRoutes()

  // Ruta campos - FECHA POR DEFECTO: MAÑANA
  const [origin, setOrigin] = useState('')
  const [originZone, setOriginZone] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationZone, setDestinationZone] = useState('')
  // Fecha y hora POR DEFECTO: AHORA (flujo informal de ride-sharing)
  const [departureDate, setDepartureDate] = useState(new Date())
  
  // ⏰ TIEMPO DE SALIDA (departure delay): Cuántos minutos espera antes de salir
  const [departureDelayMinutes, setDepartureDelayMinutes] = useState(0) // 0 = ahora
  const [showDepartureDelayPicker, setShowDepartureDelayPicker] = useState(false)
  const [customDepartureDelay, setCustomDepartureDelay] = useState('') // Para ingresar personalizado
  
  // ⏳ DURACIÓN DEL VIAJE: Cuántos minutos tarda de origen a destino
  const [estimatedTravelMinutes, setEstimatedTravelMinutes] = useState('180') // 3 horas = 180 minutos
  const [showTravelDurationPicker, setShowTravelDurationPicker] = useState(false)
  const [customTravelDuration, setCustomTravelDuration] = useState('') // Para ingresar personalizado
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [totalSeats, setTotalSeats] = useState('')
  const [pricePerSeat, setPricePerSeat] = useState('')
  const [routeVia, setRouteVia] = useState('')
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Vehículo datos
  const [vehicleData, setVehicleData] = useState<any>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [submittingRoute, setSubmittingRoute] = useState(false)

  const selectedVehicleType = VEHICLE_TYPES.find((v) => v.id === vehicleTypeId)
  const maxSeats = selectedVehicleType?.maxSeats || 0

  // Manejar cambio de asientos con validación automática
  const handleTotalSeatsChange = (text: string) => {
    if (!text) {
      setTotalSeats('')
      return
    }
    const num = parseInt(text, 10)
    if (num > maxSeats) {
      setTotalSeats(String(maxSeats))
    } else if (num < 1 && text !== '') {
      setTotalSeats('')
    } else {
      setTotalSeats(text)
    }
  }

  // Cargar datos del vehículo al montar
  useEffect(() => {
    loadVehicleData()
  }, [user?.id])

  const loadVehicleData = async () => {
    try {
      setVehicleLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select('vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setVehicleData(data)
      }
    } catch (err) {
      if (__DEV__) console.error('No hay rutas previas', err)
    } finally {
      setVehicleLoading(false)
    }
  }

  const validateForm = () => {
    if (!origin.trim()) {
      Alert.alert('Error', 'Por favor ingresa la ciudad de origen')
      return false
    }
    if (!originZone.trim()) {
      Alert.alert('Error', 'Por favor ingresa la zona de salida')
      return false
    }
    if (!destination.trim()) {
      Alert.alert('Error', 'Por favor ingresa la ciudad de destino')
      return false
    }
    if (!destinationZone.trim()) {
      Alert.alert('Error', 'Por favor ingresa la zona de llegada')
      return false
    }
    if (!estimatedTravelMinutes.trim() || parseInt(estimatedTravelMinutes) < 5) {
      Alert.alert('Error', 'La duración del viaje debe ser al menos 5 minutos')
      return false
    }
    if (!vehicleTypeId) {
      Alert.alert('Error', 'Por favor selecciona un tipo de vehículo')
      return false
    }
    if (!totalSeats.trim() || parseInt(totalSeats) < 1 || parseInt(totalSeats) > maxSeats) {
      Alert.alert('Error', `Por favor ingresa asientos válidos (1-${maxSeats})`)
      return false
    }
    if (!pricePerSeat.trim() || parseFloat(pricePerSeat) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un precio válido')
      return false
    }
    if (!vehicleData) {
      Alert.alert('Error', 'Por favor agrega información de tu vehículo primero en "Mi Vehículo"')
      return false
    }
    
    return true
  }

  const handleCreateRoute = async () => {
    if (submittingRoute) return
    if (!validateForm()) return
    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado')
      return
    }

    setSubmittingRoute(true)
    try {
      const now = new Date()
      
      // Calcular hora de salida (ahora + minutos de espera)
      const departureDateTime = new Date(now.getTime() + departureDelayMinutes * 60000)
      const travelMinutes = parseInt(estimatedTravelMinutes, 10)
      const arrivalDateTime = new Date(departureDateTime.getTime() + travelMinutes * 60000)

      // Guardar la hora local en un TIMESTAMP (sin timezone)
      // El campo de la base de datos es TIMESTAMP sin zona horaria.
      // Usar toLocalISOString evita que la hora se desplace por conversión UTC.
      const departure_time_str = toLocalISOString(departureDateTime)
      const arrival_time_str = toLocalISOString(arrivalDateTime)

      if (__DEV__) {
        console.log('📅 TRANSACCIONES DE TIEMPO (MODELO INFORMAL):')
        console.log(`  Ahora (local): ${toLocalISOString(now)}`)
        console.log(`  Ahora (UTC): ${now.toISOString()}`)
        console.log(`  Espera de: ${departureDelayMinutes} minutos`)
        console.log(`  Salida (local): ${departure_time_str}`)
        console.log(`  Duración viaje: ${travelMinutes} minutos`)
        console.log(`  Llegada (local): ${arrival_time_str}`)
      }

      // ⚠️ Validación informal: permitir rutas desde hace 15 minutos
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000)
      
      if (departureDateTime < fifteenMinutesAgo) {
        Alert.alert(
          'Hora de salida no válida',
          'La ruta debe comenzar en los próximos 15 minutos o ya.\n\n' +
          'Ejemplo: "Ahora" o "En 20 minutos" ✅'
        )
        setSubmittingRoute(false)
        return
      }

      const routeData = {
        driver_id: user.id,
        origin: `${origin.trim()} - ${originZone.trim()}`,
        destination: `${destination.trim()} - ${destinationZone.trim()}`,
        departure_time: departure_time_str,
        arrival_time: arrival_time_str,
        price_per_seat: parseFloat(pricePerSeat),
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        vehicle_make: vehicleData.vehicle_make,
        vehicle_model: vehicleData.vehicle_model || '',
        vehicle_year: vehicleData.vehicle_year,
        vehicle_plate: vehicleData.vehicle_plate,
        vehicle_color: vehicleData.vehicle_color,
        vehicle_type: vehicleTypeId,
        status: 'scheduled',
        description: routeVia.trim() || null,
      }

      if (__DEV__) {
        console.log('🚗 DATOS DE RUTA A CREAR:')
        console.log(JSON.stringify(routeData, null, 2))
      }

      const newRoute = await createRoute(routeData as any)

      insertNotificationForUser(user.id, {
        user_id: user.id,
        type: 'trip_update',
        title: 'Ruta publicada',
        message: `Tu ruta ${origin.trim()} → ${destination.trim()} está activa. Los pasajeros ya pueden verla y reservar.`,
        data: { route_id: newRoute?.id },
        is_read: false,
      }).catch(() => {})

      Alert.alert(
        'Éxito',
        '¡Ruta creada correctamente! Los pasajeros ya pueden verla y reservar.',
        [
          {
            text: 'Ir al inicio',
            onPress: () => {
              navigation.navigate('Main' as never)
            },
          },
        ]
      )

      // Limpiar formulario
      setOrigin('')
      setOriginZone('')
      setDestination('')
      setDestinationZone('')
      setDepartureDate(new Date())
      setDepartureDelayMinutes(0) // Resetear a "ahora"
      setCustomDepartureDelay('') // Limpiar input personalizado
      setEstimatedTravelMinutes('180') // Resetear a 3 horas
      setCustomTravelDuration('') // Limpiar input personalizado
      setVehicleTypeId('')
      setTotalSeats('')
      setPricePerSeat('')
      setRouteVia('')
    } catch (err: any) {
      if ((err as any).code === 'INSUFFICIENT_BALANCE') {
        Alert.alert(
          'Saldo insuficiente 💳',
          err.message + '\n\nRecarga tu billetera para poder publicar viajes.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Recargar saldo', onPress: () => navigation.navigate('Wallet' as never) },
          ]
        )
      } else {
        Alert.alert('Error', err.message || 'Error al crear la ruta. Intenta de nuevo.')
      }
    } finally {
      setSubmittingRoute(false)
    }
  }

  // Formato amigable para mostrar el tiempo de salida
  const getFormattedDepartureTime = () => {
    if (departureDelayMinutes === 0) return 'Ahora'
    if (departureDelayMinutes < 60) return `En ${departureDelayMinutes} min`
    const hours = Math.floor(departureDelayMinutes / 60)
    const mins = departureDelayMinutes % 60
    if (mins === 0) return `En ${hours}h`
    return `En ${hours}h ${mins}m`
  }

  // Formato amigable para duración del viaje
  const getFormattedTravelDuration = () => {
    const mins = parseInt(estimatedTravelMinutes, 10)
    if (mins < 60) return `${mins} minutos`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    if (remainingMins === 0) return `${hours} horas`
    return `${hours}h ${remainingMins}m`
  }

  // Convertir fecha a ISO string SIN convertir timezone
  // Esto es importante porque queremos guardar la hora LOCAL, no UTC
  const toLocalISOString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Crea tu ruta</Text>
            <Text style={styles.subtitle}>Publica tu viaje y gana dinero</Text>
          </View>
        </View>

        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
          </View>
          <Text style={styles.introTitle}>Conductor Verificado</Text>
          <Text style={styles.introText}>
            Publica tus rutas y conecta con pasajeros confiables
          </Text>
        </View>

        {/* RUTA DETAILS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="map" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Detalles de la ruta</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad origen"
              placeholderTextColor={COLORS.textTertiary}
              value={origin}
              onChangeText={setOrigin}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Zona/punto de salida"
              placeholderTextColor={COLORS.textTertiary}
              value={originZone}
              onChangeText={setOriginZone}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-circle" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad destino"
              placeholderTextColor={COLORS.textTertiary}
              value={destination}
              onChangeText={setDestination}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Zona/punto de llegada"
              placeholderTextColor={COLORS.textTertiary}
              value={destinationZone}
              onChangeText={setDestinationZone}
              editable={!routeLoading}
            />
          </View>

          {/* FECHA DEL VIAJE */}
          <View style={styles.inputContainer}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.datePickerText}>
                {departureDate.toLocaleDateString('es-CO', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper text: Flujo informal */}
          <View style={styles.helperTextContainer}>
            <Ionicons name="information-circle" size={16} color={COLORS.success} />
            <Text style={[styles.helperText, { color: COLORS.success }]}>
              ⚡ Publica tu ruta AHORA y comienza de inmediato
            </Text>
          </View>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerControls}>
                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(departureDate)
                    newDate.setDate(newDate.getDate() - 1)
                    setDepartureDate(newDate)
                  }}
                  style={styles.dateButton}
                >
                  <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>

                <Text style={styles.datePickerDisplayText}>
                  {departureDate.toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(departureDate)
                    newDate.setDate(newDate.getDate() + 1)
                    setDepartureDate(newDate)
                  }}
                  style={styles.dateButton}
                >
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Listo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DEPARTURE TIME SELECTOR */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="play-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>¿Cuándo sales?</Text>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDepartureDelayPicker(!showDepartureDelayPicker)}
              disabled={routeLoading}
            >
              <Text style={styles.datePickerText}>
                {getFormattedDepartureTime()}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDepartureDelayPicker && (
            <View style={styles.optionsPickerContainer}>
              {[0, 5, 10, 15, 20].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.optionButton,
                    departureDelayMinutes === mins && customDepartureDelay === '' && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    setDepartureDelayMinutes(mins)
                    setCustomDepartureDelay('')
                    setShowDepartureDelayPicker(false)
                  }}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      departureDelayMinutes === mins && customDepartureDelay === '' && styles.optionButtonTextActive,
                    ]}
                  >
                    {mins === 0 ? '⏱️ Ahora' : `⏳ En ${mins}m`}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Input personalizado */}
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Ej: 18"
                  placeholderTextColor={COLORS.textTertiary}
                  value={customDepartureDelay}
                  onChangeText={(text) => {
                    setCustomDepartureDelay(text)
                    if (text.trim()) {
                      setDepartureDelayMinutes(parseInt(text, 10))
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.customInputLabel}>min</Text>
              </View>
            </View>
          )}

          {/* TRAVEL DURATION SELECTOR */}
          <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={styles.sectionIcon}>
              <Ionicons name="hourglass" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Duración estimada del viaje</Text>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowTravelDurationPicker(!showTravelDurationPicker)}
              disabled={routeLoading}
            >
              <Text style={styles.datePickerText}>
                {getFormattedTravelDuration()}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {showTravelDurationPicker && (
            <View style={styles.optionsPickerContainer}>
              {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((mins) => {
                const formatted = mins < 60 
                  ? `${mins}m` 
                  : `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.optionButton,
                      estimatedTravelMinutes === String(mins) && customTravelDuration === '' && styles.optionButtonActive,
                    ]}
                    onPress={() => {
                      setEstimatedTravelMinutes(String(mins))
                      setCustomTravelDuration('')
                      setShowTravelDurationPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        estimatedTravelMinutes === String(mins) && customTravelDuration === '' && styles.optionButtonTextActive,
                      ]}
                    >
                      {formatted}
                    </Text>
                  </TouchableOpacity>
                )
              })}

              {/* Input personalizado */}
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Ej: 95"
                  placeholderTextColor={COLORS.textTertiary}
                  value={customTravelDuration}
                  onChangeText={(text) => {
                    setCustomTravelDuration(text)
                    if (text.trim()) {
                      setEstimatedTravelMinutes(text)
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.customInputLabel}>min</Text>
              </View>
            </View>
          )}
        </View>

        {/* VEHICLE TYPE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="car" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Tipo de vehículo</Text>
          </View>

          <TouchableOpacity
            style={styles.vehicleTypeSelector}
            onPress={() => setShowVehicleTypePicker(true)}
          >
            <Ionicons name="car-sport" size={20} color={COLORS.primary} />
            <Text style={[styles.vehicleTypeSelectorText, !vehicleTypeId && { color: COLORS.textTertiary }]}>
              {selectedVehicleType ? selectedVehicleType.name : 'Selecciona un tipo'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {vehicleTypeId && (
            <View style={styles.vehicleTypeInfo}>
              <Text style={styles.vehicleTypeInfoText}>
                Capacidad: hasta {maxSeats} pasajeros
              </Text>
            </View>
          )}
        </View>

        {/* SEATS & PRICE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="ticket" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Asientos y tarifa</Text>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="people" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder={vehicleTypeId ? `Ej: ${maxSeats}` : 'Selecciona vehículo'}
                placeholderTextColor={COLORS.textTertiary}
                value={totalSeats}
                onChangeText={handleTotalSeatsChange}
                keyboardType="numeric"
                maxLength={`${maxSeats}`.length}
                editable={!routeLoading && !!vehicleTypeId}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: SPACING.md }]}>
              <Ionicons name="cash" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder="Precio"
                placeholderTextColor={COLORS.textTertiary}
                value={pricePerSeat}
                onChangeText={setPricePerSeat}
                keyboardType="decimal-pad"
                editable={!routeLoading}
              />
            </View>
          </View>

          {totalSeats && pricePerSeat && (
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.summaryLabel}>Asientos disponibles</Text>
                </View>
                <Text style={styles.summaryValue}>{totalSeats}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="trending-up" size={20} color={COLORS.accent} />
                  <Text style={styles.summaryLabel}>Ingreso estimado</Text>
                </View>
                <Text style={[styles.summaryValue, { color: COLORS.accent }]}>
                  ${(parseInt(totalSeats) * parseFloat(pricePerSeat)).toLocaleString('es-CO')}
                </Text>
              </View>
            </View>
          )}
        </View>

          {/* Ruta vía */}
          <View style={styles.inputContainer}>
            <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="¿Por dónde pasa? Ej: Voy derecho por la Autopista (opcional)"
              placeholderTextColor={COLORS.textTertiary}
              value={routeVia}
              onChangeText={setRouteVia}
              maxLength={120}
              editable={!routeLoading}
            />
          </View>

        {/* VEHICLE INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="car" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Datos del vehículo</Text>
          </View>

          {vehicleLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : vehicleData ? (
            <View style={styles.vehicleInfoBox}>
              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Marca</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_make}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Año</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_year}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="layers" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Placa</Text>
                </View>
                <Text style={[styles.vehicleInfoValue, styles.plateBadge]}>{vehicleData.vehicle_plate}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="color-palette" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Color</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_color}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyVehicleBox}>
              <Ionicons name="alert-circle" size={32} color={COLORS.accent} />
              <Text style={styles.emptyVehicleTitle}>Sin información de vehículo</Text>
              <Text style={styles.emptyVehicleText}>
                Completa los datos de tu vehículo en "Mi Vehículo" primero
              </Text>
              <TouchableOpacity
                style={styles.editVehicleButton}
                onPress={() => navigation.navigate('VehicleInfo' as never)}
              >
                <Ionicons name="pencil" size={16} color="white" />
                <Text style={styles.editVehicleButtonText}>Ir a Mi Vehículo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Información importante</Text>
            <Text style={styles.infoText}>
              Tu ruta será visible inmediatamente. Asegúrate de que todos los datos sean correctos.
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.submitBtn, (routeLoading || submittingRoute) && styles.submitBtnDisabled]}
          onPress={handleCreateRoute}
          disabled={routeLoading || submittingRoute}
          activeOpacity={0.8}
        >
          {routeLoading || submittingRoute ? (
            <ActivityIndicator size="small" color={COLORS.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color={COLORS.textInverse} />
              <Text style={styles.submitBtnText}>Publicar Ruta</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={routeLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>

        {/* Vehicle Type Picker Modal */}
        <Modal
          visible={showVehicleTypePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVehicleTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecciona tipo de vehículo</Text>
                <TouchableOpacity onPress={() => setShowVehicleTypePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={VEHICLE_TYPES}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.vehicleTypeOption,
                      vehicleTypeId === item.id && styles.vehicleTypeOptionSelected,
                    ]}
                    onPress={() => {
                      setVehicleTypeId(item.id)
                      setTotalSeats('')
                      setShowVehicleTypePicker(false)
                    }}
                  >
                    <View style={styles.vehicleTypeOptionContent}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={vehicleTypeId === item.id ? COLORS.primary : COLORS.textSecondary}
                      />
                      <View style={styles.vehicleTypeOptionText}>
                        <Text
                          style={[
                            styles.vehicleTypeOptionName,
                            vehicleTypeId === item.id && styles.vehicleTypeOptionNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.vehicleTypeOptionCapacity}>
                          Hasta {item.maxSeats} pasajeros
                        </Text>
                      </View>
                    </View>
                    {vehicleTypeId === item.id && (
                      <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Intro Card
  introCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  introIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  introTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
  },
  introText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverse + '80',
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + 'F8', // 97.3% opacidad
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 52,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99', // Semi-transparente
    ...SHADOWS.md, // Sombra reforzada
    // Luz blanca sutil desde arriba
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    padding: 0,
  },
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
  },

  // Summary Box - estilo premium con dorado
  summaryBox: {
    backgroundColor: COLORS.accentLight + '40', // Dorado con mayor transparencia (25%)
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40', // Borde semi-transparente
    ...SHADOWS.md, // Sombra reforzada
    // Borde superior con color dorado
    borderTopColor: COLORS.accent,
    borderTopWidth: 2.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Info Box
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },

  // Buttons
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.orangeSoft,
    // Sombra profunda adicional
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
    // Bordes blancos para efecto 3D
    borderTopWidth: 2.5,
    borderTopColor: COLORS.shadowWhiteMid,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.shadowWhiteDark,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Vehicle Info Box
  vehicleInfoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  vehicleInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  vehicleInfoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  vehicleInfoValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  plateBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    letterSpacing: 2,
  },
  vehicleInfoDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Empty Vehicle Box
  emptyVehicleBox: {
    backgroundColor: COLORS.accentLight + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
  },
  emptyVehicleTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyVehicleText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  editVehicleButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  editVehicleButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Vehicle Type Selector
  vehicleTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + 'F8',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 52,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99',
    ...SHADOWS.md,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  vehicleTypeSelectorText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  vehicleTypeInfo: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  vehicleTypeInfoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  vehicleTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  vehicleTypeOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  vehicleTypeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  vehicleTypeOptionText: {
    flex: 1,
  },
  vehicleTypeOptionName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  vehicleTypeOptionNameSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  vehicleTypeOptionCapacity: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Date Picker Styles
  datePickerButton: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface + 'F8',
    borderRadius: RADIUS.lg,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99',
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  datePickerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginHorizontal: 0,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  datePickerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dateButton: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  datePickerDisplayText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  datePickerDone: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  datePickerDoneText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },

  // Period Toggle (AM/PM) Styles
  periodToggleContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flex: 1,
    marginLeft: SPACING.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface + 'F8',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight + '99',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  periodTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },

  // Helper Text Styles
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  helperText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },

  // Options Picker Styles (Departure Delay & Travel Duration)
  optionsPickerContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: 0,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  optionButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight + '99',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  optionButtonTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },

  // Custom Input Styles (para personalizar tiempos)
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  customInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    height: 44,
  },
  customInputLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
    minWidth: 30,
  },
})
