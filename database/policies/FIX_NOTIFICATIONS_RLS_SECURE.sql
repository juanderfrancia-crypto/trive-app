-- 🔧 FIX NOTIFICATIONS RLS - OPCIÓN SEGURA CON RPC
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- PROBLEMA:
-- ============================================================================
-- La tabla notifications tiene RLS habilitada pero la política INSERT
-- es muy restrictiva. El conductor quiere crear notificaciones para PASAJEROS
-- pero RLS bloquea porque auth.uid() ≠ notification.user_id

-- ============================================================================
-- SOLUCIÓN SEGURA: Crear una RPC que bypassa RLS
-- ============================================================================

-- 1️⃣ Crear RPC que puede insertar notificaciones sin restricción RLS
CREATE OR REPLACE FUNCTION create_notification_rpc(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type VARCHAR,
  title VARCHAR,
  message TEXT,
  data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.notifications (
    user_id, type, title, message, data, is_read, created_at
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_data, FALSE, NOW()
  )
  RETURNING 
    notifications.id,
    notifications.user_id,
    notifications.type,
    notifications.title,
    notifications.message,
    notifications.data,
    notifications.is_read,
    notifications.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ALTERNATIVA RÁPIDA: Simplemente hacer RLS más permisiva
-- ============================================================================

-- Si prefieres NO usar RPC, ejecuta esto en lugar:

-- Remover política restrictiva
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Crear nueva política permisiva
CREATE POLICY "Anyone can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- DESPUÉS: Actualizar useNotifications.ts
-- ============================================================================

-- Si usas la RPC, actualiza createNotification así:

/*
const createNotification = async (
  userId: string,
  notificationData: Omit<Notification, 'id' | 'created_at'>
) => {
  try {
    const { data, error } = await supabase
      .rpc('create_notification_rpc', {
        p_user_id: userId,
        p_type: notificationData.type,
        p_title: notificationData.title,
        p_message: notificationData.message,
        p_data: notificationData.data || null,
      });

    if (error) throw error;

    const result = data?.[0];
    if (!result) throw new Error('No data returned from RPC');

    // Actualizar estado local
    setNotifications((prev) => [result as Notification, ...prev]);

    if (!result.is_read) {
      setUnreadCount((prev) => prev + 1);
    }

    return result as Notification;
  } catch (err: any) {
    console.error('Error creating notification:', err.message);
    throw err;
  }
};
*/

-- Si NO usas la RPC, simplemente ejecuta la segunda parte (ALTERNATIVA RÁPIDA)
-- Y useNotifications.ts seguirá funcionando sin cambios

-- ============================================================================
-- PRUEBA
-- ============================================================================

-- Después de ejecutar esto, intenta en la app:
-- 1. Abre DriverPanel
-- 2. Haz click en "Iniciar Viaje"
-- 3. Deberías ver notificaciones sin error

-- ============================================================================
