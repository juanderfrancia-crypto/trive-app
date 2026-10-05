import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';
import { showError, showSuccess } from '../utils/showError';
import type { Tables } from '../types/database.types';

export interface NegotiationMessage {
  id: string;
  request_id: string;
  driver_id: string;
  passenger_id: string;
  sent_by_user_id: string;
  message_text: string;
  message_type: 'text' | 'location_pickup' | 'price_update' | 'special_request';
  created_at: string;
  is_read: boolean;
}

const MESSAGE_TYPES: NegotiationMessage['message_type'][] = ['text', 'location_pickup', 'price_update', 'special_request'];

const toNegotiationMessage = (row: Tables<'negotiation_messages'>): NegotiationMessage => ({
  ...row,
  message_type: MESSAGE_TYPES.find((t) => t === row.message_type) ?? 'text',
  is_read: row.is_read ?? false,
});

/**
 * Hilo de negociación entre un pasajero y un conductor sobre una solicitud.
 * El servidor decide quién puede escribir (send_chat_message); el cliente solo muestra el estado.
 */
export const useNegotiationChat = (requestId: string, driverId: string) => {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const user = useAppStore(state => state.user);
  const isUserDriver = user?.id === driverId;

  // Estado del hilo: abierto si la oferta está pendiente o aceptada y la solicitud sigue activa
  const loadThreadState = useCallback(async () => {
    const [{ data: offer }, { data: request }] = await Promise.all([
      supabase
        .from('airport_offers')
        .select('status')
        .eq('request_id', requestId)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('airport_requests')
        .select('status')
        .eq('id', requestId)
        .maybeSingle(),
    ]);

    const offerActive = offer?.status === 'pending' || offer?.status === 'accepted';
    const requestActive = !!request && request.status !== 'cancelled' && request.status !== 'completed';
    setIsOpen(offerActive && requestActive);
  }, [requestId, driverId]);

  const loadMessages = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const { data, error } = await supabase
        .from('negotiation_messages')
        .select('*')
        .eq('request_id', requestId)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(toNegotiationMessage));
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      showError('Error al cargar mensajes');
    } finally {
      setLoadingInitial(false);
    }
  }, [requestId, driverId]);

  const sendMessage = useCallback(async (
    messageText: string,
    messageType: NegotiationMessage['message_type'] = 'text'
  ) => {
    if (!user) {
      showError('Usuario no autenticado');
      return false;
    }
    if (!messageText.trim()) {
      showError('El mensaje no puede estar vacío');
      return false;
    }
    if (messageText.length > 500) {
      showError('El mensaje es demasiado largo (máx 500 caracteres)');
      return false;
    }

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      request_id: requestId,
      driver_id: driverId,
      passenger_id: '',
      sent_by_user_id: user.id,
      message_text: messageText,
      message_type: messageType,
      created_at: new Date().toISOString(),
      is_read: false,
    }]);

    const { data, error } = await supabase.rpc('send_chat_message', {
      p_request_id: requestId,
      p_driver_id: driverId,
      p_text: messageText,
      p_type: messageType,
    });

    // El servidor devuelve ok=false cuando el mensaje no cumple la política (ej. teléfono antes de aceptar)
    const result = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    if (error || result?.ok === false) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      const serverMessage = result?.message;
      showError((typeof serverMessage === 'string' && serverMessage) || error?.message || 'Error al enviar mensaje');
      await loadThreadState();
      return false;
    }

    setMessages(prev => prev.filter(m => m.id !== tempId));
    showSuccess('Mensaje enviado');
    return true;
  }, [requestId, driverId, user, loadThreadState]);

  const markMessagesAsRead = useCallback(async () => {
    const { error } = await supabase.rpc('mark_chat_thread_read', {
      p_request_id: requestId,
      p_driver_id: driverId,
    });
    if (error) {
      console.error('Error marcando mensajes:', error);
      return;
    }
    setMessages(prev => prev.map(msg =>
      msg.sent_by_user_id !== user?.id ? { ...msg, is_read: true } : msg
    ));
  }, [requestId, driverId, user?.id]);

  useEffect(() => {
    if (!requestId || !driverId) return;

    loadMessages();
    loadThreadState();

    const subscription = supabase
      .channel(`negotiation_${requestId}_${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const incoming = payload.new as NegotiationMessage;
          if (incoming.driver_id !== driverId) return;
          setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [requestId, driverId, loadMessages, loadThreadState]);

  const getUnreadCount = useCallback(() => {
    return messages.filter(msg => !msg.is_read && msg.sent_by_user_id !== user?.id).length;
  }, [messages, user?.id]);

  return {
    messages,
    loadingInitial,
    isOpen,
    isUserDriver,
    sendMessage,
    markMessagesAsRead,
    loadMessages,
    getUnreadCount,
  };
};
