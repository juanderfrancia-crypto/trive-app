import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/HomeScreen'
import SearchScreen from '../screens/SearchScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'

const Tab = createBottomTabNavigator()

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
          let iconName: keyof typeof Ionicons.glyphMap = 'home'

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Search') {
            iconName = focused ? 'car' : 'car-outline'
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          }

          if (focused) {
            return (
              <View style={styles.tabActive}>
                <Ionicons name={iconName} size={size} color={COLORS.textInverse} />
              </View>
            )
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#1230B8',
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          height: 65 + insets.bottom,
          paddingBottom: SPACING.md + insets.bottom,
          paddingTop: SPACING.sm,
          // Android: elevation baja para sombra sutil, no la franja negra de elevation alta
          elevation: Platform.OS === 'android' ? 8 : 0,
          // iOS: sombra suave hacia arriba
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: SPACING.xs,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}          options={{ title: 'Inicio' }} />
      <Tab.Screen name="Search"  component={SearchScreen}        options={{ title: 'Viajes' }} />
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
  tabActive: {
    backgroundColor: '#1230B8',
    borderRadius: RADIUS.full,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.28)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderBottomWidth: 3,
    borderBottomColor: '#0a1a7a',
    borderRightWidth: 1,
    borderRightColor: '#0a1a7a',
    // Android: elevation baja, shadowColor no se aplica en Android (siempre gris oscuro)
    elevation: Platform.OS === 'android' ? 4 : 0,
    // iOS: sombra azul del color del botón
    shadowColor: '#0E2699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
})
