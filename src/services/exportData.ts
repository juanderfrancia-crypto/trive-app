import { getItem } from '../utils/storage'
import { supabase } from './supabase'

const privacyKeys = [
  'privacy_public_profile',
  'privacy_show_rating',
  'privacy_share_location',
  'privacy_allow_messages',
  'privacy_search_indexing',
]

export async function exportUserData() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error(userError.message || 'No se pudo verificar el usuario')
  }

  const user = userData.user
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const userId = user.id

  const [
    profileResult,
    bookingsResult,
    routesResult,
    documentsResult,
    messagesResult,
    notificationsResult,
    preferencesResult,
    favoritesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('bookings')
      .select('*, routes:route_id(*)')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('routes').select('*').eq('driver_id', userId).order('created_at', { ascending: false }),
    supabase.from('driver_documents').select('*').eq('driver_id', userId),
    supabase
      .from('messages')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('travel_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('favorite_routes')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false }),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }
  if (bookingsResult.error) {
    throw bookingsResult.error
  }
  if (routesResult.error) {
    throw routesResult.error
  }
  if (documentsResult.error) {
    throw documentsResult.error
  }
  if (messagesResult.error) {
    throw messagesResult.error
  }
  if (notificationsResult.error) {
    throw notificationsResult.error
  }
  if (preferencesResult.error) {
    throw preferencesResult.error
  }
  if (favoritesResult.error) {
    throw favoritesResult.error
  }

  const bookingIds = (bookingsResult.data || []).map((booking: any) => booking.id).filter(Boolean)
  const tripPreferencesResult = bookingIds.length
    ? await supabase.from('trip_preferences').select('*').in('booking_id', bookingIds)
    : { data: [], error: null }

  if (tripPreferencesResult.error) {
    throw tripPreferencesResult.error
  }

  const privacyValues = await Promise.all(privacyKeys.map((key) => getItem(key)))
  const privacySettings = privacyKeys.reduce<Record<string, string | null>>((acc, key, index) => {
    acc[key] = privacyValues[index]
    return acc
  }, {})

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata,
    },
    profile: profileResult.data ?? null,
    bookings: bookingsResult.data ?? [],
    tripPreferences: tripPreferencesResult.data ?? [],
    routes: routesResult.data ?? [],
    driverDocuments: documentsResult.data ?? [],
    messages: messagesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    travelPreferences: preferencesResult.data ?? null,
    favoriteRoutes: favoritesResult.data ?? [],
    privacySettings,
  }
}
