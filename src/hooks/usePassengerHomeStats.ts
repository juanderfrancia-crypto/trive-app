import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface PassengerHomeStats {
  spentThisMonth: number;
  tripsThisMonth: number;
  nextTripTime: string | null;
}

/**
 * Hook para HomeScreen del pasajero:
 * - Gastado este mes (solo bookings completados y pagados en el mes actual)
 * - Próximo viaje (booking futuro con status confirmado/pending)
 */
export const usePassengerHomeStats = (passengerId?: string) => {
  const [stats, setStats] = useState<PassengerHomeStats>({ spentThisMonth: 0, tripsThisMonth: 0, nextTripTime: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!passengerId) {
      setStats({ spentThisMonth: 0, tripsThisMonth: 0, nextTripTime: null });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      console.log('🔍 [HomeStats] Buscando bookings para pasajero:', passengerId);
      console.log('📅 Mes actual:', { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() });
      
      // 1️⃣ BOOKINGS CON DEPARTURE TIME (de la ruta asociada)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, price, booking_status, payment_status, created_at, routes(departure_time)')
        .eq('passenger_id', passengerId);
        
      console.log('📊 Bookings encontrados:', bookings?.length || 0);
      console.log('📋 Datos raw:', bookings);
      
      if (bookingsError) {
        console.error('❌ Error en query:', bookingsError);
        throw new Error(bookingsError.message);
      }
      
      // Transformar datos: routes viene como nested object
      const bookingsWithDeparture = (bookings || []).map(b => ({
        ...b,
        departure_time: (b.routes as any)?.departure_time || null
      }));
      
      // Filtrar viajes de este mes por departure_time (no created_at)
      const thisMonthBookings = bookingsWithDeparture.filter(b => {
        if (!b.departure_time) return false;
        const departureDate = new Date(b.departure_time);
        return departureDate >= monthStart && departureDate < monthEnd;
      });
      
      console.log('📆 Bookings este mes:', thisMonthBookings.length, thisMonthBookings);
      
      // Gastado este mes: bookings completados y pagados
      const spentThisMonth = thisMonthBookings
        .filter(b => b.booking_status === 'completed' && b.payment_status === 'completed')
        .reduce((sum, b) => sum + (b.price || 0), 0);
      
      // Viajes este mes: viajes cuya fecha ya pasó (completados o con fecha vencida)
      const completedTrips = thisMonthBookings
        .filter(b => {
          const departureDate = new Date(b.departure_time);
          const isCompleted = b.booking_status === 'completed' || departureDate < now;
          console.log(`  - Booking ${b.id}: status=${b.booking_status}, departure=${departureDate.toISOString()}, isCompleted=${isCompleted}`);
          return isCompleted;
        });
      
      const tripsThisMonth = completedTrips.length;
      
      console.log('✅ Viajes completados este mes:', tripsThisMonth);
      console.log('💰 Gastado este mes:', spentThisMonth);
      
      // Próximo viaje: bookings confirmados/pendientes en el futuro
      const futureBookings = bookingsWithDeparture
        .filter(b => b.departure_time && ['confirmed', 'pending'].includes(b.booking_status) && new Date(b.departure_time) > now)
        .sort((a, b) => new Date(a.departure_time!).getTime() - new Date(b.departure_time!).getTime());
      const nextTripTime = futureBookings && futureBookings.length > 0
        ? new Date(futureBookings[0].departure_time!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : null;
      
      setStats({ spentThisMonth, tripsThisMonth, nextTripTime });
      setLoading(false);
    } catch (err) {
      console.error('🚨 Error en usePassengerHomeStats:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [passengerId]);

  useEffect(() => {
    loadStats();
  }, [passengerId, loadStats]);

  return { stats, loading, error, refetch: loadStats };
};
