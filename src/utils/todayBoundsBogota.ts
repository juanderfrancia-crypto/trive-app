import { supabase } from '../services/supabase'

const pad = (n: number) => String(n).padStart(2, '0')

export type TodayBounds = { start: string; end: string }

let cached: { bounds: TodayBounds; fetchedAt: number } | null = null
const CACHE_MS = 5 * 60 * 1000

// Límites de "hoy" anclados a la hora del servidor (Bogotá), no al reloj del celular,
// para que un celular con la hora u horario mal configurado no muestre salidas que no aplican.
// Se cachea por 5 minutos -- la fecha del día no cambia de un focus a otro de la pantalla,
// así que no hace falta pedírsela al servidor cada vez que el usuario vuelve a Inicio.
export const getTodayBoundsBogota = async (): Promise<TodayBounds> => {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < CACHE_MS) return cached.bounds

  let datePart: string
  try {
    const { data, error } = await supabase.rpc('now_bogota')
    if (error || !data) throw error ?? new Error('now_bogota sin datos')
    datePart = String(data).slice(0, 10)
  } catch {
    const d = new Date()
    datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const [y, m, d] = datePart.split('-').map(Number)
  const tomorrow = new Date(y, m - 1, d + 1)
  const endPart = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
  const bounds: TodayBounds = { start: `${datePart}T00:00:00`, end: `${endPart}T00:00:00` }
  cached = { bounds, fetchedAt: now }
  return bounds
}
