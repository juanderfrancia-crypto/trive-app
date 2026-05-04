import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface Booking {
  id: string;
  route_id: string;
  passenger_id: string;
  seat_number: number;
  price: number;
  payment_method?: string;
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

  const createBooking = useCallback(async (
    routeId: string,
    passengerId: string,
    seatNumber: number,
    price: number,
    paymentMethod: string = "cash",
    bookingStatus: "confirmed" | "pending" = "confirmed",
    paymentStatus: string = "pending",
    dropoffPoint?: string,
    dropoffPointCustom?: boolean
  ) => {
    try {
      setError(null);
      setLoading(true);

      const bookingData: any = {
        route_id: routeId,
        passenger_id: passengerId,
        seat_number: seatNumber,
        price,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        booking_status: bookingStatus,
      };

      // Solo agregar dropoff_point si existen
      if (dropoffPoint) {
        bookingData.dropoff_point = dropoffPoint;
        bookingData.dropoff_point_custom = dropoffPointCustom ?? false;
      }

      const { data, error: bookingError } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505' || bookingError.message.includes('unique')) {
          const customError = new Error('Este asiento ya fue reservado. Por favor selecciona otro.');
          ;(customError as any).code = 'SEAT_ALREADY_RESERVED';
          throw customError;
        }
        throw bookingError;
      }

      return data;
    } catch (err: any) {
      const message = err.message || "Error creating booking";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reservePendingBookings = useCallback(async (
    routeId: string,
    passengerId: string,
    seatNumbers: number[],
    price: number,
    paymentMethod: string = 'card',
    dropoffPoint?: string,
    dropoffPointCustom?: boolean
  ) => {
    try {
      setError(null);
      setLoading(true);

      const insertRows = seatNumbers.map((seat_number) => {
        const row: any = {
          route_id: routeId,
          passenger_id: passengerId,
          seat_number,
          price,
          payment_method: paymentMethod,
          payment_status: 'pending',
          booking_status: 'pending',
        };
        
        // Solo agregar dropoff_point si existen
        if (dropoffPoint) {
          row.dropoff_point = dropoffPoint;
          row.dropoff_point_custom = dropoffPointCustom ?? false;
        }
        
        return row;
      });

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .insert(insertRows)
        .select();

      if (bookingError) {
        if (bookingError.code === '23505' || bookingError.message.includes('unique')) {
          const customError = new Error('Uno o más asientos ya fueron reservados. Vuelve a seleccionar.');
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
    paymentMethod: string = 'cash'
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase
        .rpc('finalize_bookings_atomic', {
          p_booking_ids: bookingIds,
          p_payment_method: paymentMethod,
        });

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

  const releasePendingBookings = useCallback(async (bookingIds: string[], routeId: string) => {
    try {
      setError(null);
      setLoading(true);

      // ✅ Solo cambiar status a cancelled
      // ✅ El TRIGGER de DB recalculará automáticamente available_seats
      const { data, error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', payment_status: 'expired' })
        .in('id', bookingIds)
        .eq('booking_status', 'pending')
        .select('id');

      if (error) throw error;

      return data;
    } catch (err: any) {
      const message = err.message || 'Error liberando reservas pendientes';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanupExpiredPendingBookings = useCallback(async (routeId: string, lockMinutes = 5) => {
    try {
      const cutoff = new Date(Date.now() - lockMinutes * 60000).toISOString();
      const { data: expiredBookings, error: expiredError } = await supabase
        .from('bookings')
        .select('id')
        .eq('route_id', routeId)
        .eq('booking_status', 'pending')
        .lt('created_at', cutoff);

      if (expiredError) return;

      const expiredIds = (expiredBookings as any[])?.map((booking) => booking.id) || [];
      if (!expiredIds.length) return;

      const { error: releaseError } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', payment_status: 'expired' })
        .in('id', expiredIds);

      if (releaseError) return;

    } catch (_e) {}
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

  const getRouteBookings = useCallback(async (routeId: string, includePending = false) => {
    try {
      setError(null);
      setLoading(true);

      await cleanupExpiredPendingBookings(routeId);

      // ✅ Simplificar la consulta: solo obtener bookings sin JOIN a profiles
      let query = supabase
        .from("bookings")
        .select("id, route_id, passenger_id, seat_number, booking_status, created_at, payment_status, dropoff_point, dropoff_point_custom")
        .eq("route_id", routeId);

      if (includePending) {
        // Include any booking that is not cancelled so seat availability matches DB constraints.
        query = query.neq("booking_status", "cancelled");
      } else {
        query = query.eq("booking_status", "confirmed");
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      const message = err.message || "Error fetching route bookings";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cleanupExpiredPendingBookings]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      setError(null);
      setLoading(true);

      // ✅ Solo cambiar status a cancelled
      // ✅ El TRIGGER de DB recalculará automáticamente available_seats
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ booking_status: "cancelled", payment_status: "refunded" })
        .eq("id", bookingId);

      if (updateError) throw updateError;

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
    createBooking,
    reservePendingBookings,
    finalizePendingBookings,
    releasePendingBookings,
    getPassengerBookings,
    getRouteBookings,
    cancelBooking,
  };
};
