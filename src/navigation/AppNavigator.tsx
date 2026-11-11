import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SplashScreen from 'expo-splash-screen'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { COLORS } from '../theme/theme'

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: COLORS.white, card: COLORS.white },
}
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import TabNavigator from './TabNavigator'
import LoginPhoneScreen from '../screens/LoginPhoneScreen'
import VerifyPhoneScreen from '../screens/VerifyPhoneScreen'
import CompleteCedulaScreen from '../screens/CompleteCedulaScreen'
import DeviceVerificationScreen from '../screens/DeviceVerificationScreen'
import AccountRecoveryScreen from '../screens/AccountRecoveryScreen'
import RecoveryEmailScreen from '../screens/RecoveryEmailScreen'
import RegisterScreen from '../screens/RegisterScreen'
import VerifyEmailScreen from '../screens/VerifyEmailScreen'
import SeatSelectionScreen from '../screens/SeatSelectionScreen'
import BookingScreen from '../screens/BookingScreen'
import TripStatusScreen from '../screens/TripStatusScreen'
import DriverRegisterScreen from '../screens/DriverRegisterScreen'
import DriverPanelScreen from '../screens/DriverPanelScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import SecurityScreen from '../screens/SecurityScreen'
import DriverDocumentsScreen from '../screens/DriverDocumentsScreen'
import DriverOnboardingScreen from '../screens/DriverOnboardingScreen'
import SessionHistoryScreen from '../screens/SessionHistoryScreen'
import RecoveryAccountScreen from '../screens/RecoveryAccountScreen'
import RecentActivityScreen from '../screens/RecentActivityScreen'
import ChangePasswordScreen from '../screens/ChangePasswordScreen'
import PrivacyScreen from '../screens/PrivacyScreen'
import LoadingScreen from '../screens/LoadingScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import GroupTripsScreen from '../screens/GroupTripsScreen'
import FavoriteRoutesScreen from '../screens/FavoriteRoutesScreen'
import TripHistoryScreen from '../screens/TripHistoryScreen'
import { VehicleInfoScreen } from '../screens/VehicleInfoScreen'
import { EditVehicleScreen } from '../screens/EditVehicleScreen'
import DriverEarningsScreen from '../screens/DriverEarningsScreen'
import { StatsScreen } from '../screens/StatsScreen'
import AboutTriveScreen from '../screens/AboutTriveScreen'
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen'
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen'
import SupportScreen from '../screens/SupportScreen'
import HelpScreen from '../screens/HelpScreen'
import LearningCenterScreen from '../screens/LearningCenterScreen'
import BugReportScreen from '../screens/BugReportScreen'
import AvailableRidesScreen from '../screens/AvailableRidesScreen'
import SavedAddressesScreen from '../screens/SavedAddressesScreen'
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen'
import WalletScreen from '../screens/WalletScreen'
import DriverPaymentMethodsScreen from '../screens/DriverPaymentMethodsScreen'
import CancellationHistoryScreen from '../screens/CancellationHistoryScreen'
import RatingAnalyticsDashboard from '../screens/RatingAnalyticsDashboard'
import TravelPreferencesScreen from '../screens/TravelPreferencesScreen'
import ReviewsScreen from '../screens/ReviewsScreen'
import RecurringRoutesScreen from '../screens/RecurringRoutesScreen'
import ReferralScreen from '../screens/ReferralScreen'
import CreateAirportRequestScreen from '../screens/CreateAirportRequestScreen'
import AirportRequestDetailsScreen from '../screens/AirportRequestDetailsScreen'
import PassengerPaymentScreen from '../screens/payments/PassengerPaymentScreen'
import DriverPaymentsScreen from '../screens/payments/DriverPaymentsScreen'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { NotificationsProvider } from '../context/NotificationsContext'
import { configureNotificationHandler } from '../services/pushNotifications'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stateRestored, setStateRestored] = useState(false)
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding)
  const user = useAppStore((state) => state.user)
  const deviceVerificationStatus = useAppStore((state) => state.deviceVerificationStatus)
  const justRecoveredAccount = useAppStore((state) => state.justRecoveredAccount)
  const pendingVerificationEmail = useAppStore((state) => state.pendingVerificationEmail)
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding)
  const setPendingVerification = useAppStore((state) => state.setPendingVerification)

  // Handler de primer plano + canal de notificaciones de Android, antes de que
  // llegue cualquier push (se registraba la función pero nunca se llamaba).
  useEffect(() => {
    configureNotificationHandler()
  }, [])

  // Restaurar estado persistido de AsyncStorage
  useEffect(() => {
    const restoreState = async () => {
      try {
        const stored = await AsyncStorage.getItem('hasSeenOnboarding')
        if (stored !== null) {
          setHasSeenOnboarding(JSON.parse(stored))
        }

        const pendingVerif = await AsyncStorage.getItem('pendingVerification')
        if (pendingVerif !== null) {
          const { email, name, phone } = JSON.parse(pendingVerif)
          setPendingVerification(email, name, phone)
        }
      } catch (err) {
        console.error('Error restaurando estado:', err)
      } finally {
        setStateRestored(true)
      }
    }

    restoreState()
  }, [setHasSeenOnboarding, setPendingVerification])

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const appReady = mounted && !authLoading && stateRestored

  // El splash nativo (App.tsx llamó preventAutoHideAsync) se queda puesto hasta este
  // momento exacto — recién cuando ya hay algo real que mostrar en vez de LoadingScreen,
  // nunca antes. Así el usuario nunca ve el paso intermedio: splash nativo y después,
  // directo, la pantalla real (como WhatsApp). hideAsync() no hace nada si ya está oculto,
  // así que es seguro que este efecto se repita si authLoading vuelve a activarse después.
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [appReady])

  if (!appReady) {
    return <LoadingScreen />
  }

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

  const guestStack = !isUserAuthenticated && pendingVerificationEmail ? (
    <>
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{}} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </>
  ) : !isUserAuthenticated ? (
    <>
      <Stack.Screen name="Login" component={LoginPhoneScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RecoveryAccount" component={RecoveryAccountScreen} />
      <Stack.Screen name="AccountRecovery" component={AccountRecoveryScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      {!pendingVerificationEmail && (
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{}} />
      )}
    </>
  ) : null

  const authStack = isUserAuthenticated ? (
    <>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AvailableRides" component={AvailableRidesScreen} />
      <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="TripStatus" component={TripStatusScreen} />
      <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />
      <Stack.Screen name="DriverPanel" component={DriverPanelScreen} />
      <Stack.Screen name="DriverOnboarding" component={DriverOnboardingScreen} />
      <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="RecoveryEmail" component={RecoveryEmailScreen} />
      <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="RecoveryAccount" component={RecoveryAccountScreen} />
      <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
      <Stack.Screen name="GroupTrips" component={GroupTripsScreen} />
      <Stack.Screen name="FavoriteRoutes" component={FavoriteRoutesScreen} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverPaymentMethods" component={DriverPaymentMethodsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CancellationHistory" component={CancellationHistoryScreen} />
      <Stack.Screen name="RatingAnalytics" component={RatingAnalyticsDashboard} />
      <Stack.Screen name="TravelPreferences" component={TravelPreferencesScreen} />
      <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="RecurringRoutes" component={RecurringRoutesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VehicleInfo" component={VehicleInfoScreen} />
      <Stack.Screen name="EditVehicle" component={EditVehicleScreen} />
      <Stack.Screen name="Earnings" component={DriverEarningsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="AboutTrive" component={AboutTriveScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="LearningCenter" component={LearningCenterScreen} />
      <Stack.Screen name="BugReport" component={BugReportScreen} />
      <Stack.Screen name="AirportRequest" component={CreateAirportRequestScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AirportRequestDetails" component={AirportRequestDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PassengerPayment" component={PassengerPaymentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverPayments" component={DriverPaymentsScreen} options={{ headerShown: false }} />
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
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
        </Stack.Navigator>
      ) : needsCedula ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="CompleteCedula" component={CompleteCedulaScreen} />
        </Stack.Navigator>
      ) : needsDeviceVerification ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="DeviceVerification" component={DeviceVerificationScreen} />
        </Stack.Navigator>
      ) : isUserAuthenticated ? (
        <NotificationsProvider userId={session?.user?.id}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>{authStack}</Stack.Navigator>
        </NotificationsProvider>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>{guestStack}</Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
