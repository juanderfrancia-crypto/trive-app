// 📊 ANALYTICS — solo activo en desarrollo
// Para producción: integrar con Mixpanel, Amplitude, etc.

export const initSentryAnalytics = () => {}

export const reportError = (error: Error, context?: Record<string, any>) => {
  if (__DEV__) console.error('[Error]', error?.message, context)
}

export const logEvent = (message: string, data?: Record<string, any>) => {
  if (__DEV__) console.log(`[Event] ${message}`, data)
}

export const trackEvent = (
  eventName: string,
  properties?: Record<string, string | number | boolean>
) => {
  if (__DEV__) console.log(`[Analytics] ${eventName}`, properties)
}

export const ANALYTICS_EVENTS = {
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  ROUTE_SEARCH: 'route_search',
  ROUTE_FILTERED: 'route_filtered',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  RATING_SUBMITTED: 'rating_submitted',
  ROUTE_CREATED: 'route_created',
  ROUTE_CANCELLED: 'route_cancelled',
  DROPOFF_ADDED: 'dropoff_added',
  ROUTE_STARTED: 'route_started',
  ROUTE_COMPLETED: 'route_completed',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_OPENED: 'chat_opened',
  ERROR_OCCURRED: 'error_occurred',
  NETWORK_ERROR: 'network_error',
}
