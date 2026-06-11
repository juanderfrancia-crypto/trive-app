import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';
import { showError, showSuccess } from '../utils/showError';

interface NegotiationMessage {
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

interface NegotiationPayment {
  id: string;
  request_id: string;
  driver_id: string;
  offer_id: string;
  amount: number;
  status: 'pending' | 'deducted' | 'refunded' | 'cancelled';
  deducted_at: string | null;
}

export const useNegotiationChat = (requestId: string) => {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [payment, setPayment] = useState<NegotiationPayment | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true); // Solo para carga inicial
  const [hasPayment, setHasPayment] = useState(false);
  const [isUserDriver, setIsUserDriver] = useState(false);
  const [tripInfo, setTripInfo] = useState<{ driver_id: string; passenger_id: string } | null>(null);
  const user = useAppStore(state => state.user);

  // 📥 Cargar mensajes iniciales
  const loadMessages = useCallback(async () => {
    setLoadingInitial(true);
    try {
      console.log('🟡[HOOK] Cargando mensajes para requestId:', requestId);
      
      const { data, error } = await supabase
        .from('negotiation_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      console.log('✅[HOOK] Mensajes cargados:', (data || []).length);
    } catch (error) {
      console.error('❌[ERROR] Error cargando mensajes:', error);
      showError('Error al cargar mensajes');
    } finally {
      setLoadingInitial(false);
    }
  }, [requestId]);

  // 💳 Verificar pago de comisión (solo aplica al conductor)
  const checkPayment = useCallback(async (offerId?: string) => {
    try {
      if (!requestId || !user?.id) {
        console.warn('⚠️[HOOK] requestId o user no disponible');
        setHasPayment(false);
        return;
      }

      // Primero, obtener info del viaje para saber quién es el conductor
      const { data: tripData, error: tripError } = await supabase
        .from('airport_requests')
        .select('driver_id, passenger_id')
        .eq('id', requestId)
        .single();

      if (tripError) throw tripError;

      // 💾 Guardar info del viaje para optimistic updates
      setTripInfo(tripData);

      const isDriver = tripData?.driver_id === user.id;
      const isPassenger = tripData?.passenger_id === user.id;

      setIsUserDriver(isDriver);

      console.log('🟡[HOOK] Verificando pago:', { requestId, userId: user.id, isDriver, isPassenger });

      if (!isDriver && !isPassenger) {
        console.warn('⚠️[HOOK] Usuario no es participante del viaje');
        setHasPayment(false);
        return;
      }

      // 🎯 Lógica diferenciada por rol:
      if (isPassenger) {
        // ✅ El PASAJERO NO paga, siempre puede chatear
        console.log('✅[HOOK] Pasajero: puede chatear sin restricción de pago');
        setHasPayment(true);
        setPayment(null);
        return;
      }

      // Si es el CONDUCTOR, verificar pago
      if (isDriver) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('negotiation_payments')
          .select('*')
          .eq('request_id', requestId)
          .eq('driver_id', user.id)
          .eq('status', 'deducted')
          .single();

        if (paymentError && paymentError.code !== 'PGRST116') throw paymentError; // PGRST116 = no rows

        console.log('💳[HOOK] Pago del conductor:', paymentData);
        setPayment(paymentData || null);
        setHasPayment(!!paymentData);

        if (!paymentData) {
          console.log('⚠️[HOOK] Conductor: No hay pago registrado para este viaje');
        } else {
          console.log('✅[HOOK] Conductor: Pago validado, puede chatear');
        }
      }
    } catch (error) {
      console.error('❌[ERROR] Error verificando pago:', error);
      setHasPayment(false);
    }
  }, [requestId, user?.id]);

  // 📤 Enviar mensaje (con validación de pago)
  const sendMessage = useCallback(async (
    messageText: string,
    messageType: 'text' | 'location_pickup' | 'price_update' | 'special_request' = 'text'
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

    try {
      console.log('🟡[HOOK] Enviando mensaje para requestId:', requestId);
      
      // 💫 OPTIMISTIC UPDATE PRIMERO: Agregar mensaje al estado ANTES de enviar
      if (tripInfo && user?.id) {
        const optimisticMessage: NegotiationMessage = {
          id: `temp-${Date.now()}`,
          request_id: requestId,
          driver_id: tripInfo.driver_id,
          passenger_id: tripInfo.passenger_id,
          sent_by_user_id: user.id,
          message_text: messageText,
          message_type: messageType,
          created_at: new Date().toISOString(),
          is_read: false,
        };
        
        console.log('✨[HOOK] Agregando mensaje optimista ANTES de enviar:', optimisticMessage);
        setMessages(prev => [...prev, optimisticMessage]);
      }
      
      // Llamar a la función SQL que valida el pago internamente (sin bloquear UI)
      const { error } = await supabase.rpc('send_negotiation_message', {
        v_request_id: requestId,
        v_message_text: messageText,
        v_message_type: messageType
      });

      if (error) {
        console.error('❌[ERROR] Error enviando mensaje:', error.message);
        
        // Si hay error, remover el optimistic message
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        
        // Mostrar mensaje específico si no hay pago
        if (error.message.includes('comisión')) {
          showError('Debes pagar la comisión antes de chatear');
        } else {
          showError(error.message || 'Error al enviar mensaje');
        }
        return false;
      }

      console.log('✅[HOOK] Mensaje enviado exitosamente a BD');
      showSuccess('Mensaje enviado');
      return true;
    } catch (error) {
      console.error('❌[ERROR] Excepción enviando mensaje:', error);
      
      // Si hay excepción, remover el optimistic message
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      
      showError('Error al enviar mensaje');
      return false;
    }
  }, [requestId, user, tripInfo]);

  // ✅ Marcar mensajes como leídos
  const markMessagesAsRead = useCallback(async () => {
    try {
      console.log('🟡[HOOK] Marcando mensajes como leídos');
      
      const { error } = await supabase.rpc('mark_negotiation_messages_read', {
        v_request_id: requestId
      });

      if (error) throw error;
      
      // Actualizar estado local
      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
      console.log('✅[HOOK] Mensajes marcados como leídos');
    } catch (error) {
      console.error('❌[ERROR] Error marcando mensajes:', error);
    }
  }, [requestId]);

  // 🔄 Suscripción a mensajes en tiempo real
  useEffect(() => {
    if (!requestId) return;

    loadMessages();
    checkPayment();

    // Suscribirse a nuevos mensajes
    const subscription = supabase
      .channel(`negotiation_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          console.log('🔔[REALTIME] Nuevo mensaje:', payload.new);
          setMessages(prev => [...prev, payload.new as NegotiationMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [requestId, loadMessages, checkPayment]);

  // 🗑️ Obtener conteo de mensajes no leídos
  const getUnreadCount = useCallback(() => {
    return messages.filter(msg => !msg.is_read && msg.passenger_id === user?.id).length;
  }, [messages, user?.id]);

  return {
    messages,
    payment,
    loadingInitial, // Solo para carga inicial
    hasPayment,
    isUserDriver,
    sendMessage,
    markMessagesAsRead,
    loadMessages,
    checkPayment,
    getUnreadCount,
  };
};
