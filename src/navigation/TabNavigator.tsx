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
            iconName = focused ? 'car-sharp' : 'car-outline'
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          }

          return (
            <View style={focused ? styles.iconActive : styles.iconInactive}>
              <Ionicons name={iconName} size={size} color={focused ? COLORS.primary : color} />
            </View>
          )
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarContainerStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          height: 55 + insets.bottom,
          paddingBottom: SPACING.sm + insets.bottom,
          paddingTop: SPACING.xs,
          paddingHorizontal: 0,
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 0,
          // Android: elevation baja para sombra sutil
          elevation: Platform.OS === 'android' ? 4 : 0,
          // iOS: sombra suave
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarIconSize: 22,
        sceneContainerStyle: {
          backgroundColor: COLORS.surface,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: SPACING.xs - 2,
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
  iconActive: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
  },
  iconInactive: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
  },
})
