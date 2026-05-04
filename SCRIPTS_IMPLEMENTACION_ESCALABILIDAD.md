# 🔧 SCRIPTS PARA IMPLEMENTAR CAMBIOS - TRIVE BACKEND

## PRIORIDAD 1: Hoy (Ejecutar en Supabase SQL Editor)

### 1. Agregar Índices Faltantes

```sql
-- ============================================================================
-- PASO 1: ÍNDICES CRÍTICOS
-- ============================================================================
-- Ejecutar en Supabase SQL Editor

-- Índice para búsqueda de rutas disponibles
CREATE INDEX IF NOT EXISTS idx_routes_status_departure 
ON routes(status, departure_time DESC) 
WHERE status = 'scheduled';

-- Índice para filtrar bookings por estado
CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
ON bookings(booking_status, created_at DESC) 
WHERE booking_status != 'cancelled';

-- Índice para marcar mensajes como leído
CREATE INDEX IF NOT EXISTS idx_messages_read_time 
ON messages(is_read, created_at DESC) 
WHERE is_read = false;

-- Índice compuesto para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, is_read, created_at DESC);

-- Índice para bookings por dropoff
CREATE INDEX IF NOT EXISTS idx_bookings_dropoff_route 
ON bookings(route_id, dropoff_point) 
WHERE booking_status = 'confirmed';

-- Verificar que los índices existan
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
```

---

### 2. Limpiar Typing Indicators Automáticamente

```sql
-- ============================================================================
-- PASO 2: LIMPIAR TYPING INDICATORS (Auto-cleanup)
-- ============================================================================

-- Función para limpiar typing indicators viejos
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  -- Eliminar typing indicators más viejos de 1 minuto
  DELETE FROM typing_indicators 
  WHERE created_at < NOW() - INTERVAL '1 minute';
  
  -- Log (opcional)
  INSERT INTO activity_log (action, details, created_at)
  VALUES ('cleanup_typing', 'Deleted old typing indicators', NOW())
  ON CONFLICT DO NOTHING;
END
$$ LANGUAGE plpgsql;

-- Crear job para ejecutar cada 5 minutos (requiere pg_cron extension)
-- Si tu Supabase tiene pg_cron habilitado:
SELECT cron.schedule('cleanup-typing-indicators', '*/5 * * * *', 'SELECT cleanup_old_typing_indicators()');

-- Si NO tienes pg_cron, ejecutar manualmente cada 5 minutos desde backend:
-- En Node.js: setInterval(() => supabase.rpc('cleanup_old_typing_indicators'), 300000)

-- Verificar que la función existe
SELECT proname FROM pg_proc WHERE proname = 'cleanup_old_typing_indicators';
```

---

### 3. Limpiar Notifications Viejas (90 días)

```sql
-- ============================================================================
-- PASO 3: LIMPIAR NOTIFICATIONS VIEJAS
-- ============================================================================

-- Eliminar notificaciones más viejas de 90 días (ahora)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Crear función para limpiar automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Vacío después de delete para liberar espacio
  VACUUM ANALYZE notifications;
END
$$ LANGUAGE plpgsql;

-- Ejecutar diariamente a las 2 AM (requiere pg_cron)
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications()');

-- Si no tienes pg_cron, crear desde backend (Node.js, ejecutar 1x/día):
// schedule con node-cron o node-schedule
const schedule = require('node-schedule');
schedule.scheduleJob('0 2 * * *', () => {
  supabase.rpc('cleanup_old_notifications');
});

-- Verificar espacio liberado después
SELECT pg_size_pretty(pg_total_relation_size('notifications'));
```

---

### 4. Crear Tabla de Rate Limiting (Preparación)

```sql
-- ============================================================================
-- PASO 4: TABLA PARA RATE LIMITING
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_user_created ON rate_limit_log(user_id, created_at DESC);

-- RPC para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint VARCHAR,
  p_limit_requests INT,
  p_window_seconds INT
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INT,
  reset_seconds INT
) AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMP;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Contar requests en la ventana
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > v_window_start;
  
  -- Si no excedió límite, registrar e permitir
  IF v_count < p_limit_requests THEN
    INSERT INTO rate_limit_log (user_id, endpoint) 
    VALUES (p_user_id, p_endpoint);
    
    RETURN QUERY SELECT 
      true::BOOLEAN,
      (p_limit_requests - v_count - 1)::INT,
      EXTRACT(EPOCH FROM (MAX(created_at) + (p_window_seconds || ' seconds')::INTERVAL - NOW()))::INT
    FROM rate_limit_log
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
  ELSE
    -- Excedió límite
    RETURN QUERY SELECT 
      false::BOOLEAN,
      0::INT,
      EXTRACT(EPOCH FROM (MAX(created_at) + (p_window_seconds || ' seconds')::INTERVAL - NOW()))::INT
    FROM rate_limit_log
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
  END IF;
END
$$ LANGUAGE plpgsql;
```

---

