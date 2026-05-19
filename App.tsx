import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { initAnalytics } from "./src/services/analytics";

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

configureNotificationHandler();
initAnalytics();
try { if (_crashlytics) _crashlytics().setCrashlyticsCollectionEnabled(!__DEV__) } catch {}

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <AppNavigator />
      <Toast />
    </ErrorBoundary>
  );
}