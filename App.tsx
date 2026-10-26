import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { toastConfig } from "./src/components/toastConfig";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { initSentry } from "./src/services/sentry";
import { initPerformanceMonitoring } from "./src/services/performance";
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";

let _crashlytics: any = null
try { _crashlytics = require("@react-native-firebase/crashlytics").default } catch {}

// Silencia todos los logs en producción para evitar exponer datos de usuarios
if (!__DEV__) {
  console.log   = () => {}
  console.warn  = () => {}
  console.error = () => {}
  console.info  = () => {}
  console.debug = () => {}
}

// initSentry() antes que cualquier otra cosa: Sentry.wrap(App) de más abajo
// necesita que el DSN ya esté configurado, si no, no manda nada a ningún
// lado aunque "parezca" configurado (bug real encontrado el 2026-10-27:
// esta llamada nunca existía, Sentry no estaba reportando nada).
initSentry();
configureNotificationHandler();
try { if (_crashlytics) _crashlytics().setCrashlyticsCollectionEnabled(!__DEV__) } catch {}
initPerformanceMonitoring();

function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
      <Toast config={toastConfig} position="bottom" bottomOffset={40} />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);