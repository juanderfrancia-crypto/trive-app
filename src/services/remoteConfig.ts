// Firebase Remote Config: deja cambiar comportamiento de la app sin subir una
// versión nueva a Play Store (que tarda horas/días en revisión). Por ahora solo
// trae un interruptor real y justificado — modo mantenimiento — para tener un
// seguro de verdad si algo sale mal justo después de publicar. No se agregan
// más banderas especulativas hasta que haya una necesidad real.
let _remoteConfig: any = null
try { _remoteConfig = require('@react-native-firebase/remote-config').default } catch {}

const DEFAULT_MAINTENANCE_MESSAGE =
  'Estamos haciendo un ajuste rápido. Vuelve a abrir la app en unos minutos.'

const DEFAULTS = {
  maintenance_mode: false,
  maintenance_message: DEFAULT_MAINTENANCE_MESSAGE,
}

export async function initRemoteConfig(): Promise<void> {
  try {
    if (!_remoteConfig) return
    const rc = _remoteConfig()
    await rc.setDefaults(DEFAULTS)
    // En producción no hace falta revisar más seguido que cada hora para un
    // interruptor de emergencia; en desarrollo, sin caché, para probarlo al toque.
    await rc.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000 })
    await rc.fetchAndActivate()
  } catch {
    // Sin red o sin Remote Config disponible: se queda con los valores por defecto (sin mantenimiento).
  }
}

export function isMaintenanceMode(): boolean {
  try {
    if (!_remoteConfig) return false
    return _remoteConfig().getValue('maintenance_mode').asBoolean()
  } catch {
    return false
  }
}

export function getMaintenanceMessage(): string {
  try {
    if (!_remoteConfig) return DEFAULT_MAINTENANCE_MESSAGE
    const value = _remoteConfig().getValue('maintenance_message').asString()
    return value || DEFAULT_MAINTENANCE_MESSAGE
  } catch {
    return DEFAULT_MAINTENANCE_MESSAGE
  }
}
