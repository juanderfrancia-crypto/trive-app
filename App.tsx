import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { toastConfig } from "./src/components/toastConfig";
import AppAlertHost from "./src/components/AppAlert";
import ErrorBoundary from "./src/components/ErrorBoundary";
import MaintenanceScreen from "./src/components/MaintenanceScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import BiometricLockScreen from "./src/screens/BiometricLockScreen";
import OfflineBanner from "./src/components/OfflineBanner";
import { useBiometricLock } from "./src/hooks/useBiometricLock";
import { useAuth } from "./src/hooks/useAuth";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";
import { useAppStore, loadPendingVerificationSecure } from "./src/store/useAppStore";
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

// Mantiene visible el splash nativo (el ícono) hasta que este mismo componente
// llame a hideAsync() más abajo, una vez estén listas las fuentes y la
// biometría -- no apenas arranca el JS. Sin esto, Android lo oculta solo de
// inmediato: eso dejaba ver LoadingScreen por separado, un "parpadeo"
// perceptible aunque las dos pantallas muestren el mismo ícono (como WhatsApp:
// una sola espera continua hasta que todo esté listo, nunca un paso
// intermedio visible).
SplashScreen.preventAutoHideAsync().catch(() => {});
// fade: true solo tiene efecto en iOS en esta versión de expo-splash-screen
// (Android siempre corta de golpe, la librería no lo soporta ahí todavía) --
// se deja puesto sin costo ni riesgo, por si Expo lo habilita en Android más adelante.
SplashScreen.setOptions({ duration: 400, fade: true });

// initSentry() antes que cualquier otra cosa: Sentry.wrap(App) de más abajo
// necesita que el DSN ya esté configurado, si no, no manda nada a ningún
// lado aunque "parezca" configurado (bug real encontrado el 2026-10-27:
// esta llamada nunca existía, Sentry no estaba reportando nada).
initSentry();
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
  const { isOnline } = useNetworkStatus();

  // useAuth() ya no vive solo dentro de AppNavigator -- se llama aquí para que
  // su cadena (sesión + perfil + cédula + verificación de dispositivo) arranque
  // desde el instante cero, en paralelo con la biometría, y para que su
  // `loading` entre en la MISMA cuenta regresiva que todo lo demás. useAuth ya
  // está diseñado para que varias copias compartan el mismo trabajo sin
  // duplicarlo (ver los guards de módulo en useAuth.ts), así que AppNavigator
  // puede seguir llamándolo también, sin costo extra.
  const { loading: authLoading } = useAuth();

  // El store persiste hasSeenOnboarding/justRecoveredAccount con zustand
  // (storeHydrated) y la verificación de correo pendiente vive en SecureStore
  // aparte (pendingRestored) -- antes AppNavigator leía dos claves de
  // AsyncStorage que ya nadie escribe (quedaron de un esquema viejo), así que
  // ese "restoreState" nunca restauraba nada real y solo sumaba una espera.
  const [storeHydrated, setStoreHydrated] = useState(useAppStore.persist.hasHydrated());
  const [pendingRestored, setPendingRestored] = useState(false);

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) { setStoreHydrated(true); return; }
    return useAppStore.persist.onFinishHydration(() => setStoreHydrated(true));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pending = await loadPendingVerificationSecure();
        if (pending) {
          useAppStore.getState().setPendingVerification(pending.email, pending.name, pending.phone);
        }
      } catch {
        // sin verificación pendiente guardada, o no se pudo leer -- seguir igual
      } finally {
        setPendingRestored(true);
      }
    })();
  }, []);

  useEffect(() => {
    initRemoteConfig().then(() => {
      setMaintenance({ on: isMaintenanceMode(), message: getMaintenanceMessage() });
    });
  }, []);

  // Una sola cuenta regresiva para todo: fuentes, biometría, sesión+perfil, y
  // el estado persistido. Antes esto se partía en dos (una acá, otra dentro de
  // AppNavigator), lo que de verdad montaba dos pantallas de carga seguidas --
  // aunque se vieran idénticas, React las trataba como dos cosas distintas.
  const appReady = fontsLoaded && biometricReady && storeHydrated && pendingRestored && !authLoading;

  // El splash nativo se queda puesto hasta que haya fuentes + biometría --
  // recién ahí hay algo real que mostrar en su lugar (LoadingScreen, con el
  // mismo ícono, o la pantalla de bloqueo). No se espera a appReady completo:
  // si está bloqueada, el splash se quedaría pegado tapando la pantalla de
  // bloqueo hasta que la sesión terminara de cargar. hideAsync() no hace nada
  // si ya está oculto, así que es seguro que este efecto se repita.
  useEffect(() => {
    if (fontsLoaded && biometricReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, biometricReady]);

  // Mismo ícono que el splash nativo en vez de pantalla en blanco: si Android
  // suelta su splash apenas se dibuja el primer frame (puede pasar antes de
  // que preventAutoHideAsync surta efecto), lo que queda detrás debe verse
  // igual al splash, nunca vacío — si no, se percibe como "carga dos veces".
  if (!fontsLoaded || !biometricReady) return <LoadingScreen offline={!isOnline} />;

  // El bloqueo biométrico no debe esperar a que la sesión/perfil terminen de
  // cargar -- ya tiene todo lo que necesita (fuentes + su propio chequeo) para
  // mostrarse y dejar desbloquear mientras esa cadena sigue en paralelo.
  if (locked) {
    return <BiometricLockScreen authenticating={authenticating} onRetry={retryUnlock} />;
  }

  if (!appReady) return <LoadingScreen offline={!isOnline} />;

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
      <OfflineBanner />
      <AppAlertHost />
      <Toast config={toastConfig} position="top" topOffset={54} />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);