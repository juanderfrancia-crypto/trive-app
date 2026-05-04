import { supabase } from './supabase'

export interface NotificationPreferences {
  id: string
  user_id: string
  push_notifications: boolean
  email_notifications: boolean
  sms_notifications: boolean
  in_app_notifications: boolean
  created_at: string
  updated_at: string
}

/**
 * Carga las preferencias de notificaciones del usuario
 */
export const loadNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 es "no rows returned" - que es esperado si no existe registro
      console.error('Error loading notification preferences:', error)
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
export const createDefaultPreferences = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
      .insert({
        user_id: userId,
        push_notifications: true,
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
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
 * Actualiza una preferencia específica
 */
export const updateNotificationPreference = async (
  userId: string,
  preference: keyof Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  value: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
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
 * Obtiene el estado de una preferencia específica
 */
export const getNotificationPreference = async (
  userId: string,
  preference: keyof Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<boolean | null> => {
  try {
    const prefs = await loadNotificationPreferences(userId)
    if (!prefs) return null
    return prefs[preference] || false
  } catch (err) {
    console.error('Error getting preference:', err)
    return null
  }
}
