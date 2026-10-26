// Firebase Performance Monitoring: mide automáticamente tiempo de arranque de la
// app y peticiones de red reales en el teléfono de cada usuario (sin configurar
// nada más) — da datos de verdad sobre la red rural inestable, en vez de solo
// la corrección a ciegas que ya se hizo con los timeouts (withTimeout).
let _perf: any = null
try { _perf = require('@react-native-firebase/perf').default } catch {}

export function initPerformanceMonitoring() {
  try {
    if (_perf) _perf().setPerformanceCollectionEnabled(!__DEV__)
  } catch {}
}
