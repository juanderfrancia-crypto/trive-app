import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';

export interface Notification {
  id: string;
  user_id: string;
  type: 'booking' | 'trip_update' | 'driver_arrived' | 'trip_completed' | 'review_pending' | 'message';
  title: string;
  message: string;
  data?: {
    route_id?: string;
    booking_id?: string;
    other_user_id?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
}

/** Si `data.audience` viene en el payload, filtra por rol (pasajero vs conductor). Sin campo = visible para todos. */
function notificationIsRelevantForCurrentUser(n: Notification): boolean {
  const role = useAppStore.getState().user?.role;
  const aud = n.data?.audience as string | undefined;
  if (!aud || aud === 'all') return true;
  if (aud === 'passengers_only') return role === 'passenger';
  if (aud === 'drivers_only') return role === 'driver';
  return true;
}

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fuente única de verdad: sincroniza el contador cuando cambia la lista.
  // Evita llamar setState dentro de otro setState (viola las reglas de React).
  useEffect(() => {
    const count = notifications.filter((n) => !n.is_read).length;
    setUnreadCount(count);
    useAppStore.getState().setNotificationUnreadCount(count);
  }, [notifications]);

  // Obtener notificaciones
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setNotifications((data || []).filter(notificationIsRelevantForCurrentUser));
    } catch (err: any) {
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      console.error('Error marking as read:', err.message);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err: any) {
      console.error('Error marking all as read:', err.message);
    }
  };

  // Eliminar notificación
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err: any) {
      console.error('Error deleting notification:', err.message);
    }
  };

  // Eliminar múltiples notificaciones
  const deleteNotifications = async (notificationIds: string[]) => {
    if (!notificationIds.length) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => !notificationIds.includes(n.id)));
    } catch (err: any) {
      console.error('Error deleting selected notifications:', err.message);
      throw err;
    }
  };

  // Eliminar todas las notificaciones del usuario
  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      setNotifications([]);
    } catch (err: any) {
      console.error('Error deleting all notifications:', err.message);
      throw err;
    }
  };

  // Crear notificación
  const createNotification = async (
    userId: string,
    notificationData: Omit<Notification, 'id' | 'created_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();
      if (error) throw error;
      setNotifications((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating notification:', err.message);
      throw err;
    }
  };

  // Escuchar cambios en tiempo real
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let channelRef: any = null;

    const setupSubscription = async () => {
      try {
        await fetchNotifications();
        if (!isMounted) return;

        const channelName = `notifications:${userId}:${Date.now()}`;
        channelRef = supabase.channel(channelName, {
          config: { broadcast: { self: true } },
        });

        channelRef.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (!isMounted) return;

            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              if (!notificationIsRelevantForCurrentUser(newNotif)) return;
              setNotifications((prev) => [newNotif, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Notification;
              setNotifications((prev) =>
                prev.map((n) => (n.id === updated.id ? updated : n))
              );
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as Notification;
              setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
            }
          }
        );

        await channelRef.subscribe();
      } catch (_e) {}
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channelRef) {
        try {
          channelRef.unsubscribe();
          supabase.removeChannel(channelRef);
        } catch (_e) {}
      }
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    deleteAllNotifications,
    createNotification,
  };
};
