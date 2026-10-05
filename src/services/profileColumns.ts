import { supabase } from './supabase'
import type { Database } from '../types/database.types'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// Columnas del perfil que la app puede leer. El teléfono no está aquí:
// cada quien lo obtiene con getMyPhone() (la base solo lo libera a quien corresponde).
export const PROFILE_COLUMNS = 'id, name, email, avatar_url, role, rating, total_trips, total_spent, is_driver_verified, created_at, updated_at, is_driver, is_passenger, driver_active, is_admin, driver_verified, driver_verified_at, profile_photo_url, push_token, notification_preferences, membership_type, membership_expiry, vehicle_photo_url, last_seen, balance, referral_code, referred_by, emergency_contact, preferred_municipality' as const

// Mi teléfono. Devuelve null si no hay sesión o no tiene teléfono registrado.
export const getMyPhone = async (): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_my_phone')
  if (error) return null
  return (data as string | null) ?? null
}

// Teléfono de otra persona. Solo existe si hay un viaje aceptado entre ambos.
export const getCounterpartPhone = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_counterpart_phone', { p_user: userId })
  if (error) return null
  return (data as string | null) ?? null
}

// Guarda campos de mi perfil: actualiza si ya existe la fila, y la crea si no.
// (Un upsert pide leer la fila, y la app ya no puede leer el teléfono desde perfiles.)
export const saveMyProfile = async (
  userId: string,
  fields: ProfileUpdate
): Promise<{ error: unknown | null }> => {
  const { id: _ignored, ...values } = fields
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (lookupError) return { error: lookupError }
  if (existing) {
    const { error } = await supabase.from('profiles').update(values).eq('id', userId)
    return { error }
  }
  if (typeof values.name !== 'string') return { error: new Error('El nombre es obligatorio para crear el perfil') }
  const { error } = await supabase.from('profiles').insert({ id: userId, ...values, name: values.name })
  return { error }
}
