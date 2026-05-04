import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import TabNavigator from './TabNavigator'
import LoginPhoneScreen from '../screens/LoginPhoneScreen'
import LoginEmailScreen from '../screens/LoginEmailScreen'
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
import AdminDocumentsScreen from '../screens/AdminDocumentsScreen'
import DriverOnboardingScreen from '../screens/DriverOnboardingScreen'
import SessionHistoryScreen from '../screens/SessionHistoryScreen'
import RecoveryAccountScreen from '../screens/RecoveryAccountScreen'
import RecentActivityScreen from '../screens/RecentActivityScreen'
import ChangePasswordScreen from '../screens/ChangePasswordScreen'
import PrivacyScreen from '../screens/PrivacyScreen'
import LoadingScreen from '../screens/LoadingScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import ScheduledTripsScreen from '../screens/ScheduledTripsScreen'
import GroupTripsScreen from '../screens/GroupTripsScreen'
import FavoriteRoutesScreen from '../screens/FavoriteRoutesScreen'
import TripHistoryScreen from '../screens/TripHistoryScreen'
import { VehicleInfoScreen } from '../screens/VehicleInfoScreen'
import { EditVehicleScreen } from '../screens/EditVehicleScreen'
import { EarningsScreen } from '../screens/EarningsScreen'
import { StatsScreen } from '../screens/StatsScreen'
import AboutTriveScreen from '../screens/AboutTriveScreen'
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen'
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen'
import SupportScreen from '../screens/SupportScreen'
import HelpScreen from '../screens/HelpScreen'
import LanguageScreen from '../screens/LanguageScreen'
import LearningCenterScreen from '../screens/LearningCenterScreen'
import BugReportScreen from '../screens/BugReportScreen'
import AvailableRidesScreen from '../screens/AvailableRidesScreen'
import SavedAddressesScreen from '../screens/SavedAddressesScreen'
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen'
import TripPreferencesScreen from '../screens/TripPreferencesScreen'
import CancellationHistoryScreen from '../screens/CancellationHistoryScreen'
import RatingAnalyticsDashboard from '../screens/RatingAnalyticsDashboard'
import TravelPreferencesScreen from '../screens/TravelPreferencesScreen'
import ActiveTripsScreen from '../screens/ActiveTripsScreen'
import ReviewsScreen from '../screens/ReviewsScreen'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { NotificationsProvider } from '../context/NotificationsContext'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stateRestored, setStateRestored] = useState(false)
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding)
  const pendingVerificationEmail = useAppStore((state) => state.pendingVerificationEmail)
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding)
  const setPendingVerification = useAppStore((state) => state.setPendingVerification)

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

  if (!mounted || authLoading || !stateRestored) {
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
      <Stack.Screen name="LoginEmail" component={LoginEmailScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RecoveryAccount" component={RecoveryAccountScreen} />
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
      <Stack.Screen name="AdminDocuments" component={AdminDocumentsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="RecoveryAccount" component={RecoveryAccountScreen} />
      <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
      <Stack.Screen name="ScheduledTrips" component={ScheduledTripsScreen} />
      <Stack.Screen name="GroupTrips" component={GroupTripsScreen} />
      <Stack.Screen name="FavoriteRoutes" component={FavoriteRoutesScreen} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="TripPreferences" component={TripPreferencesScreen} />
      <Stack.Screen name="CancellationHistory" component={CancellationHistoryScreen} />
      <Stack.Screen name="RatingAnalytics" component={RatingAnalyticsDashboard} />
      <Stack.Screen name="TravelPreferences" component={TravelPreferencesScreen} />
      <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
      <Stack.Screen name="ActiveTrips" component={ActiveTripsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="VehicleInfo" component={VehicleInfoScreen} />
      <Stack.Screen name="EditVehicle" component={EditVehicleScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="AboutTrive" component={AboutTriveScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="LearningCenter" component={LearningCenterScreen} />
      <Stack.Screen name="BugReport" component={BugReportScreen} />
    </>
  ) : null

  return (
    <NavigationContainer>
      {isUserAuthenticated ? (
        <NotificationsProvider userId={session?.user?.id}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>{authStack}</Stack.Navigator>
        </NotificationsProvider>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>{guestStack}</Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
