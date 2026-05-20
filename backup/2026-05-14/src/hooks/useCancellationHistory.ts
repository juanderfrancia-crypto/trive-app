/**
 * Hook for managing cancellation history and analytics
 * Tracks refunds, reasons, and patterns
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
  refund_amount: number;
  refund_percentage: number;
  origin: string;
  destination: string;
  departure_time: string;
  route_data?: any;
}

export interface CancellationStats {
  total_cancellations: number;
  total_refunded: number;
  average_refund: number;
  cancellation_reasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  refund_distribution: {
    full_refund: number;
    partial_refund: number;
    no_refund: number;
  };
  recent_cancellations: CancellationRecord[];
}

export const useCancellationHistory = (userId?: string) => {
  const [history, setHistory] = useState<CancellationRecord[]>([]);
  const [stats, setStats] = useState<CancellationStats | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch cancellation history for a user
   */
  const fetchCancellationHistory = useCallback(async (passengerId?: string) => {
    if (!passengerId && !userId) return;

    try {
      setLoading(true);
      const targetUserId = passengerId || userId;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          route_id,
          cancelled_at,
          cancellation_reason,
          refund_amount,
          refund_percentage,
          routes(
            id,
            origin,
            destination,
            departure_time,
            driver_id
          )
        `)
        .eq('passenger_id', targetUserId)
        .not('cancelled_at', 'is', null)
        .order('cancelled_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const records: CancellationRecord[] = (data || []).map(booking => {
        const route = Array.isArray(booking.routes) ? booking.routes[0] : booking.routes;
        return {
          id: booking.id,
          booking_id: booking.id,
          route_id: route?.id || '',
          passenger_id: targetUserId || '',
          cancelled_at: booking.cancelled_at,
          cancellation_reason: booking.cancellation_reason || 'Sin especificar',
          refund_amount: booking.refund_amount || 0,
          refund_percentage: booking.refund_percentage || 0,
          origin: route?.origin || '',
          destination: route?.destination || '',
          departure_time: route?.departure_time || '',
          route_data: booking.routes,
        };
      });

      setHistory(records);

      // Calculate stats
      calculateStats(records);
    } catch (error) {
      console.error('Error fetching cancellation history:', error);
      errorHandler.handle(error as Error, ErrorType.DATABASE, undefined, false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Calculate cancellation statistics
   */
  const calculateStats = useCallback((records: CancellationRecord[]) => {
    if (records.length === 0) {
      setStats(null);
      return;
    }

    // Count reasons
    const reasonMap = new Map<string, number>();
    records.forEach(record => {
      const reason = record.cancellation_reason;
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    });

    const cancellation_reasons = Array.from(reasonMap.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / records.length) * 100),
    }));

    // Refund distribution
    let full_refund = 0;
    let partial_refund = 0;
    let no_refund = 0;

    records.forEach(record => {
      if (record.refund_percentage === 100) full_refund++;
      else if (record.refund_percentage > 0) partial_refund++;
      else no_refund++;
    });

    // Calculate totals
    const total_refunded = records.reduce((sum, r) => sum + r.refund_amount, 0);
    const average_refund = total_refunded / records.length;

    setStats({
      total_cancellations: records.length,
      total_refunded,
      average_refund: Math.round(average_refund),
      cancellation_reasons: cancellation_reasons.sort((a, b) => b.count - a.count),
      refund_distribution: {
        full_refund,
        partial_refund,
        no_refund,
      },
      recent_cancellations: records.slice(0, 10),
    });
  }, []);

  /**
   * Get cancellations by date range
   */
  const getCancellationsByDateRange = useCallback(
    async (startDate: Date, endDate: Date) => {
      try {
        const filtered = history.filter(record => {
          const cancelDate = new Date(record.cancelled_at);
          return cancelDate >= startDate && cancelDate <= endDate;
        });
        return filtered;
      } catch (error) {
        console.error('Error filtering cancellations:', error);
        return [];
      }
    },
    [history]
  );

  /**
   * Get cancellations by refund percentage
   */
  const getCancellationsByRefundPercent = useCallback(
    (percentage: number) => {
      return history.filter(r => r.refund_percentage === percentage);
    },
    [history]
  );

  // Load history on mount
  useEffect(() => {
    fetchCancellationHistory();
  }, [userId, fetchCancellationHistory]);

  return {
    history,
    stats,
    loading,
    refetch: fetchCancellationHistory,
    getCancellationsByDateRange,
    getCancellationsByRefundPercent,
  };
};
