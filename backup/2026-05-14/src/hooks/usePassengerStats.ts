import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface PassengerStats {
  totalTrips: number;
  totalSpent: number;
  averagePerTrip: number;
}

/**
 * Hook para cargar estadísticas del pasajero en TIEMPO REAL
 * Calcula basado en:
 * - Bookings completados (bookings.booking_status = 'completed')
 * - Con pago completado (bookings.payment_status = 'completed')
 */
export const usePassengerStats = (passengerId?: string) => {
  const [stats, setStats] = useState<PassengerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const STALE_MS = 30_000;

  const loadStats = useCallback(async () => {
    if (!passengerId) {
      setStats(null);
      return;
    }

    try {
      const now = Date.now();
      if (inFlightRef.current) return inFlightRef.current;
      if (lastLoadedAtRef.current && now - lastLoadedAtRef.current < STALE_MS) return;

      setLoading(true);
      setError(null);

      const work = (async () => {
        // 1️⃣ OBTENER BOOKINGS COMPLETADOS (menos payload + menos CPU)
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('price')
          .eq('passenger_id', passengerId)
          .eq('booking_status', 'completed')
          .eq('payment_status', 'completed');

      if (bookingsError) {
        throw new Error(`Error loading bookings: ${bookingsError.message}`);
      }

        if (!bookings || bookings.length === 0) {
        setStats({
          totalTrips: 0,
          totalSpent: 0,
          averagePerTrip: 0,
        });
        return;
      }

      // 2️⃣ CALCULAR ESTADÍSTICAS
        const totalTrips = bookings.length;
        const totalSpent = bookings.reduce((sum, b: any) => sum + (b.price || 0), 0);
      const averagePerTrip = totalTrips > 0 ? Math.round(totalSpent / totalTrips) : 0;

      setStats({
        totalTrips,
        totalSpent,
        averagePerTrip,
      });
        lastLoadedAtRef.current = Date.now();
      })();

      inFlightRef.current = work;
      await work;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in usePassengerStats:', errorMessage);
      setError(errorMessage);
    } finally {
      inFlightRef.current = null;
      setLoading(false);
    }
  }, [passengerId]);

  // Cargar stats cuando el componente monta o cuando cambia passengerId
  useEffect(() => {
    loadStats();
  }, [passengerId, loadStats]);

  return {
    stats,
    loading,
    error,
    loadStats,
    refetch: loadStats,
  };
};
