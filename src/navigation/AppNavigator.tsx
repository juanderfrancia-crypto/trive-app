import { useEffect } from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { COLORS } from '../theme/theme'

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: COLORS.background, card: COLORS.background },
}

// Mismo color en las 3 capas (tema de navegación, contentStyle del stack, y el
// propio fondo de cada pantalla) para que no se vea un destello de otro color
// en el instante entre que una pantalla termina de salir y la otra de entrar.
const commonScreenOptions = { headerShown: false, contentStyle: { backgroundColor: COLORS.background } }
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import TabNavigator from './TabNavigator'
import LoginPhoneScreen from '../screens/LoginPhoneScreen'
import VerifyPhoneScreen from '../screens/VerifyPhoneScreen'
import CompleteCedulaScreen from '../screens/CompleteCedulaScreen'
import DeviceVerificationScreen from '../screens/DeviceVerificationScreen'
import VerifyEmailScreen from '../screens/VerifyEmailScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { NotificationsProvider } from '../context/NotificationsContext'
import { configureNotificationHandler } from '../services/pushNotifications'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  // App.tsx ya garantiza que, para cuando este componente se monta, la sesión
  // ya está resuelta (loading siempre false acá) -- se vuelve a llamar solo
  // por `session`, sin costo extra (ver el comentario junto a la primera
  // llamada en App.tsx).
  const { session } = useAuth()
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding)
  const user = useAppStore((state) => state.user)
  const deviceVerificationStatus = useAppStore((state) => state.deviceVerificationStatus)
  const justRecoveredAccount = useAppStore((state) => state.justRecoveredAccount)
  const pendingVerificationEmail = useAppStore((state) => state.pendingVerificationEmail)
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding)

  // Handler de primer plano + canal de notificaciones de Android, antes de que
  // llegue cualquier push (se registraba la función pero nunca se llamaba).
  useEffect(() => {
    configureNotificationHandler()
  }, [])

  // Mostrar onboarding si no lo ha visto (SIEMPRE, incluso si hay verificación pendiente)
  // Esto permite que el usuario pueda reiniciar el proceso
  if (!hasSeenOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => setHasSeenOnboarding(true)}
      />
    )
  }

  // Usar session como fuente de verdad, ya que está conectado a Supabase Auth.onAuthStateChange
  const isUserAuthenticated = !!session

  // Pantallas a las que nunca se llega apenas se abre la app (solo por
  // navegación explícita del usuario) usan getComponent en vez de un import
  // estático arriba -- con esto, Metro no evalúa ni ejecuta ese módulo (y todo
  // lo que esa pantalla importe) hasta el instante en que el usuario navega
  // ahí. Las pantallas que SÍ pueden ser la primera cosa que se ve (Login,
  // Main, los pasos obligatorios de verificación) se quedan con import/component
  // normal arriba.
  const guestStack = !isUserAuthenticated && pendingVerificationEmail ? (
    <>
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{}} />
      <Stack.Screen name="Register" getComponent={() => require('../screens/RegisterScreen').default} />
    </>
  ) : !isUserAuthenticated ? (
    <>
      <Stack.Screen name="Login" component={LoginPhoneScreen} />
      <Stack.Screen name="Register" getComponent={() => require('../screens/RegisterScreen').default} />
      <Stack.Screen name="RecoveryAccount" getComponent={() => require('../screens/RecoveryAccountScreen').default} />
      <Stack.Screen name="AccountRecovery" getComponent={() => require('../screens/AccountRecoveryScreen').default} />
      <Stack.Screen name="TermsOfService" getComponent={() => require('../screens/TermsOfServiceScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacyPolicy" getComponent={() => require('../screens/PrivacyPolicyScreen').default} options={{ headerShown: false }} />
      {!pendingVerificationEmail && (
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{}} />
      )}
    </>
  ) : null

  const authStack = isUserAuthenticated ? (
    <>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AvailableRides" getComponent={() => require('../screens/AvailableRidesScreen').default} />
      <Stack.Screen name="SeatSelection" getComponent={() => require('../screens/SeatSelectionScreen').default} />
      <Stack.Screen name="Booking" getComponent={() => require('../screens/BookingScreen').default} />
      <Stack.Screen name="TripStatus" getComponent={() => require('../screens/TripStatusScreen').default} />
      <Stack.Screen name="DriverRegister" getComponent={() => require('../screens/DriverRegisterScreen').default} />
      <Stack.Screen name="DriverPanel" getComponent={() => require('../screens/DriverPanelScreen').default} />
      <Stack.Screen name="DriverOnboarding" getComponent={() => require('../screens/DriverOnboardingScreen').default} />
      <Stack.Screen name="DriverDocuments" getComponent={() => require('../screens/DriverDocumentsScreen').default} />
      <Stack.Screen name="Notifications" getComponent={() => require('../screens/NotificationsScreen').default} />
      <Stack.Screen name="Settings" getComponent={() => require('../screens/SettingsScreen').default} />
      <Stack.Screen name="Privacy" getComponent={() => require('../screens/PrivacyScreen').default} />
      <Stack.Screen name="Security" getComponent={() => require('../screens/SecurityScreen').default} />
      <Stack.Screen name="RecoveryEmail" getComponent={() => require('../screens/RecoveryEmailScreen').default} />
      <Stack.Screen name="SessionHistory" getComponent={() => require('../screens/SessionHistoryScreen').default} />
      <Stack.Screen name="ChangePassword" getComponent={() => require('../screens/ChangePasswordScreen').default} />
      <Stack.Screen name="EditProfile" getComponent={() => require('../screens/EditProfileScreen').default} />
      <Stack.Screen name="RecoveryAccount" getComponent={() => require('../screens/RecoveryAccountScreen').default} />
      <Stack.Screen name="RecentActivity" getComponent={() => require('../screens/RecentActivityScreen').default} />
      <Stack.Screen name="FavoriteRoutes" getComponent={() => require('../screens/FavoriteRoutesScreen').default} />
      <Stack.Screen name="SavedAddresses" getComponent={() => require('../screens/SavedAddressesScreen').default} />
      <Stack.Screen name="PaymentMethods" getComponent={() => require('../screens/PaymentMethodsScreen').default} />
      <Stack.Screen name="Wallet" getComponent={() => require('../screens/WalletScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="DriverPaymentMethods" getComponent={() => require('../screens/DriverPaymentMethodsScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="AddPaymentMethod" getComponent={() => require('../screens/AddPaymentMethodScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="NegotiationChat" getComponent={() => require('../screens/NegotiationChatScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="SetTripPrice" getComponent={() => require('../screens/SetTripPriceScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="RatingScreen" getComponent={() => require('../screens/RatingScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="RatePassengers" getComponent={() => require('../screens/RatePassengersScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="CancellationHistory" getComponent={() => require('../screens/CancellationHistoryScreen').default} />
      <Stack.Screen name="TripHistory" getComponent={() => require('../screens/TripHistoryScreen').default} />
      <Stack.Screen name="Reviews" getComponent={() => require('../screens/ReviewsScreen').default} />
      <Stack.Screen name="RecurringRoutes" getComponent={() => require('../screens/RecurringRoutesScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" getComponent={() => require('../screens/ReferralScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="EditVehicle" getComponent={() => require('../screens/EditVehicleScreen').EditVehicleScreen} />
      <Stack.Screen name="Earnings" getComponent={() => require('../screens/DriverEarningsScreen').default} />
      <Stack.Screen name="AboutTrive" getComponent={() => require('../screens/AboutTriveScreen').default} />
      <Stack.Screen name="TermsOfService" getComponent={() => require('../screens/TermsOfServiceScreen').default} />
      <Stack.Screen name="PrivacyPolicy" getComponent={() => require('../screens/PrivacyPolicyScreen').default} />
      <Stack.Screen name="Support" getComponent={() => require('../screens/SupportScreen').default} />
      <Stack.Screen name="Help" getComponent={() => require('../screens/HelpScreen').default} />
      <Stack.Screen name="LearningCenter" getComponent={() => require('../screens/LearningCenterScreen').default} />
      <Stack.Screen name="BugReport" getComponent={() => require('../screens/BugReportScreen').default} />
      <Stack.Screen name="AirportRequest" getComponent={() => require('../screens/CreateAirportRequestScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="AirportRequestDetails" getComponent={() => require('../screens/AirportRequestDetailsScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="PassengerPayment" getComponent={() => require('../screens/payments/PassengerPaymentScreen').default} options={{ headerShown: false }} />
      <Stack.Screen name="DriverPayments" getComponent={() => require('../screens/payments/DriverPaymentsScreen').default} options={{ headerShown: false }} />
    </>
  ) : null

  // justRecoveredAccount: la cuenta se recuperó por correo (AccountRecoveryScreen) -- aunque
  // ya tenga un teléfono viejo guardado (el que se perdió), se le pide fijar uno nuevo con
  // la misma pantalla de siempre antes de dejarlo entrar.
  const needsPhoneVerification = isUserAuthenticated && (!session?.user?.phone || justRecoveredAccount)
  // Cédula obligatoria para todos los usuarios (ver memoria project_seguridad_cuenta_unica_dispositivo,
  // punto 2) -- se pide una sola vez, después de resolver el teléfono, antes de dejar entrar al resto de la app.
  const needsCedula = isUserAuthenticated && !needsPhoneVerification && !!user && !user.cedula
  // Punto 3 del plan de seguridad: dispositivo no reconocido para esta cuenta (ver
  // checkDeviceVerification en useAuth.ts). Solo bloquea con 'needs_verification' --
  // 'unknown' (aún no se consultó) y 'recognized' dejan pasar.
  const needsDeviceVerification =
    isUserAuthenticated && !needsPhoneVerification && !needsCedula && deviceVerificationStatus === 'needs_verification'

  return (
    <NavigationContainer theme={navigationTheme}>
      {needsPhoneVerification ? (
        <Stack.Navigator screenOptions={commonScreenOptions}>
          <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
        </Stack.Navigator>
      ) : needsCedula ? (
        <Stack.Navigator screenOptions={commonScreenOptions}>
          <Stack.Screen name="CompleteCedula" component={CompleteCedulaScreen} />
        </Stack.Navigator>
      ) : needsDeviceVerification ? (
        <Stack.Navigator screenOptions={commonScreenOptions}>
          <Stack.Screen name="DeviceVerification" component={DeviceVerificationScreen} />
        </Stack.Navigator>
      ) : isUserAuthenticated ? (
        <NotificationsProvider userId={session?.user?.id}>
          <Stack.Navigator screenOptions={commonScreenOptions}>{authStack}</Stack.Navigator>
        </NotificationsProvider>
      ) : (
        <Stack.Navigator screenOptions={commonScreenOptions}>{guestStack}</Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