## PRIORIDAD 2: Mañana

### 5. Refactor getChatContactsForUser (Eliminar N+1)

```typescript
// ============================================================================
// ARCHIVO: src/services/messages.ts
// REEMPLAZAR: getChatContactsForUser function
// ============================================================================

export const getChatContactsForUser = async (userId: string): Promise<ChatContact[]> => {
  try {
    // ✅ NUEVA VERSIÓN: Usar JOIN en lugar de múltiples queries

    // 1️⃣ COMO PASAJERO: Obtener conductores de tus bookings con UN SOLO JOIN
    const { data: passengerContacts, error: passengerError } = await supabase
      .from('bookings')
      .select(`
        route_id,
        routes!inner(
          driver_id,
          origin,
          destination,
          driver:profiles!routes_driver_id_fkey(
            id,
            name,
            avatar_url
          )
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (passengerError) throw passengerError;

    const contactsMap = new Map<string, ChatContact>();

    // Procesar contactos como pasajero
    for (const booking of passengerContacts || []) {
      if (booking.routes?.driver?.[0]) {
        const driver = booking.routes.driver[0];
        const key = `driver-${driver.id}`;
        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            user_id: driver.id,
            name: driver.name || 'Conductor',
            avatar_url: driver.avatar_url,
            relation: 'driver',
            description: `${booking.routes.origin} → ${booking.routes.destination}`,
          });
        }
      }
    }

    // 2️⃣ COMO CONDUCTOR: Obtener pasajeros de tus rutas CON UN SOLO JOIN
    const { data: driverContacts, error: driverError } = await supabase
      .from('routes')
      .select(`
        id,
        bookings!inner(
          passenger_id,
          passenger:profiles!bookings_passenger_id_fkey(
            id,
            name,
            avatar_url
          )
        )
      `)
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (driverError) throw driverError;

    // Procesar contactos como conductor
    for (const route of driverContacts || []) {
      for (const booking of route.bookings || []) {
        if (booking.passenger?.[0]) {
          const passenger = booking.passenger[0];
          const key = `passenger-${passenger.id}`;
          if (!contactsMap.has(key)) {
            contactsMap.set(key, {
              user_id: passenger.id,
              name: passenger.name || 'Pasajero',
              avatar_url: passenger.avatar_url,
              relation: 'passenger',
              description: 'Pasajero de tus viajes',
            });
          }
        }
      }
    }

    return Array.from(contactsMap.values()).slice(0, 20);
  } catch (err: any) {
    console.error('Error fetching chat contacts:', err);
    throw err;
  }
};
```

---

### 6. Implementar Paginación en Mensajes

```typescript
// ============================================================================
// ARCHIVO: src/services/messages.ts
// REEMPLAZAR: getConversation function con cursor-based pagination
// ============================================================================

export const getConversation = async (
  userId: string,
  otherUserId: string,
  cursorSequenceNumber?: number,
  limit = 50
): Promise<Message[]> => {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
      )
      .order('sequence_number', { ascending: false }) // Más recientes primero

    // Si hay cursor, traer mensajes anteriores (más viejos)
    if (cursorSequenceNumber) {
      query = query.lt('sequence_number', cursorSequenceNumber);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;

    // Invertir para mostrar en orden cronológico
    const messages = (data || []).reverse();

    // Marcar como leídos (solo mensajes que recibí de otherUserId)
    const unreadMessages = messages.filter(
      (m) => m.to_user_id === userId && !m.is_read
    );
    if (unreadMessages.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in(
          'id',
          unreadMessages.map((m) => m.id)
        );
    }

    return messages;
  } catch (err: any) {
    console.error('Error fetching conversation:', err);
    throw err;
  }
};

// ✅ USO EN COMPONENTE
// const [messages, setMessages] = useState<Message[]>([]);
// const [cursor, setCursor] = useState<number | undefined>();
// const [hasMore, setHasMore] = useState(true);
//
// const loadOlderMessages = async () => {
//   if (!cursor) return;
//   const older = await getConversation(userId, otherUserId, cursor, 50);
//   if (older.length < 50) setHasMore(false);
//   setCursor(older[0]?.sequence_number);
//   setMessages([...older, ...messages]);
// };
```

---

### 7. Eliminar Polling Redundante en useAvailableRides

```typescript
// ============================================================================
// ARCHIVO: src/hooks/useAvailableRides.ts
// CAMBIO: Eliminar polling redundante
// ============================================================================

