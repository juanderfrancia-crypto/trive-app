// 📊 ANALYTICS Y CRASH REPORTING SERVICE
// Inicializa Sentry para reportar crashes y errores

// ⚠️ Sentry DESHABILITADO TEMPORALMENTE - Causa error en Metro
// import * as Sentry from 'sentry-expo';

// 🔑 CONFIG: DSN configurado
const SENTRY_DSN = 'https://390d5c619ef05bdf2e77fa8a2cbcfae2@o4511237159583744.ingest.us.sentry.io/4511237198708736';

/**
 * Inicializa Sentry para crash reporting
 * ⚠️ DESHABILITADO TEMPORALMENTE
 */
export const initSentryAnalytics = () => {
  console.log('ℹ️ Sentry analytics deshabilitado temporalmente (Metro issue)');
  // TODO: Reactivar cuando resolvamos incompatibilidad con Expo
  return;
};

/**
 * Reporta un error manualmente a Sentry
 * ⚠️ DESHABILITADO TEMPORALMENTE
 */
export const reportError = (error: Error, context?: Record<string, any>) => {
  console.error('Error:', error, context);
  // TODO: Reactivar Sentry
  return;
};

/**
 * Reporta un mensaje (no error) para debugging
 * ⚠️ DESHABILITADO TEMPORALMENTE
 */
export const logEvent = (message: string, data?: Record<string, any>) => {
  console.log(`[Event] ${message}`, data);
};

/**
 * Registra eventos importantes de usuario
 * ⚠️ DESHABILITADO TEMPORALMENTE
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, string | number | boolean>
) => {
  console.log(`[Analytics] ${eventName}`, properties);
};

/**
 * Eventos que DEBERÍAS trackear:
 */
export const ANALYTICS_EVENTS = {
  // USER AUTH
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // PASSENGER EVENTS
  ROUTE_SEARCH: 'route_search',
  ROUTE_FILTERED: 'route_filtered',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  RATING_SUBMITTED: 'rating_submitted',

  // DRIVER EVENTS
  ROUTE_CREATED: 'route_created',
  ROUTE_CANCELLED: 'route_cancelled',
  DROPOFF_ADDED: 'dropoff_added',
  ROUTE_STARTED: 'route_started',
  ROUTE_COMPLETED: 'route_completed',

  // CHAT
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_OPENED: 'chat_opened',

  // ERRORS
  ERROR_OCCURRED: 'error_occurred',
  NETWORK_ERROR: 'network_error',
};

/**
 * Ejemplos de uso en tu código:
 *
 * // En SearchScreen.tsx
 * import { trackEvent, ANALYTICS_EVENTS } from '../services/analytics';
 *
 * const handleSearch = (origin, destination) => {
 *   trackEvent(ANALYTICS_EVENTS.ROUTE_SEARCH, {
 *     origin,
 *     destination,
 *     timestamp: new Date().toISOString(),
 *   });
 *   // ... búsqueda
 * }
 *
 * // En BookingFlow.tsx
 * const handleBookingComplete = (routeId, bookingId) => {
 *   trackEvent(ANALYTICS_EVENTS.BOOKING_COMPLETED, {
 *     routeId,
 *     bookingId,
 *   });
 * }
 *
 * // En ScheduledTripsScreen.tsx para capturar errores
 * try {
 *   await cancelBooking(tripId);
 * } catch (error) {
 *   reportError(error, { tripId, action: 'cancel_booking' });
 * }
 */
