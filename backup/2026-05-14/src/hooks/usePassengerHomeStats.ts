import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface PassengerHomeStats {
  spentThisMonth: number;
  nextTripTime: string | null;
}

/**
 * Hook para HomeScreen del pasajero:
 * - Gastado este mes (solo bookings completados y pagados en el mes actual)
 * - Próximo viaje (booking futuro con status confirmado/pending)
 */
export const usePassengerHomeStats = (passengerId?: string) => {
  const [stats, setStats] = useState<PassengerHomeStats>({ spentThisMonth: 0, nextTripTime: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!passengerId) {
      setStats({ spentThisMonth: 0, nextTripTime: null });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // 1️⃣ BOOKINGS DEL MES
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, price, booking_status, payment_status, departure_time, created_at')
        .eq('passenger_id', passengerId);
      if (bookingsError) throw new Error(bookingsError.message);
      // Gastado este mes
      const spentThisMonth = bookings
        ?.filter(b => b.booking_status === 'completed' && b.payment_status === 'completed' && new Date(b.created_at) >= monthStart)
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;
      // Próximo viaje
      const futureBookings = bookings
        ?.filter(b => ['confirmed', 'pending'].includes(b.booking_status) && new Date(b.departure_time) > now)
        .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
      const nextTripTime = futureBookings && futureBookings.length > 0
        ? new Date(futureBookings[0].departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : null;
      setStats({ spentThisMonth, nextTripTime });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [passengerId]);

  useEffect(() => {
    loadStats();
  }, [passengerId, loadStats]);

  return { stats, loading, error, refetch: loadStats };
};
