import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

configureNotificationHandler();

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <AppNavigator />
    </ErrorBoundary>
  );
}