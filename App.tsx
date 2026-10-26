import "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { toastConfig } from "./src/components/toastConfig";
import ErrorBoundary from "./src/components/ErrorBoundary";
import MaintenanceScreen from "./src/components/MaintenanceScreen";
import { initSentry } from "./src/services/sentry";
import { initPerformanceMonitoring } from "./src/services/performance";
import { initRemoteConfig, isMaintenanceMode, getMaintenanceMessage } from "./src/services/remoteConfig";
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

  // Seguro de emergencia: si algo sale mal justo después de publicar, se puede
  // activar desde Firebase Remote Config sin esperar una revisión nueva de
  // Play Store. Se revisa una vez al abrir la app, no en vivo durante la sesión.
  const [maintenance, setMaintenance] = useState<{ on: boolean; message: string }>({ on: false, message: "" });

  useEffect(() => {
    initRemoteConfig().then(() => {
      setMaintenance({ on: isMaintenanceMode(), message: getMaintenanceMessage() });
    });
  }, []);

  if (!fontsLoaded) return null;

  if (maintenance.on) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <MaintenanceScreen message={maintenance.message} />
      </SafeAreaProvider>
    );
  }

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