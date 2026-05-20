import { supabase } from './supabase'
import type { Notification } from '../hooks/useNotifications'

/** Inserta una fila en `notifications` (el insert en tiempo real actualiza el centro en la app). */
export async function insertNotificationForUser(
  recipientUserId: string,
  payload: Omit<Notification, 'id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{ ...payload, user_id: recipientUserId }])
    .select()
    .single()

  if (error) throw error
  return data
}
