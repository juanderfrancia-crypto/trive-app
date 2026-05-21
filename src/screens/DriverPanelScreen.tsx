import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import { checkDriverApprovalStatus, getDriverRestrictionMessage, type DriverApprovalStatus } from '../services/driverApproval'
import { notifyRouteCancellation } from '../services/pushNotifications'
import { insertNotificationForUser } from '../services/notificationInsert'
import { TripMessagesModal } from '../components/TripMessagesModal'
import { getTripUnreadCountFrom, subscribeTripMessages } from '../services/trip_messages'

interface Passenger {
  booking_id: string
  passenger_id: string
  payment_method?: string
  name: string
  email: string
  phone: string
  seat_number: number
  booking_status: string
  created_at: string
  dropoff_point?: string
  dropoff_point_custom?: boolean
}

interface DriverRoute {
  id: string
  origin: string
  destination: string
  departure_time: string
  arrival_time: string
  price_per_seat: number
  total_seats: number
  available_seats: number
  vehicle_make: string
  vehicle_plate: string
  vehicle_color: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  passengers?: Passenger[]
}

export default function DriverPanelScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const user = useAppStore(s => s.user)
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingRouteId, setUpdatingRouteId] = useState<string | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<DriverApprovalStatus | null>(null)
  const [checkingApproval, setCheckingApproval] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)
  const failureCountRef = useRef(0)
  const [selectedChat, setSelectedChat] = useState<{
    tripId: string
    otherUserId: string
    otherUserName: string
  } | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const msgChannelsRef = useRef<Map<string, () => void>>(new Map())

  const loadUnreadCounts = useCallback(async (loadedRoutes: DriverRoute[]) => {
    if (!user?.id) return
    const counts: Record<string, number> = {}
    for (const route of loadedRoutes) {
      for (const p of route.passengers || []) {
        const key = `${route.id}-${p.passenger_id}`
        counts[key] = await getTripUnreadCountFrom(route.id, user.id, p.passenger_id)
      }
    }
    setUnreadCounts(counts)
  }, [user?.id])

  const fetchDriverRoutes = useCallback(async () => {
    if (!user?.id) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('departure_time', { ascending: true })

      if (error) throw error

      const routesWithPassengers = await Promise.all(
        (data || []).map(async (route) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              passenger_id,
              seat_number,
              booking_status,
              payment_method,
              created_at,
              dropoff_point,
              dropoff_point_custom
            `)
            .eq('route_id', route.id)
            .in('booking_status', ['confirmed', 'completed'])
            .order('seat_number', { ascending: true })

          if (bookingsError) {
            console.error('Error loading bookings for route', route.id, ':', bookingsError)
            return { ...route, passengers: [] }
          }

          // Obtener información de perfiles para pasajeros si hay bookings
          let passengers: Passenger[] = []
          if (bookings && bookings.length > 0) {
            const passengerIds = bookings.map((b: any) => b.passenger_id)
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name, email, phone')
              .in('id', passengerIds)

            const profileMap = new Map(
              (profiles || []).map((p: any) => [p.id, p])
            )

            passengers = bookings.map((b: any) => {
              const profile = profileMap.get(b.passenger_id)
              return {
                booking_id: b.id,
                passenger_id: b.passenger_id,
                name: profile?.name || `Pasajero ${b.seat_number}`,
                email: profile?.email || '',
                phone: profile?.phone || '',
                seat_number: b.seat_number,
                booking_status: b.booking_status,
                payment_method: b.payment_method || 'cash',
                created_at: b.created_at,
                dropoff_point: b.dropoff_point || route.destination,
                dropoff_point_custom: b.dropoff_point_custom || false,
              }
            })
          }

          return { ...route, passengers }
        })
      )

      failureCountRef.current = 0
      setRoutes(routesWithPassengers)
      loadUnreadCounts(routesWithPassengers)

      // Suscribir canales de mensajes para cada ruta nueva
      for (const route of routesWithPassengers) {
        if (!msgChannelsRef.current.has(route.id)) {
          const unsub = subscribeTripMessages(route.id, user!.id, null, (msg) => {
            const key = `${route.id}-${msg.from_user_id}`
            setUnreadCounts((prev) => ({
              ...prev,
              [key]: (prev[key] ?? 0) + 1,
            }))
          })
          msgChannelsRef.current.set(route.id, unsub)
        }
      }
    } catch (err: any) {
      failureCountRef.current += 1
      if (__DEV__) console.error('Error fetching routes:', err)
    } finally {
      isFetchingRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, loadUnreadCounts])

  useEffect(() => {
    fetchDriverRoutes()
  }, [fetchDriverRoutes])


  // Realtime: detecta nuevas reservas y cambios de estado en tiempo real
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return
      failureCountRef.current = 0
      fetchDriverRoutes()

      // Suscripción 1: cambios en rutas del conductor (cancelaciones, estado)
      const routesChannel = supabase
        .channel(`driver-routes:${user.id}:${Date.now()}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'routes', filter: `driver_id=eq.${user.id}` },
          () => { fetchDriverRoutes() }
        )
        .subscribe()

      // Suscripción 2: nuevas reservas o cambios en bookings
      // No se puede filtrar por driver_id directamente en bookings, se verifica en el callback
      const bookingsChannel = supabase
        .channel(`driver-bookings:${user.id}:${Date.now()}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => { fetchDriverRoutes() }
        )
        .subscribe()

      // Polling de respaldo cada 60s (por si Realtime falla)
      const scheduleNext = () => {
        pollingIntervalRef.current = setTimeout(() => {
          fetchDriverRoutes()
          scheduleNext()
        }, 60000)
      }
      scheduleNext()

      return () => {
        if (pollingIntervalRef.current) {
          clearTimeout(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        supabase.removeChannel(routesChannel)
        supabase.removeChannel(bookingsChannel)
        msgChannelsRef.current.forEach((unsub) => unsub())
        msgChannelsRef.current.clear()
      }
    }, [fetchDriverRoutes, user?.id])
  )

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!user?.id) {
        setCheckingApproval(false)
        return
      }

      const status = await checkDriverApprovalStatus(user.id)
      setApprovalStatus(status)
      setCheckingApproval(false)
    }

    checkApprovalStatus()
  }, [user?.id])

  const notifyPassengers = async (route: DriverRoute) => {
    if (!route.passengers?.length) return

    try {
      await Promise.all(
        route.passengers.map((passenger) =>
          insertNotificationForUser(passenger.passenger_id, {
            user_id: passenger.passenger_id,
            type: 'trip_update',
            title: 'Tu viaje ha iniciado',
            message: `El viaje ${route.origin} → ${route.destination} ya comenzó. Tu asiento está confirmado.`,
            data: { route_id: route.id, audience: 'passengers_only' },
            is_read: false,
          })
        )
      )
    } catch (err: any) {
      console.error('Error notificando a los pasajeros:', err)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDriverRoutes()
  }

  const updateRouteStatus = async (routeId: string, newStatus: string) => {
    try {
      setUpdatingRouteId(routeId)
      
      const { error } = await supabase
        .from('routes')
        .update({ status: newStatus })
        .eq('id', routeId)

      if (error) throw error

      // Actualizar estado local inmediatamente para que no desaparezcan los pasajeros
      setRoutes((prevRoutes) =>
        prevRoutes.map((route) =>
          route.id === routeId ? { ...route, status: newStatus as any } : route
        )
      )

      if (newStatus === 'in_progress') {
        const route = routes.find((routeItem) => routeItem.id === routeId)
        if (route) {
          await notifyPassengers(route)
        }
      }

      if (newStatus === 'completed') {
        const route = routes.find((routeItem) => routeItem.id === routeId)
        if (route?.passengers?.length) {
          // Marcar bookings como completados para que "Gastado este mes" los contabilice
          const bookingIds = route.passengers.map((p) => p.booking_id)
          await supabase
            .from('bookings')
            .update({ booking_status: 'completed', payment_status: 'completed' })
            .in('id', bookingIds)

          await Promise.all(
            route.passengers.flatMap((passenger) => [
              insertNotificationForUser(passenger.passenger_id, {
                user_id: passenger.passenger_id,
                type: 'trip_completed',
                title: 'Viaje completado',
                message: `El viaje ${route.origin} → ${route.destination} ha finalizado. ¡Gracias por viajar con Trive!`,
                data: {
                  route_id: route.id,
                  booking_id: passenger.booking_id,
                  driver_id: user?.id,
                  driver_name: user?.name,
                  origin: route.origin,
                  destination: route.destination,
                  audience: 'passengers_only',
                },
                is_read: false,
              }),
              insertNotificationForUser(passenger.passenger_id, {
                user_id: passenger.passenger_id,
                type: 'review_pending',
                title: '¿Cómo estuvo tu viaje?',
                message: `Califica a ${user?.name || 'tu conductor'} en el viaje ${route.origin} → ${route.destination}`,
                data: {
                  route_id: route.id,
                  booking_id: passenger.booking_id,
                  driver_id: user?.id,
                  driver_name: user?.name,
                  origin: route.origin,
                  destination: route.destination,
                  audience: 'passengers_only',
                },
                is_read: false,
              }),
            ])
          ).catch((err) => console.error('Error notificando fin de viaje:', err))
        }
      }

      if (newStatus === 'cancelled') {
        const route = routes.find((routeItem) => routeItem.id === routeId)
        if (route && user?.id) {
          // Obtener bookings confirmados o pendientes para esta ruta
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, passenger_id')
            .eq('route_id', routeId)
            .in('booking_status', ['confirmed', 'pending'])

          // Cancelar los bookings de los pasajeros
          if (bookings && bookings.length > 0) {
            const bookingIds = bookings.map((b: any) => b.id)
            await supabase
              .from('bookings')
              .update({ booking_status: 'cancelled', payment_status: 'refunded' })
              .in('id', bookingIds)
          }

          // Obtener push tokens de los pasajeros
          const passengers: Array<{ passenger_id: string; push_token?: string }> = []
          if (bookings && bookings.length > 0) {
            const passengerIds = bookings.map((b: any) => b.passenger_id)

            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, push_token')
              .in('id', passengerIds)

            const profileMap = new Map(
              (profiles || []).map((p: any) => [p.id, p])
            )

            passengerIds.forEach((passengerId: string) => {
              const profile = profileMap.get(passengerId)
              passengers.push({ passenger_id: passengerId, push_token: profile?.push_token })
            })
          }

          // Notificación in-app al conductor
          insertNotificationForUser(user.id, {
            user_id: user.id,
            type: 'trip_update',
            title: 'Ruta cancelada',
            message: `Tu ruta ${route.origin} → ${route.destination} ha sido cancelada.`,
            data: { route_id: routeId },
            is_read: false,
          }).catch((err) => console.error('Error notif conductor:', err))

          // Notificación in-app a cada pasajero (sin audience filter para garantizar entrega)
          if (bookings && bookings.length > 0) {
            await Promise.all(
              bookings.map((b: any) =>
                insertNotificationForUser(b.passenger_id, {
                  user_id: b.passenger_id,
                  type: 'trip_update',
                  title: 'Viaje cancelado',
                  message: `El conductor canceló el viaje ${route.origin} → ${route.destination}. Tu reserva fue liberada.`,
                  data: { route_id: routeId },
                  is_read: false,
                }).catch((err) => console.error(`Error notif pasajero ${b.passenger_id}:`, err))
              )
            )
          }

          // Push notifications
          notifyRouteCancellation(
            routeId,
            user.id,
            user.name || 'Conductor',
            passengers,
            {
              origin: route.origin,
              destination: route.destination,
              departureTime: route.departure_time,
            }
          ).catch((err) => {
            console.warn('Error push route cancellation:', err)
          })
        }
      }

      Alert.alert(
        'Éxito',
        newStatus === 'in_progress'
          ? '¡Viaje iniciado! Los pasajeros han sido notificados.'
          : newStatus === 'completed'
          ? 'Viaje completado. ¡Buen trabajo!'
          : 'Viaje cancelado.'
      )

      // Refetch en background para sincronizar
      setTimeout(() => {
        fetchDriverRoutes()
      }, 1000)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el estado')
    } finally {
      setUpdatingRouteId(null)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }

  const shareRoute = async (route: DriverRoute) => {
    const date = formatDate(route.departure_time)
    const time = formatTime(route.departure_time)
    const seats = route.available_seats
    const price = route.price_per_seat.toLocaleString('es-CO')
    const message =
      `🚗 *Viaje disponible — Trive*\n\n` +
      `📍 ${route.origin} → ${route.destination}\n` +
      `🗓 ${date}  🕐 ${time}\n` +
      `💺 ${seats} cupo${seats !== 1 ? 's' : ''} disponible${seats !== 1 ? 's' : ''}\n` +
      `💵 $${price} por persona\n` +
      `🚘 ${route.vehicle_color} · ${route.vehicle_make} · ${route.vehicle_plate}\n\n` +
      `Reserva tu cupo en la app *Trive* 👇`
    try {
      await Share.share({ message })
    } catch (_e) {}
  }

  const handleCreateRoute = () => {
    if (!approvalStatus) {
      Alert.alert('Error', 'Verificando estado de aprobación...')
      return
    }

    if (!approvalStatus.canCreateRoutes) {
      const message = getDriverRestrictionMessage(approvalStatus)
      Alert.alert('No puedes crear rutas', message, [
        {
          text: 'Ver documentos',
          onPress: () => navigation.navigate('DriverDocuments' as never),
        },
        { text: 'Cerrar', style: 'cancel' },
      ])
      return
    }

    navigation.navigate('DriverRegister' as never)
  }

  const getSeatsFilled = (route: DriverRoute) => {
    // Contar directamente los pasajeros confirmados en lugar de confiar en available_seats
    return route.passengers ? route.passengers.length : 0
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { label: 'Programado', color: COLORS.info, icon: 'time-outline' }
      case 'in_progress':
        return { label: 'En curso', color: COLORS.warning, icon: 'car-outline' }
      case 'completed':
        return { label: 'Completado', color: COLORS.success, icon: 'checkmark-circle-outline' }
      case 'cancelled':
        return { label: 'Cancelado', color: COLORS.error, icon: 'close-circle-outline' }
      default:
        return { label: status, color: COLORS.textSecondary, icon: 'help-circle-outline' }
    }
  }

  // 📍 Agrupar pasajeros por parada de desembarque
  const groupPassengersByDropoff = (passengers: Passenger[]) => {
    const grouped: { [key: string]: { passengers: Passenger[]; count: number; isCustom: boolean } } = {}

    passengers.forEach((passenger) => {
      const dropoff = passenger.dropoff_point || 'Destino final'
      if (!grouped[dropoff]) {
        grouped[dropoff] = {
          passengers: [],
          count: 0,
          isCustom: passenger.dropoff_point_custom || false,
        }
      }
      grouped[dropoff].passengers.push(passenger)
      grouped[dropoff].count += 1
    })

    return Object.entries(grouped)
      .map(([dropoff, data]) => ({
        dropoff,
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
  }

  if (loading) {
    return (
      <View style={[styles.safeContainer, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tus rutas...</Text>
      </View>
    )
  }

  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* Header */}
      <LinearGradient
        colors={['#0E2699', '#1230B8', '#1A3FCC']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Panel del Conductor</Text>
          <Text style={styles.subtitle}>
            {routes.length > 0
              ? `${routes.length} viaje${routes.length !== 1 ? 's' : ''} activo${routes.length !== 1 ? 's' : ''}`
              : 'Sin viajes activos'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.recurringBtn}
          onPress={() => navigation.navigate('RecurringRoutes' as never)}
          activeOpacity={0.8}
        >
          <Ionicons name="repeat" size={20} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddMenu(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={48} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No tienes viajes activos</Text>
            <Text style={styles.emptyText}>
              Crea una ruta para empezar a recibir pasajeros
            </Text>
            {checkingApproval ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.createRouteBtn,
                    !approvalStatus?.canCreateRoutes && styles.createRouteBtnDisabled,
                  ]}
                  onPress={handleCreateRoute}
                  disabled={!approvalStatus?.canCreateRoutes}
                >
                  <Ionicons name="add-circle-outline" size={20} color={!approvalStatus?.canCreateRoutes ? COLORS.textTertiary : COLORS.textInverse} />
                  <Text style={[styles.createRouteBtnText, !approvalStatus?.canCreateRoutes && styles.createRouteBtnTextDisabled]}>
                    Crear nueva ruta
                  </Text>
                </TouchableOpacity>
                {!approvalStatus?.canCreateRoutes && approvalStatus && (
                  <Text style={styles.documentsPendingText}>
                    {approvalStatus.pendingDocuments.length > 0
                      ? `Doctos. pendientes: ${approvalStatus.pendingDocuments.join(', ')}`
                      : 'Verifica tu estado'}
                  </Text>
                )}
              </>
            )}
          </View>
        ) : (
          routes.map((route) => {
            const seatsFilled = getSeatsFilled(route)
            const isFull = route.available_seats === 0
            const statusInfo = getStatusInfo(route.status)
            const isUpdating = updatingRouteId === route.id

            const isInProgress = route.status === 'in_progress'

            return (
              <View key={route.id} style={[styles.routeCard, isInProgress && styles.routeCardActive]}>

                {/* Banner EN CURSO */}
                {isInProgress && (
                  <View style={styles.inProgressBanner}>
                    <View style={styles.liveDot}>
                      <View style={styles.liveDotInner} />
                    </View>
                    <Text style={styles.inProgressLabel}>VIAJE EN CURSO</Text>
                    <Text style={styles.inProgressTime}>Salida {formatTime(route.departure_time)}</Text>
                  </View>
                )}

                {/* Route Header */}
                <View style={styles.routeHeader}>
                  <View style={styles.routeTrackWrap}>
                    <View style={styles.routeTrackDot} />
                    <View style={styles.routeTrackLine} />
                    <View style={[styles.routeTrackDot, styles.routeTrackDotEnd]} />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.originText} numberOfLines={1}>{route.origin}</Text>
                    <Text style={styles.destText} numberOfLines={1}>{route.destination}</Text>
                    <Text style={styles.routeDateTime}>
                      {formatDate(route.departure_time)} · {formatTime(route.departure_time)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon as any} size={13} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Info */}
                <View style={styles.vehicleRow}>
                  {route.vehicle_make ? (
                    <View style={styles.vehiclePill}>
                      <Ionicons name="car-sport" size={12} color={COLORS.primary} />
                      <Text style={styles.vehiclePillText}>{route.vehicle_make}</Text>
                    </View>
                  ) : null}
                  {route.vehicle_color ? (
                    <View style={styles.vehiclePill}>
                      <Ionicons name="color-palette-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.vehiclePillText}>{route.vehicle_color}</Text>
                    </View>
                  ) : null}
                  {route.vehicle_plate ? (
                    <View style={[styles.vehiclePill, styles.vehiclePlatePill]}>
                      <Ionicons name="card-outline" size={12} color="#0E2699" />
                      <Text style={styles.vehiclePlateText}>{route.vehicle_plate}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.sectionDivider} />

                {/* Seats Status */}
                <View style={styles.seatsSection}>
                  <View style={styles.seatsHeader}>
                    <Text style={styles.seatsTitle}>Asientos</Text>
                    <Text style={styles.seatsCount}>
                      {seatsFilled}/{route.total_seats} ocupados
                    </Text>
                  </View>
                  <View style={styles.seatsBar}>
                    {Array.from({ length: Math.min(route.total_seats, 10) }).map((_, index) => (
                      <View
                        key={index}
                        style={[styles.seatDot, index < seatsFilled ? styles.seatFilled : styles.seatEmpty]}
                      >
                        <Ionicons
                          name={index < seatsFilled ? 'person' : 'person-outline'}
                          size={13}
                          color={index < seatsFilled ? '#fff' : COLORS.textTertiary}
                        />
                      </View>
                    ))}
                    {route.total_seats > 10 && (
                      <View style={styles.seatsMore}>
                        <Text style={styles.seatsMoreText}>+{route.total_seats - 10}</Text>
                      </View>
                    )}
                  </View>
                  {isFull && (
                    <View style={styles.fullBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={styles.fullText}>Cupo lleno</Text>
                    </View>
                  )}
                </View>

                {/* Passengers List - Grouped by Dropoff Point */}
                {route.passengers && route.passengers.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.passengersSection}>
                      <View style={styles.sectionTitleRow}>
                        <Ionicons name="people" size={14} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Pasajeros</Text>
                        <View style={styles.passengerCountPill}>
                          <Text style={styles.passengerCountText}>{route.passengers.length}</Text>
                        </View>
                      </View>
                      {groupPassengersByDropoff(route.passengers).map((dropoffGroup, idx) => (
                        <View key={idx} style={styles.dropoffGroupItem}>
                          <View style={styles.dropoffHeader}>
                            <View style={styles.dropoffIconContainer}>
                              <Ionicons
                                name={dropoffGroup.isCustom ? 'flag' : 'location'}
                                size={14}
                                color={COLORS.primary}
                              />
                            </View>
                            <View style={styles.dropoffInfo}>
                              <Text style={styles.dropoffLocation} numberOfLines={1}>{dropoffGroup.dropoff}</Text>
                              <Text style={styles.dropoffCount}>{dropoffGroup.count} pasajero{dropoffGroup.count !== 1 ? 's' : ''}</Text>
                            </View>
                            {dropoffGroup.isCustom && (
                              <View style={styles.customBadge}>
                                <Text style={styles.customBadgeText}>Personalizada</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.passengersInGroup}>
                            {dropoffGroup.passengers.map((passenger, pIdx) => (
                              <View
                                key={passenger.booking_id}
                                style={[styles.passengerItem, pIdx < dropoffGroup.passengers.length - 1 && styles.passengerItemBorder]}
                              >
                                <LinearGradient
                                  colors={['#0E2699', '#1230B8']}
                                  style={styles.passengerAvatar}
                                >
                                  <Text style={styles.passengerInitials}>
                                    {passenger.name.charAt(0).toUpperCase()}
                                  </Text>
                                </LinearGradient>
                                <View style={styles.passengerInfo}>
                                  <Text style={styles.passengerName}>{passenger.name}</Text>
                                  <View style={styles.passengerMeta}>
                                    <View style={styles.seatPill}>
                                      <Ionicons name="person-outline" size={10} color={COLORS.textTertiary} />
                                      <Text style={styles.seatPillText}>Asiento {passenger.seat_number}</Text>
                                    </View>
                                    <View style={[
                                      styles.paymentPill,
                                      passenger.payment_method === 'digital' ? styles.paymentPillDigital : styles.paymentPillCash,
                                    ]}>
                                      <Ionicons
                                        name={passenger.payment_method === 'digital' ? 'phone-portrait-outline' : 'cash-outline'}
                                        size={10}
                                        color={passenger.payment_method === 'digital' ? '#6C1FC6' : '#16A34A'}
                                      />
                                      <Text style={[
                                        styles.paymentPillText,
                                        { color: passenger.payment_method === 'digital' ? '#6C1FC6' : '#16A34A' },
                                      ]}>
                                        {passenger.payment_method === 'digital' ? 'Digital' : 'Efectivo'}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                <TouchableOpacity
                                  style={styles.chatBtn}
                                  onPress={() => {
                                    const key = `${route.id}-${passenger.passenger_id}`
                                    setUnreadCounts((prev) => ({ ...prev, [key]: 0 }))
                                    setSelectedChat({
                                      tripId: route.id,
                                      otherUserId: passenger.passenger_id,
                                      otherUserName: passenger.name,
                                    })
                                  }}
                                >
                                  <Ionicons name="chatbubble-ellipses" size={17} color={COLORS.primary} />
                                  {(unreadCounts[`${route.id}-${passenger.passenger_id}`] ?? 0) > 0 && (
                                    <View style={styles.chatBadge}>
                                      <Text style={styles.chatBadgeText}>
                                        {unreadCounts[`${route.id}-${passenger.passenger_id}`] > 9
                                          ? '9+'
                                          : unreadCounts[`${route.id}-${passenger.passenger_id}`]}
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Earnings */}
                <View style={styles.sectionDivider} />
                <View style={styles.earningsSection}>
                  <View style={styles.earningsLeft}>
                    <View style={styles.earningsIconWrap}>
                      <Ionicons name="wallet" size={16} color="#059669" />
                    </View>
                    <View>
                      <Text style={styles.earningsLabel}>Ingresos estimados</Text>
                      <Text style={styles.earningsDetail}>
                        {seatsFilled} asiento{seatsFilled !== 1 ? 's' : ''} × ${route.price_per_seat.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.earningsValue}>
                    ${(seatsFilled * route.price_per_seat).toLocaleString('es-CO')}
                  </Text>
                </View>

                {/* Warning sin pasajeros */}
                {seatsFilled === 0 && route.status === 'scheduled' && (
                  <View style={styles.noPassengersWarning}>
                    <View style={styles.warningIconWrap}>
                      <Ionicons name="megaphone-outline" size={16} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warningTitle}>Sin pasajeros aún</Text>
                      <Text style={styles.warningText}>Comparte tu ruta para conseguir pasajeros más rápido.</Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                {route.status === 'scheduled' && (
                  <View style={styles.actionsSection}>
                    {/* CTA principal */}
                    <TouchableOpacity
                      style={[(isUpdating || seatsFilled === 0) && styles.primaryBtnDisabled]}
                      onPress={() => updateRouteStatus(route.id, 'in_progress')}
                      disabled={isUpdating || seatsFilled === 0}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#0E2699', '#1230B8', '#1A3FCC']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.primaryActionBtn}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="play-circle" size={20} color="#fff" />
                            <Text style={styles.primaryActionText}>Iniciar Viaje</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Acciones secundarias */}
                    <View style={styles.secondaryActionsRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => shareRoute(route)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                        <Text style={[styles.secondaryActionText, { color: '#25D366' }]}>Compartir ruta</Text>
                      </TouchableOpacity>

                      <View style={styles.secondaryActionSep} />

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => Alert.alert(
                          'Cancelar viaje',
                          '¿Cancelar este viaje? Se notificará a los pasajeros.',
                          [
                            { text: 'No', style: 'cancel' },
                            { text: 'Sí, cancelar', style: 'destructive', onPress: () => updateRouteStatus(route.id, 'cancelled') },
                          ]
                        )}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={15} color={COLORS.error} />
                        <Text style={[styles.secondaryActionText, { color: COLORS.error }]}>Cancelar viaje</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {route.status === 'in_progress' && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity
                      style={[isUpdating && styles.primaryBtnDisabled]}
                      onPress={() => updateRouteStatus(route.id, 'completed')}
                      disabled={isUpdating}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#059669', '#10B981']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.primaryActionBtn}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                            <Text style={styles.primaryActionText}>Completar Viaje</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* ── Add menu overlay (sin Modal) ── */}
      {showAddMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowAddMenu(false)}
          />
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>¿Qué quieres hacer?</Text>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddMenu(false)
                setTimeout(() => handleCreateRoute(), 150)
              }}
            >
              <LinearGradient colors={['#0E2699', '#1A3FCC']} style={styles.menuItemIcon}>
                <Ionicons name="add-circle" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Crear ruta</Text>
                <Text style={styles.menuItemSub}>Publica un viaje nuevo ahora</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddMenu(false)
                setTimeout(() => navigation.navigate('RecurringRoutes' as never), 150)
              }}
            >
              <LinearGradient colors={['#6C1FC6', '#8B5CF6']} style={styles.menuItemIcon}>
                <Ionicons name="repeat" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Plantillas de ruta</Text>
                <Text style={styles.menuItemSub}>Publica tus rutas habituales rápido</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedChat && user?.id && (
        <TripMessagesModal
          visible={!!selectedChat}
          tripId={selectedChat.tripId}
          userId={user.id}
          otherUserId={selectedChat.otherUserId}
          otherUserName={selectedChat.otherUserName}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  recurringBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  createRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.orangeSoft,
  },
  createRouteBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  createRouteBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    opacity: 0.6,
  },
  createRouteBtnTextDisabled: {
    color: COLORS.textTertiary,
  },
  documentsPendingText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.warning,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // Route Card
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E8EDFF',
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  routeCardActive: {
    borderColor: '#10B981',
    borderLeftWidth: 4,
    backgroundColor: '#F7FFFE',
    shadowColor: '#10B981',
    shadowOpacity: 0.12,
    elevation: 4,
  },
  inProgressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10B981',
    marginHorizontal: -SPACING.lg,
    marginTop: -SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 9,
  },
  liveDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  liveDotInner: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#fff',
  },
  inProgressLabel: {
    flex: 1, fontSize: 11, fontWeight: '800',
    color: '#fff', letterSpacing: 1.2,
  },
  inProgressTime: {
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 10,
  },
  routeTrackWrap: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
    flexShrink: 0,
  },
  routeTrackDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: '#fff',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
  },
  routeTrackLine: {
    width: 1.5, height: 12, backgroundColor: '#CBD5E1',
  },
  routeTrackDotEnd: {
    backgroundColor: '#fff',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  routeInfo: {
    flex: 1,
    gap: 2,
  },
  originText: {
    fontSize: 15, fontWeight: '800', color: '#0E1C4E', letterSpacing: -0.3,
  },
  destText: {
    fontSize: 14, fontWeight: '600', color: '#334155',
  },
  routeDateTime: {
    fontSize: 12, color: COLORS.textTertiary, fontWeight: '500', marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.2,
  },

  // Vehicle Info
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  vehiclePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: '#D6E0FF',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  vehiclePillText: {
    fontSize: 12, fontWeight: '500', color: '#334155',
  },
  vehiclePlatePill: {
    backgroundColor: '#EEF2FF', borderColor: '#C7D2FE',
  },
  vehiclePlateText: {
    fontSize: 12, fontWeight: '700', color: '#0E2699', letterSpacing: 0.5,
  },

  sectionDivider: {
    height: 1, backgroundColor: '#F1F5F9', marginVertical: SPACING.md,
  },

  // Seats Section
  seatsSection: {
    marginBottom: SPACING.lg,
  },
  seatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  seatsTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  seatsCount: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  seatsBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  seatDot: {
    width: 30, height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatFilled: {
    backgroundColor: COLORS.primary,
  },
  seatEmpty: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D6E0FF',
  },
  seatsMore: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: '#D6E0FF',
    justifyContent: 'center', alignItems: 'center',
  },
  seatsMoreText: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary,
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  fullText: {
    ...TYPOGRAPHY.label,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Passengers Section
  passengersSection: {
    marginBottom: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1,
  },
  passengerCountPill: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  passengerCountText: {
    fontSize: 11, fontWeight: '700', color: '#fff',
  },
  passengerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
  },
  passengerItemBorder: {
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  passengerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md, flexShrink: 0,
  },
  passengerInitials: {
    fontSize: 15, fontWeight: '800', color: '#fff',
  },
  passengerInfo: {
    flex: 1, gap: 4,
  },
  passengerName: {
    fontSize: 13, fontWeight: '700', color: '#0E1C4E',
  },
  passengerMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  seatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F4F6FF', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  seatPillText: {
    fontSize: 11, color: COLORS.textSecondary, fontWeight: '500',
  },
  paymentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2,
  },
  paymentPillDigital: { backgroundColor: '#EDE9FE' },
  paymentPillCash:    { backgroundColor: '#F0FDF4' },
  paymentPillText: {
    fontSize: 11, fontWeight: '600',
  },
  confirmedBadge: {
    width: 24, height: 24, borderRadius: RADIUS.full,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },

  // Earnings Section
  earningsSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  earningsLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  earningsIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12, fontWeight: '600', color: '#166534',
  },
  earningsDetail: {
    fontSize: 11, color: '#4ADE80', fontWeight: '500', marginTop: 2,
  },
  earningsValue: {
    fontSize: 20, fontWeight: '800', color: '#16A34A', letterSpacing: -0.5,
  },

  // Actions Section
  actionsSection: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: RADIUS.md, paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryActionsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FF', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E8EDFF',
    overflow: 'hidden',
  },
  secondaryActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  secondaryActionSep: {
    width: 1, height: 20, backgroundColor: '#E8EDFF',
  },
  secondaryActionText: {
    fontSize: 13, fontWeight: '600',
  },

  // Add menu
  menuOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
    zIndex: 999,
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingBottom: 36, paddingTop: 10,
  },
  menuHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D6E0FF', alignSelf: 'center', marginBottom: 16,
  },
  menuTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.textTertiary,
    letterSpacing: 0.3, marginBottom: SPACING.md, textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
  },
  menuItemIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  menuItemText: { flex: 1 },
  menuItemTitle: {
    fontSize: 15, fontWeight: '700', color: '#0E1C4E',
  },
  menuItemSub: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2,
  },
  menuDivider: {
    height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 58,
  },

  // Warning
  noPassengersWarning: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warningIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  warningTitle: {
    fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 2,
  },
  warningText: {
    fontSize: 12, color: '#B45309', lineHeight: 16,
  },

  // Dropoff Groups
  dropoffGroupItem: {
    backgroundColor: '#FAFBFF',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E8EDFF',
    overflow: 'hidden',
  },
  dropoffHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    gap: 8,
  },
  dropoffIconContainer: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  dropoffInfo: { flex: 1 },
  dropoffLocation: {
    fontSize: 13, fontWeight: '700', color: '#0E1C4E',
  },
  dropoffCount: {
    fontSize: 11, color: COLORS.textSecondary, marginTop: 1,
  },
  customBadge: {
    backgroundColor: '#EDE9FE', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  customBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#6C1FC6',
  },
  passengersInGroup: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
})
