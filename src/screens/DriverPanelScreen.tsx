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
} from 'react-native'
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
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
                created_at: b.created_at,
                dropoff_point: b.dropoff_point || route.destination,
                dropoff_point_custom: b.dropoff_point_custom || false,
              }
            })
          }

          return { ...route, passengers }
        })
      )

      setRoutes(routesWithPassengers)
      loadUnreadCounts(routesWithPassengers)

      // Suscribir canales de mensajes para cada ruta nueva
      for (const route of routesWithPassengers) {
        if (!msgChannelsRef.current.has(route.id)) {
          const unsub = subscribeTripMessages(route.id, (msg) => {
            if (msg.to_user_id === user?.id) {
              const key = `${route.id}-${msg.from_user_id}`
              setUnreadCounts((prev) => ({
                ...prev,
                [key]: (prev[key] ?? 0) + 1,
              }))
            }
          })
          msgChannelsRef.current.set(route.id, unsub)
        }
      }
    } catch (err: any) {
      console.error('Error fetching routes:', err)
      Alert.alert('Error', 'No se pudieron cargar tus rutas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, loadUnreadCounts])

  useEffect(() => {
    fetchDriverRoutes()
  }, [fetchDriverRoutes])


  // Polling para actualizar rutas cuando está enfocada
  useFocusEffect(
    useCallback(() => {
      fetchDriverRoutes()

      pollingIntervalRef.current = setInterval(() => {
        fetchDriverRoutes()
      }, 10000)

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        msgChannelsRef.current.forEach((unsub) => unsub())
        msgChannelsRef.current.clear()
      }
    }, [fetchDriverRoutes])
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
              .update({ booking_status: 'cancelled' })
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
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
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
          <Text style={styles.title}>Panel del Conductor</Text>
          <Text style={styles.subtitle}>Gestiona tus viajes</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('DriverRegister' as never)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={COLORS.textInverse} />
        </TouchableOpacity>
      </View>

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

            return (
              <View key={route.id} style={styles.routeCard}>
                {/* Route Header */}
                <View style={styles.routeHeader}>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeRoute}>
                      {route.origin} → {route.destination}
                    </Text>
                    <Text style={styles.routeDateTime}>
                      {formatDate(route.departure_time)} · {formatTime(route.departure_time)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Info */}
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleItem}>
                    <Ionicons name="car" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.vehicleText}>
                      {route.vehicle_make} · {route.vehicle_color}
                    </Text>
                  </View>
                  <View style={styles.vehicleItem}>
                    <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.vehicleText}>{route.vehicle_plate}</Text>
                  </View>
                </View>

                {/* Seats Status */}
                <View style={styles.seatsSection}>
                  <View style={styles.seatsHeader}>
                    <Text style={styles.seatsTitle}>Asientos</Text>
                    <Text style={styles.seatsCount}>
                      {seatsFilled}/{route.total_seats} ocupados
                    </Text>
                  </View>
                  <View style={styles.seatsBar}>
                    {Array.from({ length: route.total_seats }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.seatDot,
                          index < seatsFilled ? styles.seatFilled : styles.seatEmpty,
                        ]}
                      />
                    ))}
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
                  <View style={styles.passengersSection}>
                    <Text style={styles.passengersTitle}>Paradas de desembarque</Text>
                    {groupPassengersByDropoff(route.passengers).map((dropoffGroup, idx) => (
                      <View key={idx} style={styles.dropoffGroupItem}>
                        <View style={styles.dropoffHeader}>
                          <View style={styles.dropoffIconContainer}>
                            <Ionicons
                              name={dropoffGroup.isCustom ? 'flag' : 'pin'}
                              size={16}
                              color={COLORS.primary}
                            />
                          </View>
                          <View style={styles.dropoffInfo}>
                            <Text style={styles.dropoffLocation}>{dropoffGroup.dropoff}</Text>
                            <Text style={styles.dropoffCount}>{dropoffGroup.count} pasajero{dropoffGroup.count !== 1 ? 's' : ''}</Text>
                          </View>
                          {dropoffGroup.isCustom && (
                            <View style={styles.customBadge}>
                              <Text style={styles.customBadgeText}>Custom</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.passengersInGroup}>
                          {dropoffGroup.passengers.map((passenger) => (
                            <View key={passenger.booking_id} style={styles.passengerItem}>
                              <View style={styles.passengerAvatar}>
                                <Text style={styles.passengerInitials}>
                                  {passenger.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.passengerInfo}>
                                <Text style={styles.passengerName}>{passenger.name}</Text>
                                <Text style={styles.passengerSeat}>
                                  Asiento {passenger.seat_number}
                                </Text>
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
                                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
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
                )}

                {/* Earnings */}
                <View style={styles.earningsSection}>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>Ingreso total</Text>
                    <Text style={styles.earningsValue}>
                      ${(seatsFilled * route.price_per_seat).toLocaleString('es-CO')}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>Precio por asiento</Text>
                    <Text style={styles.earningsUnit}>
                      ${route.price_per_seat.toLocaleString('es-CO')}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {route.status === 'scheduled' && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.startBtn]}
                      onPress={() => updateRouteStatus(route.id, 'in_progress')}
                      disabled={isUpdating || seatsFilled === 0}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                      ) : (
                        <>
                          <Ionicons name="play" size={18} color={COLORS.textInverse} />
                          <Text style={styles.actionBtnText}>Iniciar Viaje</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      onPress={() => {
                        Alert.alert(
                          'Cancelar Viaje',
                          '¿Estás seguro de que deseas cancelar este viaje? Se notificará a los pasajeros.',
                          [
                            { text: 'No', style: 'cancel' },
                            {
                              text: 'Sí, cancelar',
                              style: 'destructive',
                              onPress: () => updateRouteStatus(route.id, 'cancelled'),
                            },
                          ]
                        )
                      }}
                      disabled={isUpdating}
                    >
                      <Ionicons name="close" size={18} color={COLORS.error} />
                      <Text style={[styles.actionBtnText, { color: COLORS.error }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {route.status === 'in_progress' && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.completeBtn]}
                      onPress={() => updateRouteStatus(route.id, 'completed')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={18} color={COLORS.textInverse} />
                          <Text style={styles.actionBtnText}>Completar Viaje</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {seatsFilled === 0 && route.status === 'scheduled' && (
                  <View style={styles.noPassengersWarning}>
                    <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                    <Text style={styles.warningText}>
                      Nadie ha reservado aún. Puedes cancelar o esperar pasajeros.
                    </Text>
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

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
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
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
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  routeInfo: {
    flex: 1,
  },
  routeRoute: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  routeDateTime: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.label,
    fontWeight: '600',
  },

  // Vehicle Info
  vehicleInfo: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  vehicleText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
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
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatFilled: {
    backgroundColor: COLORS.primary,
  },
  seatEmpty: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginBottom: SPACING.lg,
  },
  passengersTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  passengerInitials: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  passengerSeat: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  confirmedBadge: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.accentLight + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  earningsValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },
  earningsUnit: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
  },

  // Actions Section
  actionsSection: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 48,
    gap: SPACING.sm,
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.orangeSoft,
  },
  completeBtn: {
    backgroundColor: COLORS.success,
    ...SHADOWS.sm,
  },
  cancelBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Warning
  noPassengersWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  warningText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.warning,
    flex: 1,
  },

  // 📍 Dropoff Groups
  dropoffGroupItem: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    overflow: 'hidden',
  },
  dropoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary + '10',
  },
  dropoffIconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  dropoffInfo: {
    flex: 1,
  },
  dropoffLocation: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dropoffCount: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  customBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  customBadgeText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  passengersInGroup: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
})
