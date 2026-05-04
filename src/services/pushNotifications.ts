import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { supabase } from './supabase'

const isPushNotificationsAvailable = Platform.OS === 'ios' || Platform.OS === 'android'

let Notifications: any = null
try {
  Notifications = require('expo-notifications')
} catch (_e) {
  // expo-notifications not available on this platform
}

export const configureNotificationHandler = () => {
  if (!isPushNotificationsAvailable || !Notifications) return

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch (_e) {}
}

export const getPushNotificationToken = async (): Promise<string | null> => {
  try {
    if (!isPushNotificationsAvailable || !Notifications) return null

    if (!Device.isDevice) {
      if (Platform.OS !== 'android') return null
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e96c93aa-7f2b-45e1-bdf0-d60e07577512',
    })
    const token = pushTokenData.data

    return token
  } catch (_e) {
    return null
  }
}

export const registerPushToken = async (userId: string, token: string) => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser || authUser.id !== userId) return

    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (fetchError) throw fetchError

    if (user?.push_token !== token) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId)

      if (updateError) throw updateError
    }
  } catch (_e) {
    // silent fail — token registration is non-critical
  }
}

export const saveNotificationPreferences = async (preferences: {
  push: boolean
  email: boolean
  sms: boolean
}) => {
  try {
    await AsyncStorage.setItem(
      'notification_preferences',
      JSON.stringify(preferences)
    )
  } catch (_e) {}
}

export const loadNotificationPreferences = async () => {
  try {
    const preferences = await AsyncStorage.getItem('notification_preferences')
    if (preferences) return JSON.parse(preferences)
    return { push: true, email: true, sms: false }
  } catch (_e) {
    return { push: true, email: true, sms: false }
  }
}

export const setupNotificationListeners = (
  onNotificationReceived?: (notification: any) => void
) => {
  if (!isPushNotificationsAvailable || !Notifications) return () => {}

  try {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        if (onNotificationReceived) onNotificationReceived(notification)
      }
    )

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((_response: any) => {})

    return () => {
      notificationListener?.remove()
      responseListener?.remove()
    }
  } catch (_e) {
    return () => {}
  }
}

export const sendTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Hola, Trive!',
        body: 'Esta es una notificación de prueba',
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    })
  } catch (_e) {}
}

export const sendPushNotificationToUser = async (
  recipientToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    const message = {
      to: recipientToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      priority: 'high',
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    return response.ok && result?.data?.status !== 'error'
  } catch (_e) {
    return false
  }
}

export const notifyTripCancellation = async (
  bookingId: string,
  cancellerUserId: string,
  cancelReason?: string
) => {
  try {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `id, passenger_id,
        routes(id, driver_id, origin, destination, departure_time, profiles(id, name, push_token)),
        passenger:passenger_id(id, name, push_token)`
      )
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) return false

    const route = (booking.routes as any)?.[0]
    const driver = ((route?.profiles as any) || [])[0] as any
    const passenger = booking.passenger

    if (!route || !driver || !passenger) return false

    const isPassengerCancelling = cancellerUserId === booking.passenger_id
    // @ts-ignore
    const recipientToken = isPassengerCancelling ? driver?.push_token : passenger?.push_token
    // @ts-ignore
    const cancellerName = isPassengerCancelling ? passenger?.name : driver?.name

    if (!recipientToken) return false

    const notificationTitle = isPassengerCancelling
      ? '❌ Pasajero canceló el viaje'
      : '❌ Conductor canceló el viaje'

    const routeInfo = `${route.origin} → ${route.destination}`
    const reasonText = cancelReason ? ` (${cancelReason})` : ''
    const notificationBody = `De ${cancellerName}: ${routeInfo}${reasonText}`

    return await sendPushNotificationToUser(recipientToken, notificationTitle, notificationBody, {
      type: 'trip_cancelled',
      booking_id: bookingId,
      route_id: route.id,
      origin: route.origin,
      destination: route.destination,
      canceller_id: cancellerUserId,
      canceller_name: cancellerName,
      reason: cancelReason || 'Sin especificar',
    })
  } catch (_e) {
    return false
  }
}

export const notifyRouteCancellation = async (
  routeId: string,
  driverId: string,
  driverName: string,
  passengers: Array<{ passenger_id: string; push_token?: string }>,
  routeInfo: { origin: string; destination: string; departureTime?: string }
) => {
  try {
    if (!passengers || passengers.length === 0) return true

    const notificationTitle = '❌ Tu viaje ha sido cancelado'
    const notificationBody = `${driverName} canceló el viaje ${routeInfo.origin} → ${routeInfo.destination}`

    await Promise.all(
      passengers
        .filter((p) => !!p.push_token)
        .map((p) =>
          sendPushNotificationToUser(p.push_token!, notificationTitle, notificationBody, {
            type: 'trip_cancelled',
            route_id: routeId,
            origin: routeInfo.origin,
            destination: routeInfo.destination,
            driver_id: driverId,
            driver_name: driverName,
            reason: 'Conductor canceló',
          })
        )
    )

    return true
  } catch (_e) {
    return false
  }
}
