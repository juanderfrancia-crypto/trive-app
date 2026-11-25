import { useEffect, useState } from 'react'
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { View, StyleSheet, TouchableOpacity, type LayoutChangeEvent } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import Icon, { type IconName } from '../components/Icon'
import { Text } from '../components/AppText'
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

const ROUTE_ICONS: Record<string, IconName> = {
  Home: 'House',
  Search: 'Car',
  Requests: 'Send',
  Alerts: 'Bell',
  Profile: 'User',
}

// Prueba (24-nov-2026): antes cada ícono tenía su propia pastilla que aparecía
// y desaparecía con fade+scale al enfocarse. Ahora es UNA sola pastilla
// compartida que se desliza de una pestaña a otra -- por eso la barra pasó a
// ser un `tabBar` completo en vez de usar tabBarIcon/tabBarBackground por
// separado (necesita conocer el ancho real de la barra y el índice activo al
// mismo tiempo para calcular hacia dónde deslizarse).
function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0)
  const tabWidth = barWidth / state.routes.length
  const pillX = useSharedValue(0)

  useEffect(() => {
    // withTiming en vez de withSpring -- un resorte, por más amortiguado que
    // esté, siempre puede rebotar un poco antes de quedar quieto. El usuario
    // pidió explícitamente que al soltar el dedo la pastilla llegue y se
    // quede fija de una vez, sin vaivén.
    if (tabWidth > 0) {
      pillX.value = withTiming(state.index * tabWidth, { duration: 220, easing: Easing.out(Easing.quad) })
    }
  }, [state.index, tabWidth, pillX])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }))

  const onRowLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)

  return (
    <View style={[styles.tabBarWrap, { marginBottom: SPACING.sm + insets.bottom }]}>
      <View style={styles.barSurface} />

      <View style={styles.tabRow} onLayout={onRowLayout}>
        {tabWidth > 0 && (
          <Animated.View style={[styles.slidingPillBox, { width: tabWidth }, pillStyle]}>
            <View style={styles.slidingPillInner} />
          </Animated.View>
        )}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const focused = state.index === index
          const badge = options.tabBarBadge
          const color = focused ? COLORS.primary : 'rgba(255,255,255,0.75)'

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
            >
              <View style={styles.iconBox}>
                <Icon name={ROUTE_ICONS[route.name] ?? 'House'} size={22} color={color} />
                {badge != null && (
                  <View style={[styles.badgeDot, options.tabBarBadgeStyle]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? COLORS.white : 'rgba(255,255,255,0.75)', fontWeight: focused ? '800' : '600' },
                ]}
              >
                {options.title}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
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
  // viewingAsPassenger: ver docs/MODO_CONDUCTOR_PASAJERO.md.
  const isDriver = useAppStore((s) => isDriverRole(s.user) && !s.viewingAsPassenger)
  const alertsBadge =
    notificationUnreadCount > 0
      ? notificationUnreadCount > 99
        ? '99+'
        : notificationUnreadCount
      : undefined

  const requestsUnreadCount = useRequestsBadgeCount(userId, isDriver)
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
      // Por defecto en Android las pestañas inactivas se desprenden de la vista
      // nativa para ahorrar memoria, y se vuelven a montar al volver a ellas --
      // con el corte instantáneo de antes no se notaba, pero con la transición
      // (fade/shift) se alcanza a ver ese remontaje a medio camino. Se desactiva
      // para que las 5 pestañas se queden "calientes" (son pocas y livianas).
      detachInactiveScreens={false}
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={() => ({
        sceneContainerStyle: {
          backgroundColor: COLORS.background,
        },
        // Se probaron 'shift' y 'fade' -- cualquier animación, por corta que sea,
        // obliga a un mínimo de tiempo viendo la pantalla a medio aparecer, lo cual
        // ya se siente como demora. Apps como WhatsApp/Facebook no animan el cambio
        // de pestaña -- cortan al instante y se sienten fluidas porque no hay nada
        // roto que la animación tuviera que disimular. Ahora que se corrigieron las
        // causas reales del "salto" (barra de estado y sombras desalineadas), 'none'
        // debería sentirse instantáneo sin volver a verse mal.
        animation: 'none',
        // Por defecto, una pestaña no se monta hasta que la tocas por primera
        // vez -- ese primer montaje es más pesado (carga de datos, layout
        // inicial) que las siguientes veces, y el destello reportado solo pasa
        // la primera vez que se cambia de pestaña en la sesión. Con lazy:false
        // las 5 pestañas se montan de una vez al abrir la app, antes de que el
        // usuario llegue a tocarlas.
        lazy: false,
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
            backgroundColor: COLORS.notificationBadge,
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
            backgroundColor: COLORS.notificationBadge,
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
            backgroundColor: COLORS.notificationBadge,
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
  tabBarWrap: {
    position: 'relative',
    marginHorizontal: SPACING.lg,
    height: 60,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  barSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
  },
  // paddingTop fijo (no centrado con justifyContent) para que el ícono quede
  // SIEMPRE en el mismo punto exacto que slidingPillBox.top -- ambos miden
  // desde el mismo borde (el de tabRow), así la pastilla nunca queda
  // desalineada del ícono sin importar el alto de la etiqueta debajo.
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  slidingPillBox: {
    position: 'absolute',
    top: SPACING.sm,
    left: 0,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slidingPillInner: {
    width: 56,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBox: {
    width: 56,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: 6,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  label: {
    fontSize: 11,
    marginTop: SPACING.xs - 2,
    textShadowColor: 'rgba(8,45,102,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})
