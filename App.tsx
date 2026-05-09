import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Silencia todos los logs en producción para evitar exponer datos de usuarios
if (!__DEV__) {
  console.log   = () => {}
  console.warn  = () => {}
  console.error = () => {}
  console.info  = () => {}
  console.debug = () => {}
}

configureNotificationHandler();

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <AppNavigator />
      <Toast />
    </ErrorBoundary>
  );
}