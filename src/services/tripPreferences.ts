import { supabase } from './supabase'

export interface TripPreferences {
  id: string
  user_id: string
  beverage_preference: 'agua' | 'jugo' | 'ninguno' | null
  snack_preference: 'dulce' | 'salado' | 'ninguno' | null
  temperature_preference: 'frio' | 'caliente' | 'ambiente' | null
  music_preference: 'si' | 'no' | 'bajo' | null
  conversation_preference: 'conversador' | 'silencioso' | 'neutral' | null
  temperature_car: 'frio' | 'ambiente' | 'caliente' | null
  created_at: string
  updated_at: string
}

/**
 * Carga las preferencias de viaje del usuario
 */
export const loadTripPreferences = async (userId: string): Promise<TripPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('trip_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading trip preferences:', error)
      return null
    }

    return data || null
  } catch (err) {
    console.error('Unexpected error loading preferences:', err)
    return null
  }
}

/**
 * Crea preferencias por defecto para un nuevo usuario
 */
export const createDefaultTripPreferences = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_preferences')
      .insert({
        user_id: userId,
        beverage_preference: null,
        snack_preference: null,
        temperature_preference: null,
        music_preference: null,
        conversation_preference: null,
        temperature_car: null,
      })

    if (error) {
      console.error('Error creating default preferences:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Unexpected error:', err)
    return false
  }
}

/**
 * Actualiza una preferencia de viaje
 */
export const updateTripPreference = async (
  userId: string,
  preference: keyof Omit<
    TripPreferences,
    'id' | 'user_id' | 'created_at' | 'updated_at'
  >,
  value: string | null
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_preferences')
      .update({ [preference]: value })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating preference:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Unexpected error updating preference:', err)
    return false
  }
}

/**
 * Obtiene todas las preferencias de viaje
 */
export const getAllTripPreferences = async (userId: string): Promise<TripPreferences | null> => {
  return loadTripPreferences(userId)
}
