/**
 * Hook for the passenger's own cancellation history.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { errorHandler, ErrorType } from '../services/errorHandler';

export interface CancellationRecord {
  id: string;
  booking_id: string;
  route_id: string;
  passenger_id: string;
  cancelled_at: string;
  cancellation_reason: string;
  origin: string;
  destination: string;
  departure_time: string;
}

export const useCancellationHistory = (userId?: string) => {
  const [history, setHistory] = useState<CancellationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCancellationHistory = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          route_id,
          cancelled_at,
          cancellation_reason,
          routes(
            id,
            origin,
            destination,
            departure_time
          )
        `)
        .eq('passenger_id', userId)
        .not('cancelled_at', 'is', null)
        .order('cancelled_at', { ascending: false });

      if (error) throw error;

      const records: CancellationRecord[] = (data || []).map(booking => {
        const route = Array.isArray(booking.routes) ? booking.routes[0] : booking.routes;
        return {
          id: booking.id,
          booking_id: booking.id,
          route_id: route?.id || '',
          passenger_id: userId,
          cancelled_at: booking.cancelled_at ?? '',
          cancellation_reason: booking.cancellation_reason || 'Sin especificar',
          origin: route?.origin || '',
          destination: route?.destination || '',
          departure_time: route?.departure_time || '',
        };
      });

      setHistory(records);
    } catch (error) {
      console.error('Error fetching cancellation history:', error);
      errorHandler.handle(error as Error, ErrorType.DATABASE, undefined, false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCancellationHistory();
  }, [fetchCancellationHistory]);

  return {
    history,
    loading,
    refetch: fetchCancellationHistory,
  };
};
