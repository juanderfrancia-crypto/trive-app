import { useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface EarningsData {
  totalEarnings: number;
  thisMonthEarnings: number;
  pendingAmount: number;
  completedTrips: number;
  averagePerTrip: number;
  totalRideHours: number;
}

export interface EarningsTransaction {
  id: string;
  date: string;
  type: 'trip' | 'withdrawal' | 'bonus' | 'refund';
  amount: number;
  description: string;
  tripId?: string;
  bookingId?: string;
  status: 'completed' | 'pending' | 'failed';
}

/**
 * Hook para cargar ganancias REALES del conductor desde Supabase
 * Calcula basado en:
 * - Rutas completadas (routes.status = 'completed')
 * - Bookings confirmados (bookings.payment_status = 'completed')
 * - Bookings pendientes (bookings.payment_status = 'pending')
 */
export const useDriverEarnings = (driverId?: string) => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const STALE_MS = 30_000;

  /**
   * Carga datos de ganancias desde Supabase
   * Consulta:
   * 1. Todas las rutas del conductor
   * 2. Todos los bookings de esas rutas
   * 3. Calcula totales, pendientes, completados
   * 4. Construye historial de transacciones
   */
  const loadEarnings = useCallback(async () => {
    if (!driverId) {
      setError('Driver ID is required');
      return;
    }

    try {
      const work = (async () => {
      const nowTs = Date.now();
      if (loading) return;
      if (inFlightRef.current) return inFlightRef.current;
      if (lastLoadedAtRef.current && nowTs - lastLoadedAtRef.current < STALE_MS) return;

      setLoading(true);
      setError(null);

      // 1️⃣ OBTENER TODAS LAS RUTAS DEL CONDUCTOR
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('id, status, created_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (routesError) {
        throw new Error(`Error loading routes: ${routesError.message}`);
      }

      if (!routes || routes.length === 0) {
        // Sin rutas = sin ganancias
        setEarnings({
          totalEarnings: 0,
          thisMonthEarnings: 0,
          pendingAmount: 0,
          completedTrips: 0,
          averagePerTrip: 0,
          totalRideHours: 0,
        });
        setTransactions([]);
        setLoading(false);
        return;
      }

      // 2️⃣ OBTENER TODOS LOS BOOKINGS DE ESAS RUTAS
      const routeIds = routes.map((r) => r.id);
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, route_id, price, payment_status, created_at')
        .in('route_id', routeIds);

      if (bookingsError) {
        throw new Error(`Error loading bookings: ${bookingsError.message}`);
      }

      // 3️⃣ CALCULAR ESTADÍSTICAS
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Ganancias completadas (REALES = dinero que entra)
      const totalEarnings = bookings
        ?.filter((b) => b.payment_status === 'completed')
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      // Ganancias de este mes
      const thisMonthEarnings = bookings
        ?.filter(
          (b) =>
            b.payment_status === 'completed' &&
            new Date(b.created_at) >= thisMonth
        )
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      // Ganancias pendientes (esperando pago)
      const pendingAmount = bookings
        ?.filter((b) => b.payment_status === 'pending')
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      // Viajes completados
      const completedTrips = routes
        ?.filter((r) => r.status === 'completed')
        .length || 0;

      // Promedio por viaje
      const averagePerTrip = completedTrips > 0
        ? Math.round(totalEarnings / completedTrips)
        : 0;

      // Horas totales (estimado: 45 min por viaje en promedio)
      const totalRideHours = Math.round((completedTrips * 45) / 60);

      // 4️⃣ CONSTRUIR HISTORIAL DE TRANSACCIONES
      const transactionsList: EarningsTransaction[] = [];

      // Agregar cada booking completado como una transacción
      bookings?.forEach((booking) => {
        if (booking.payment_status === 'completed') {
          const route = routes.find((r) => r.id === booking.route_id);
          transactionsList.push({
            id: booking.id,
            date: new Date(booking.created_at).toISOString().split('T')[0],
            type: 'trip',
            amount: booking.price,
            description: `Viaje completado - Booking ${booking.id.substring(0, 8)}`,
            bookingId: booking.id,
            tripId: booking.route_id,
            status: 'completed',
          });
        } else if (booking.payment_status === 'pending') {
          const route = routes.find((r) => r.id === booking.route_id);
          transactionsList.push({
            id: booking.id,
            date: new Date(booking.created_at).toISOString().split('T')[0],
            type: 'trip',
            amount: booking.price,
            description: `Viaje pendiente de pago - Booking ${booking.id.substring(0, 8)}`,
            bookingId: booking.id,
            tripId: booking.route_id,
            status: 'pending',
          });
        }
      });

      // Ordenar por fecha descendente
      transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 5️⃣ ACTUALIZAR STATE
        setEarnings({
        totalEarnings,
        thisMonthEarnings,
        pendingAmount,
        completedTrips,
        averagePerTrip,
        totalRideHours,
      });

        setTransactions(transactionsList);
        lastLoadedAtRef.current = Date.now();
      })();

      inFlightRef.current = work;
      await work;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in useDriverEarnings:', errorMessage);
      setError(errorMessage);
    } finally {
      inFlightRef.current = null;
      setLoading(false);
    }
  }, [driverId]);

  return {
    earnings,
    transactions,
    loading,
    error,
    loadEarnings,
    refetch: loadEarnings,
  };
};