export const useAvailableRides = () => {
  const [rides, setRides] = useState<AvailableRide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableRides = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('available_rides')
        .select('*')
        .order('departure_time', { ascending: true })

      if (fetchError) {
        console.error('❌ Error fetching available rides:', fetchError)
        setError(fetchError.message)
        return
      }

      setRides((data as AvailableRide[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Exception fetching rides:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetch initial data ONCE
    fetchAvailableRides()

    // 🔔 REALTIME: Listen to BOOKING changes
    const bookingChannel = supabase
      .channel('available-rides-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('📍 Booking change detected, refetching rides...')
          fetchAvailableRides()
        }
      )
      .subscribe()

    // 🔔 REALTIME: Listen to ROUTE changes
    const routeChannel = supabase
      .channel('available-rides-routes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'routes',
          filter: `status=eq.scheduled`,
        },
        (payload) => {
          console.log('🚗 Route change detected, refetching rides...')
          fetchAvailableRides()
        }
      )
      .subscribe()

    // ❌ ELIMINAR: polling interval NO necesario
    // ❌ ANTES: setInterval(() => fetchAvailableRides(), 3000)

    // Cleanup
    return () => {
      supabase.removeChannel(bookingChannel)
      supabase.removeChannel(routeChannel)
    }
  }, [fetchAvailableRides])

  const refetch = useCallback(() => {
    fetchAvailableRides()
  }, [fetchAvailableRides])

  return {
    rides,
    loading,
    error,
    refetch,
  }
}
```

---

### 8. Agregar Sentry para Error Tracking

```typescript
// ============================================================================
// ARCHIVO: App.tsx o index.ts (punto de entrada)
// ============================================================================

import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'TU_SENTRY_DSN_AQUI',
  debug: true, // Si true, lo verás en consola
  enabled: !__DEV__, // Solo en producción
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0, // 100% de eventos
  
  integrations: [
    new Sentry.Native.Integrations.Breadcrumbs({
      console: true, // Breadcrumbs de console.log
    }),
  ],
});

export function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
      {/* Your app */}
    </Sentry.ErrorBoundary>
  );
}

// Capturar errores manualmente:
try {
  // code
} catch (error) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: 'screen context aquí',
      },
    },
    tags: {
      action: 'booking_confirmation',
    },
  });
}
```

---

## PRIORIDAD 3: Esta Semana

### 9. Implementar SOFT DELETE (en lugar de CASCADE DELETE)

```sql
-- ============================================================================
-- PASO 9: SOFT DELETE EN BOOKINGS
-- ============================================================================

-- Agregar columna deleted_at
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Crear índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_bookings_not_deleted 
ON bookings(id) 
WHERE deleted_at IS NULL;

-- Función para SOFT delete
CREATE OR REPLACE FUNCTION soft_delete_booking(p_booking_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE bookings 
  SET deleted_at = NOW()
  WHERE id = p_booking_id AND deleted_at IS NULL;
END
$$ LANGUAGE plpgsql;

-- ✅ NUEVA QUERY (en lugar de DELETE)
-- SELECT * FROM bookings WHERE deleted_at IS NULL AND route_id = ?;
-- UPDATE bookings SET deleted_at = NOW() WHERE id = ?;

-- ✅ Verificar que funciona
-- SELECT COUNT(*) as active_bookings FROM bookings WHERE deleted_at IS NULL;
-- SELECT COUNT(*) as deleted_bookings FROM bookings WHERE deleted_at IS NOT NULL;
```

---

### 10. Optimizar RLS Policies con Custom JWT Claims

```sql
-- ============================================================================
-- PASO 10: CUSTOM JWT CLAIMS EN RLS (Avitar sub-queries)
-- ============================================================================

-- Nueva policy para drivers (en lugar de sub-query):
DROP POLICY IF EXISTS "Drivers can see bookings for own routes" ON bookings;

CREATE POLICY "Drivers can see bookings for own routes"
  ON bookings
  FOR SELECT
  USING (
    -- En lugar de:
    -- route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
    
    -- Usar claim del JWT:
    route_id = ANY(
      (current_setting('request.jwt.claims', true)::jsonb->>'my_route_ids')::uuid[]
    )
  );

-- Nota: Requiere actualizar JWT en backend cuando se cambian rutas del conductor
-- Ver: Supabase custom claims documentation
```

---

## VERIFICACIÓN POST-CAMBIOS

```sql
-- ============================================================================
-- VERIFICACIÓN: Ejecutar después de aplicar cambios
-- ============================================================================

-- 1. Verificar índices creados
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Verificar tamaño de tablas (antes vs después)
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Verificar funciones RPC creadas
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%cleanup%' OR proname LIKE '%rate_limit%';

-- 4. Verificar que las queries son rápidas
EXPLAIN ANALYZE SELECT * FROM available_rides LIMIT 10;

-- 5. Verificar RLS policies
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## TESTING LOCAL

```bash
# Antes de commitear, probar:

# 1. Build
npm run build

# 2. Type check
npm run tsc

# 3. Lint
npm run lint

# 4. Test queries
npm test -- --testPathPattern=messages

# 5. Load test (simular 100 users)
npx autocannon -c 100 -d 10 https://localhost:3000/api/available-rides

# 6. Enviar a staging
git commit -m "chore: optimize queries & add rate limiting"
git push origin main --force-with-lease
```

---

**Próximos pasos**: Ejecutar PRIORIDAD 1 hoy, reportar resultados.
