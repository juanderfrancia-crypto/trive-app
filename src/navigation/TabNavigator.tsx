import { useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet, Platform } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import Icon, { type IconName } from '../components/Icon'
import { Text } from '../components/AppText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/HomeScreen'
import DriverTripsScreen from '../screens/driver/DriverTripsScreen'
import PassengerTripsScreen from '../screens/passenger/PassengerTripsScreen'
import AirportHubScreen from '../screens/AirportHubScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { isDriverRole } from '../utils/userRole'
import { useRequestsBadgeCount } from '../hooks/useRequestsBadge'
import { useMessagesBadgeCount } from '../hooks/useMessagesBadge'

const Tab = createBottomTabNavigator()

function TabIcon({ name, color, size, focused }: { name: IconName; color: string; size: number; focused: boolean }) {
  const progreso = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    progreso.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 180 })
  }, [focused, progreso])

  const pastilla = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ scaleX: 0.6 + 0.4 * progreso.value }],
  }))

  return (
    <View style={styles.iconBox}>
      <Animated.View style={[styles.pill, pastilla]} />
      <Icon name={name} size={size} color={color} />
    </View>
  )
}

function TripsTab() {
  // viewingAsPassenger: ver docs/MODO_CONDUCTOR_PASAJERO.md.
  const isDriver = useAppStore((s) => isDriverRole(s.user) && !s.viewingAsPassenger)
  return isDriver ? <DriverTripsScreen /> : <PassengerTripsScreen />
}

export default function TabNavigator() {
  const notificationUnreadCount = useAppStore((s) => s.notificationUnreadCount)
  const userId = useAppStore((s) => s.user?.id)
  const insets = useSafeAreaInsets()
  const alertsBadge =
    notificationUnreadCount > 0
      ? notificationUnreadCount > 99
        ? '99+'
        : notificationUnreadCount
      : undefined

  const requestsUnreadCount = useRequestsBadgeCount(userId)
  const requestsBadge =
    requestsUnreadCount > 0
      ? requestsUnreadCount > 99
        ? '99+'
        : requestsUnreadCount
      : undefined

  const messagesUnreadCount = useMessagesBadgeCount(userId)
  const messagesBadge =
    messagesUnreadCount > 0
      ? messagesUnreadCount > 99
        ? '99+'
        : messagesUnreadCount
      : undefined

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: IconName = 'House'

          if (route.name === 'Home') {
            iconName = 'House'
          } else if (route.name === 'Search') {
            iconName = 'Car'
          } else if (route.name === 'Requests') {
            iconName = 'Send'
          } else if (route.name === 'Alerts') {
            iconName = 'Bell'
          } else if (route.name === 'Profile') {
            iconName = 'User'
          }

          return (
            <TabIcon name={iconName} size={size} focused={focused} color={color} />
          )
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.75)',
        tabBarContainerStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <View style={styles.barBackground}>
            <View style={styles.barSurface} />
          </View>
        ),
        tabBarStyle: {
          position: 'relative',
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.sm + insets.bottom,
          height: 64,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.sm,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
          backgroundColor: COLORS.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIconSize: 22,
        sceneContainerStyle: {
          backgroundColor: COLORS.surface,
        },
        // El ícono activo se ve sobre la pastilla blanca (por eso usa tabBarActiveTintColor,
        // azul primario, ahí sí se lee bien) — pero el texto de la pestaña va directo sobre
        // el fondo azul de la barra, sin pastilla debajo. Si usara el mismo tinte azul,
        // quedaría azul sobre azul, invisible. Por eso el label tiene su propio color,
        // siempre en blanco (más opaco cuando está activo), independiente del ícono.
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={[
              styles.label,
              { color: focused ? COLORS.white : 'rgba(255,255,255,0.75)', fontWeight: focused ? '800' : '600' },
            ]}
          >
            {children}
          </Text>
        ),
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}          options={{ title: 'Inicio' }} />
      <Tab.Screen
        name="Search"
        component={TripsTab}
        options={{
          title: 'Viajes',
          tabBarBadge: messagesBadge,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.error,
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            maxHeight: 18,
            lineHeight: 16,
          },
        }}
      />
      <Tab.Screen
        name="Requests"
        component={AirportHubScreen}
        options={{
          title: 'Solicitudes',
          tabBarBadge: requestsBadge,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.error,
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            maxHeight: 18,
            lineHeight: 16,
          },
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          title: 'Alertas',
          tabBarBadge: alertsBadge,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.error,
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            maxHeight: 18,
            lineHeight: 16,
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}       options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    marginTop: SPACING.xs - 2,
    textShadowColor: 'rgba(8,45,102,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  barBackground: {
    flex: 1,
  },
  barSurface: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: COLORS.primary,
  },
  iconBox: {
    width: 56,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    width: 56,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
})
