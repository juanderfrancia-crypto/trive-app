import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { withTimeout } from "../utils/withTimeout";

// Efectivo o transferencia directa entre pasajero y conductor. Trive no retiene pagos.
export type PaymentMethod = 'cash' | 'transfer';

export interface Booking {
  id: string;
  route_id: string;
  passenger_id: string;
  seat_number: number;
  price: number;
  payment_method?: string;
  // Código TRV-XXXXXX generado por el servidor. Aún no está en los tipos generados.
  reservation_code?: string | null;
  payment_status: string;
  booking_status: string;
  notes?: string;
  dropoff_point?: string;
  dropoff_point_custom?: boolean;
  created_at: string;
  updated_at: string;
}

export const useBookings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El servidor fija el precio desde la ruta y crea las reservas pendientes.
  const reservePendingBookings = useCallback(async (
    routeId: string,
    seatNumbers: number[],
    paymentMethod: PaymentMethod = 'cash',
    dropoffPoint?: string,
    dropoffPointCustom?: boolean
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: bookingError } = await withTimeout(
        Promise.resolve(supabase.rpc('reserve_seats', {
          p_route_id: routeId,
          p_seat_numbers: seatNumbers,
          p_payment_method: paymentMethod,
          p_dropoff_point: dropoffPoint ?? undefined,
          p_dropoff_custom: dropoffPointCustom ?? false,
        })),
        12000
      );

      if (bookingError) {
        if (bookingError.code === '23505') {
          const customError = new Error(bookingError.message);
          ;(customError as any).code = 'SEAT_ALREADY_RESERVED';
          throw customError;
        }
        throw bookingError;
      }

      return (data as Booking[]) || [];
    } catch (err: any) {
      const message = err.message || 'Error reservando asientos';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const finalizePendingBookings = useCallback(async (
    bookingIds: string[],
    paymentMethod: PaymentMethod = 'cash'
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await withTimeout(
        Promise.resolve(supabase.rpc('finalize_bookings_atomic', {
          p_booking_ids: bookingIds,
          p_payment_method: paymentMethod,
        })),
        15000
      );

      if (error) throw error;

      const result = data?.[0];

      if (!result?.success) {
        const errorMsg = result?.message || 'Error confirmando bookings';
        const customError = new Error(errorMsg);
        (customError as any).code = 'BOOKING_FAILED';
        throw customError;
      }

      return {
        success: result.success,
        message: result.message,
        updated_bookings_count: result.updated_bookings_count,
        remaining_seats: result.remaining_seats,
      };
    } catch (err: any) {
      const message = err.message || 'Error confirmando reserva';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const releasePendingBookings = useCallback(async (bookingIds: string[]) => {
    try {
      setError(null);
      setLoading(true);

      for (const bookingId of bookingIds) {
        const { error: releaseError } = await supabase.rpc('cancel_booking', {
          p_booking_id: bookingId,
          p_reason: 'Reserva liberada por el pasajero',
        });
        if (releaseError) throw releaseError;
      }

      return bookingIds.map((id) => ({ id }));
    } catch (err: any) {
      const message = err.message || 'Error liberando reservas pendientes';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPassengerBookings = useCallback(async (passengerId: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`*, routes:route_id(*)`)
        .eq("passenger_id", passengerId)
        .not("booking_status", "eq", "pending")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      const message = err.message || "Error fetching bookings";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Devuelve los asientos ocupados como filas { seat_number }. No expone a otros pasajeros.
  const getRouteBookings = useCallback(async (routeId: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase.rpc('route_occupied_seats', {
        p_route_id: routeId,
      });

      if (fetchError) throw fetchError;
      return ((data as number[]) || []).map((seat_number) => ({ seat_number }));
    } catch (err: any) {
      const message = err.message || "Error fetching route bookings";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      setError(null);
      setLoading(true);

      const { error: cancelError } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
      });

      if (cancelError) throw cancelError;

      return { id: bookingId };
    } catch (err: any) {
      const message = err.message || "Error cancelling booking";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    reservePendingBookings,
    finalizePendingBookings,
    releasePendingBookings,
    getPassengerBookings,
    getRouteBookings,
    cancelBooking,
  };
};
