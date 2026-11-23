import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { configureNotificationHandler } from "./src/services/pushNotifications";
import { toastConfig } from "./src/components/toastConfig";
import AppAlertHost from "./src/components/AppAlert";
import ErrorBoundary from "./src/components/ErrorBoundary";
import MaintenanceScreen from "./src/components/MaintenanceScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import BiometricLockScreen from "./src/screens/BiometricLockScreen";
import { useBiometricLock } from "./src/hooks/useBiometricLock";
import { initSentry } from "./src/services/sentry";
import { initPerformanceMonitoring } from "./src/services/performance";
import { initRemoteConfig, isMaintenanceMode, getMaintenanceMessage } from "./src/services/remoteConfig";
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";

// react-native-screens está instalado pero nunca se activaba -- sin esto, los
// navegadores (stack, tabs, drawer) no usan las vistas nativas optimizadas y
// pierden varias optimizaciones reales (incluida detachInactiveScreens del
// TabNavigator, que no hace nada sin esta llamada). Descartado como causa del
// destello de Alertas (22-nov-2026): se probó desactivado y el destello seguía
// igual -- ver [[project_navegacion_fluida_21nov]].
enableScreens();

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

// Mantiene visible el splash nativo (el ícono) hasta que AppNavigator llame a
// hideAsync() él mismo, una vez estén listas las fuentes, la sesión y el estado
// persistido — no apenas cargan las fuentes. Sin esto, Android lo oculta solo
// apenas arranca el JS: eso dejaba ver LoadingScreen por separado mientras se
// restauraba la sesión, un "parpadeo" perceptible aunque las dos pantallas
// muestren el mismo ícono (como WhatsApp: una sola pantalla fija hasta que todo
// esté listo, nunca un paso intermedio visible).
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const { ready: biometricReady, locked, authenticating, retryUnlock } = useBiometricLock();

  useEffect(() => {
    initRemoteConfig().then(() => {
      setMaintenance({ on: isMaintenanceMode(), message: getMaintenanceMessage() });
    });
  }, []);

  // El splash nativo normalmente lo oculta AppNavigator cuando está listo, pero
  // AppNavigator nunca se monta mientras la app está bloqueada — sin esto, el
  // splash se quedaría pegado para siempre tapando la pantalla de bloqueo.
  // hideAsync() no hace nada si ya está oculto, así que es seguro llamarlo
  // desde los dos lugares.
  useEffect(() => {
    if (fontsLoaded && biometricReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, biometricReady]);

  // Mismo ícono que el splash nativo en vez de pantalla en blanco: si Android
  // suelta su splash apenas se dibuja el primer frame (puede pasar antes de
  // que preventAutoHideAsync surta efecto), lo que queda detrás debe verse
  // igual al splash, nunca vacío — si no, se percibe como "carga dos veces".
  if (!fontsLoaded || !biometricReady) return <LoadingScreen />;

  if (locked) {
    return <BiometricLockScreen authenticating={authenticating} onRetry={retryUnlock} />;
  }

  if (maintenance.on) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        <MaintenanceScreen message={maintenance.message} />
      </SafeAreaProvider>
    );
  }

  // initialMetrics evita que la primera pantalla nueva que se monta (ej. la
  // primera vez que se entra a una pestaña en la sesión) se dibuje un instante
  // asumiendo 0 de espacio arriba -- sin esto, el contenido se alcanza a ver
  // superpuesto con la barra de estado real antes de corregirse con la medida
  // real del dispositivo.
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
      <AppAlertHost />
      <Toast config={toastConfig} position="top" topOffset={54} />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);