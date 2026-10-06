import { useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet, Platform } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import Icon, { type IconName } from '../components/Icon'
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
  const isDriver = useAppStore((s) => isDriverRole(s.user))
  return isDriver ? <DriverTripsScreen /> : <PassengerTripsScreen />
}

export default function TabNavigator() {
  const notificationUnreadCount = useAppStore((s) => s.notificationUnreadCount)
  const insets = useSafeAreaInsets()
  const alertsBadge =
    notificationUnreadCount > 0
      ? notificationUnreadCount > 99
        ? '99+'
        : notificationUnreadCount
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
            iconName = 'ClipboardList'
          } else if (route.name === 'Alerts') {
            iconName = 'Bell'
          } else if (route.name === 'Profile') {
            iconName = 'User'
          }

          return (
            <TabIcon name={iconName} size={size} focused={focused} color={COLORS.primary} />
          )
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.primary,
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
          borderColor: COLORS.white,
          backgroundColor: COLORS.primaryTint,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIconSize: 22,
        sceneContainerStyle: {
          backgroundColor: COLORS.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: SPACING.xs - 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}          options={{ title: 'Inicio' }} />
      <Tab.Screen name="Search"  component={TripsTab}           options={{ title: 'Viajes' }} />
      <Tab.Screen name="Requests" component={AirportHubScreen}   options={{ title: 'Solicitudes' }} />
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
  barBackground: {
    flex: 1,
  },
  barSurface: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.white,
    backgroundColor: COLORS.primaryTint,
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
  },
})
