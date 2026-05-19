// Carga Firebase Analytics de forma segura — si los módulos nativos no están
// disponibles (Expo Go, build sin Firebase) simplemente no hace nada.
let _analytics: any = null
try { _analytics = require('@react-native-firebase/analytics').default } catch {}

export const initAnalytics = async () => {
  try {
    if (_analytics) await _analytics().setAnalyticsCollectionEnabled(!__DEV__)
  } catch {}
}

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    if (_analytics) await _analytics().logEvent(eventName, params)
  } catch {}
}

export const trackScreen = async (screenName: string) => {
  try {
    if (_analytics) await _analytics().logScreenView({ screen_name: screenName, screen_class: screenName })
  } catch {}
}

export const setUserId = async (userId: string | null) => {
  try {
    if (_analytics) await _analytics().setUserId(userId)
  } catch {}
}

export const ANALYTICS_EVENTS = {
  USER_SIGNED_UP:       'user_signed_up',
  USER_LOGGED_IN:       'user_logged_in',
  USER_LOGGED_OUT:      'user_logged_out',
  ROUTE_SEARCH:         'route_search',
  ROUTE_FILTERED:       'route_filtered',
  BOOKING_STARTED:      'booking_started',
  BOOKING_COMPLETED:    'booking_completed',
  BOOKING_CANCELLED:    'booking_cancelled',
  PAYMENT_COMPLETED:    'payment_completed',
  PAYMENT_FAILED:       'payment_failed',
  RATING_SUBMITTED:     'rating_submitted',
  ROUTE_CREATED:        'route_created',
  ROUTE_CANCELLED:      'route_cancelled',
  DROPOFF_ADDED:        'dropoff_added',
  ROUTE_STARTED:        'route_started',
  ROUTE_COMPLETED:      'route_completed',
  CHAT_MESSAGE_SENT:    'chat_message_sent',
  CHAT_OPENED:          'chat_opened',
  ERROR_OCCURRED:       'error_occurred',
  NETWORK_ERROR:        'network_error',
}
