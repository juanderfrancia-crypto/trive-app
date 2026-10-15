import * as Sentry from "@sentry/react-native";

// DSN del proyecto "react-native" en Sentry (trive-1k) — clave pública de cliente,
// igual que la anon key de Supabase, no es secreta.
const SENTRY_DSN = "https://d987864a8258d4b2d3e1d022267275b6@o4512258297888768.ingest.us.sentry.io/4512259414818817";

export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: 0,
  });
}
