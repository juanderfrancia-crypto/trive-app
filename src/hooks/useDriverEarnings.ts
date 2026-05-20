import { useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface MonthlyBalance {
  key: string;           // "2026-05"
  label: string;         // "Mayo 2026"
  earned: number;        // ingresos del mes (viajes completados, no cancelados)
  cancelledAmount: number; // suma de reservas canceladas ese mes
  cancelledCount: number;
  tripsCompleted: number;
  isCurrentMonth: boolean;
}

export interface EarningsData {
  totalEarnings: number;
  thisMonthEarnings: number;
  upcomingAmount: number;
  pendingAmount: number;      // alias de upcomingAmount
  completedTrips: number;
  completedPassengers: number;
  cancelledCount: number;
  averagePerTrip: number;
  totalRideHours: number;
  weeklyBars: number[];
  peakBarIndex: number;
  monthlyBalances: MonthlyBalance[];
}

export interface EarningsTransaction {
  id: string;
  date: string;
  type: 'trip' | 'cancellation' | 'upcoming';
  amount: number;
  description: string;
  tripId?: string;
  bookingId?: string;
  status: 'completed' | 'pending' | 'failed';
}

export const useDriverEarnings = (driverId?: string) => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const STALE_MS = 30_000;

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

        // 1️⃣ RUTAS DEL CONDUCTOR
        const { data: routes, error: routesError } = await supabase
          .from('routes')
          .select('id, status, origin, destination, created_at')
          .eq('driver_id', driverId)
          .order('created_at', { ascending: false });

        if (routesError) throw new Error(routesError.message);

        if (!routes || routes.length === 0) {
          setEarnings({
            totalEarnings: 0, thisMonthEarnings: 0, upcomingAmount: 0,
            pendingAmount: 0, completedTrips: 0, completedPassengers: 0,
            cancelledCount: 0, averagePerTrip: 0, totalRideHours: 0,
            weeklyBars: [0, 0, 0, 0, 0, 0, 0], peakBarIndex: -1,
            monthlyBalances: [],
          });
          setTransactions([]);
          setLoading(false);
          return;
        }

        // 2️⃣ TODOS LOS BOOKINGS
        const routeIds = routes.map((r) => r.id);
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, route_id, price, booking_status, created_at, cancelled_at')
          .in('route_id', routeIds);

        if (bookingsError) throw new Error(bookingsError.message);

        const allBookings = bookings || [];

        // Sets de rutas por estado
        const completedRouteIds = new Set(
          routes.filter((r) => r.status === 'completed').map((r) => r.id)
        );
        const activeRouteIds = new Set(
          routes.filter((r) => !['completed', 'cancelled'].includes(r.status)).map((r) => r.id)
        );
        const routeMap = new Map(routes.map((r) => [r.id, r]));

        // 3️⃣ CLASIFICAR BOOKINGS
        // Ingresos realizados: no cancelados en rutas completadas
        const earnedBookings = allBookings.filter(
          (b) => completedRouteIds.has(b.route_id) && b.booking_status !== 'cancelled'
        );
        // Cancelados (cualquier ruta) — se muestran en historial
        const cancelledBookings = allBookings.filter(
          (b) => b.booking_status === 'cancelled'
        );
        // Próximos: no cancelados en rutas activas
        const upcomingBookings = allBookings.filter(
          (b) => activeRouteIds.has(b.route_id) && b.booking_status !== 'cancelled'
        );

        // 4️⃣ CALCULAR TOTALES
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalEarnings = earnedBookings.reduce((s, b) => s + (b.price || 0), 0);

        const thisMonthEarnings = earnedBookings
          .filter((b) => new Date(b.created_at) >= thisMonth)
          .reduce((s, b) => s + (b.price || 0), 0);

        const upcomingAmount = upcomingBookings.reduce((s, b) => s + (b.price || 0), 0);

        const completedTrips = routes.filter((r) => r.status === 'completed').length;
        const completedPassengers = earnedBookings.length;
        const cancelledCount = cancelledBookings.length;
        const averagePerTrip = completedTrips > 0 ? Math.round(totalEarnings / completedTrips) : 0;
        const totalRideHours = Math.round((completedTrips * 45) / 60);

        // Barras últimos 7 días (basadas en ingresos realizados)
        const pad = (n: number) => String(n).padStart(2, '0');
        const localDateStr = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const rawDays: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          const dayStr = localDateStr(day);
          const dayTotal = earnedBookings
            .filter((b) => localDateStr(new Date(b.created_at)) === dayStr)
            .reduce((s, b) => s + (b.price || 0), 0);
          rawDays.push(dayTotal);
        }
        const maxDay = Math.max(...rawDays);
        const weeklyBars = maxDay > 0
          ? rawDays.map((d) => (d === 0 ? 0 : Math.max(0.08, d / maxDay)))
          : [0, 0, 0, 0, 0, 0, 0];
        const peakBarIndex = maxDay > 0 ? rawDays.indexOf(maxDay) : -1;

        // 5️⃣ BALANCE MENSUAL
        const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const monthlyMap = new Map<string, MonthlyBalance>();

        const getOrCreate = (date: Date): MonthlyBalance => {
          const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
          if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
              key,
              label: date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
              earned: 0,
              cancelledAmount: 0,
              cancelledCount: 0,
              tripsCompleted: 0,
              isCurrentMonth: key === currentMonthKey,
            });
          }
          return monthlyMap.get(key)!;
        };

        earnedBookings.forEach((b) => {
          const entry = getOrCreate(new Date(b.created_at));
          entry.earned += b.price || 0;
          entry.tripsCompleted += 1;
        });

        cancelledBookings.forEach((b) => {
          const entry = getOrCreate(new Date(b.cancelled_at || b.created_at));
          entry.cancelledAmount += b.price || 0;
          entry.cancelledCount += 1;
        });

        const monthlyBalances = Array.from(monthlyMap.values())
          .sort((a, b) => b.key.localeCompare(a.key));

        // 6️⃣ HISTORIAL
        const transactionsList: EarningsTransaction[] = [];

        // Ingresos realizados
        earnedBookings.forEach((b) => {
          const route = routeMap.get(b.route_id);
          const label = route ? `${route.origin} → ${route.destination}` : b.id.substring(0, 8);
          transactionsList.push({
            id: b.id,
            date: new Date(b.created_at).toISOString().split('T')[0],
            type: 'trip',
            amount: b.price || 0,
            description: `Pasajero a bordo · ${label}`,
            bookingId: b.id,
            tripId: b.route_id,
            status: 'completed',
          });
        });

        // Cancelaciones
        cancelledBookings.forEach((b) => {
          const route = routeMap.get(b.route_id);
          const label = route ? `${route.origin} → ${route.destination}` : b.id.substring(0, 8);
          const cancelDate = b.cancelled_at || b.created_at;
          transactionsList.push({
            id: `cancel-${b.id}`,
            date: new Date(cancelDate).toISOString().split('T')[0],
            type: 'cancellation',
            amount: b.price || 0,
            description: `Reserva cancelada · ${label}`,
            bookingId: b.id,
            tripId: b.route_id,
            status: 'failed',
          });
        });

        // Próximos ingresos
        upcomingBookings.forEach((b) => {
          const route = routeMap.get(b.route_id);
          const label = route ? `${route.origin} → ${route.destination}` : b.id.substring(0, 8);
          transactionsList.push({
            id: `upcoming-${b.id}`,
            date: new Date(b.created_at).toISOString().split('T')[0],
            type: 'upcoming',
            amount: b.price || 0,
            description: `Próximo viaje · ${label}`,
            bookingId: b.id,
            tripId: b.route_id,
            status: 'pending',
          });
        });

        transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setEarnings({
          totalEarnings, thisMonthEarnings, upcomingAmount,
          pendingAmount: upcomingAmount,
          completedTrips, completedPassengers, cancelledCount,
          averagePerTrip, totalRideHours, weeklyBars, peakBarIndex,
          monthlyBalances,
        });
        setTransactions(transactionsList);
        lastLoadedAtRef.current = Date.now();
      })();

      inFlightRef.current = work;
      await work;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in useDriverEarnings:', msg);
      setError(msg);
    } finally {
      inFlightRef.current = null;
      setLoading(false);
    }
  }, [driverId]);

  return { earnings, transactions, loading, error, loadEarnings, refetch: loadEarnings };
};
