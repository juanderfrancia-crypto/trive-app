import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { checkDriverApprovalStatus } from "../services/driverApproval";

export interface Route {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  total_seats: number;
  available_seats: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
  vehicle_color: string;
  vehicle_type?: 'auto' | 'taxi' | 'busetica' | 'buseta';
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  driver_name?: string;
  driver_rating?: number;
  driver_trips?: number;
  driver_avatar_url?: string;
  vehicle_photo_url?: string | null;
}

const isMissingColumnError = (err: any, column: string) => {
  const message = (err?.message || '').toString().toLowerCase();
  return (
    message.includes(`could not find the ${column} column`) ||
    message.includes('schema cache') ||
    message.includes('column does not exist')
  );
};

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichRoutesWithDriverInfo = async (rawRoutes: Route[]) => {
    if (!rawRoutes.length) return rawRoutes;

    const driverIds = Array.from(new Set(rawRoutes.map((route) => route.driver_id)));
    try {
      const [{ data: profiles }, { data: drivers }] = await Promise.all([
        supabase.from('profiles').select('id, name, rating, avatar_url').in('id', driverIds),
        supabase.from('drivers').select('id, average_rating').in('id', driverIds),
      ]);

      const profileMap = new Map(
        (profiles || []).map((item: any) => [item.id, item])
      );
      const driverMap = new Map(
        (drivers || []).map((item: any) => [item.id, item])
      );

      return rawRoutes.map((route) => {
        const profile = profileMap.get(route.driver_id);
        const driver = driverMap.get(route.driver_id);
        return {
          ...route,
          driver_name: route.driver_name ?? profile?.name,
          driver_rating:
            route.driver_rating ?? profile?.rating ?? driver?.average_rating ?? 0,
          driver_avatar_url: profile?.avatar_url ?? undefined,
        } as Route;
      });
    } catch (err) {
      console.warn('Error cargando información del conductor:', err);
      return rawRoutes.map((route) => ({
        ...route,
        driver_rating: route.driver_rating ?? 0,
      } as Route));
    }
  };

  const normalizeRouteAvailability = async (rawRoutes: Route[]) => {
    if (!rawRoutes.length) return rawRoutes;

    const routeIds = Array.from(new Set(rawRoutes.map((route) => route.id)));
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('route_id, seat_number, booking_status')
      .in('route_id', routeIds)
      .neq('booking_status', 'cancelled');

    if (bookingsError) {
      console.warn('Error cargando reservas para calcular puestos disponibles:', bookingsError);
      return rawRoutes;
    }

    const bookingsCount = new Map<string, number>();
    (bookings || []).forEach((booking: any) => {
      bookingsCount.set(
        booking.route_id,
        (bookingsCount.get(booking.route_id) || 0) + 1
      );
    });

    return rawRoutes.map((route) => {
      const reservedCount = bookingsCount.get(route.id) || 0;
      return {
        ...route,
        available_seats: Math.max((route.total_seats || 0) - reservedCount, 0),
      } as Route;
    });
  };

  const fetchRoutes = useCallback(async function fetchRoutesFn(
    origin?: string,
    destination?: string,
    vehicleType?: 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta',
    sortBy: 'departure_time' | 'driver_rating' = 'departure_time',
    ascending: boolean = true,
    limit?: number
  ) {
    try {
      setError(null);
      setLoading(true);

      const isDriverRatingSort = sortBy === 'driver_rating';
      const nowDate = new Date();
      const now = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}T${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}:${String(nowDate.getSeconds()).padStart(2, '0')}`
      
      let query = supabase
        .from('routes')
        .select('*')
        .eq('status', 'scheduled')
        .gt('departure_time', now); // Filtro: solo viajes que no han pasado, usando hora local

      if (vehicleType && vehicleType !== 'all') {
        query = query.eq('vehicle_type', vehicleType);
      }

      if (origin) {
        query = query.ilike('origin', `%${origin}%`);
      }

      if (destination) {
        query = query.ilike('destination', `%${destination}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query.order(
        isDriverRatingSort ? 'departure_time' : sortBy,
        {
          ascending,
        }
      );

      if (fetchError) throw fetchError;

      let normalizedRoutes = await enrichRoutesWithDriverInfo((data as Route[]) || []);
      normalizedRoutes = await normalizeRouteAvailability(normalizedRoutes);

      if (isDriverRatingSort) {
        normalizedRoutes = normalizedRoutes.sort((a, b) => {
          const aRating = a.driver_rating ?? 0;
          const bRating = b.driver_rating ?? 0;
          return ascending ? aRating - bRating : bRating - aRating;
        });
        if (limit) {
          normalizedRoutes = normalizedRoutes.slice(0, limit);
        }
      }

      setRoutes(normalizedRoutes);
      return normalizedRoutes;
    } catch (err: any) {
      const message = err.message || 'Error fetching routes';
      if (
        isMissingColumnError(err, 'vehicle_type') &&
        vehicleType &&
        vehicleType !== 'all'
      ) {
        console.warn('vehicle_type column missing, retrying without vehicle type filter');
        try {
          const isDriverRatingSort = sortBy === 'driver_rating';
          let fallbackQuery = supabase
            .from('routes')
            .select('*')
            .eq('status', 'scheduled');

          if (origin) {
            fallbackQuery = fallbackQuery.ilike('origin', `%${origin}%`);
          }

          if (destination) {
            fallbackQuery = fallbackQuery.ilike('destination', `%${destination}%`);
          }

          if (limit) {
            fallbackQuery = fallbackQuery.limit(limit);
          }

          const { data: fallbackData, error: fallbackFetchError } = await fallbackQuery.order(
            isDriverRatingSort ? 'departure_time' : sortBy,
            {
              ascending,
            }
          );

          if (fallbackFetchError) throw fallbackFetchError;

          let normalizedRoutes = await enrichRoutesWithDriverInfo((fallbackData as Route[]) || []);
          normalizedRoutes = await normalizeRouteAvailability(normalizedRoutes);

          if (isDriverRatingSort) {
            normalizedRoutes = normalizedRoutes.sort((a, b) => {
              const aRating = a.driver_rating ?? 0;
              const bRating = b.driver_rating ?? 0;
              return ascending ? aRating - bRating : bRating - aRating;
            });
            if (limit) {
              normalizedRoutes = normalizedRoutes.slice(0, limit);
            }
          }
          setRoutes(normalizedRoutes);
          return normalizedRoutes;
        } catch (fallbackErr: any) {
          const fallbackMessage = fallbackErr.message || message;
          setError(fallbackMessage);
          return [];
        }
      }

      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getRouteById = useCallback(async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const normalizedRoutes = await normalizeRouteAvailability([data as Route]);
      const enrichedRoutes = await enrichRoutesWithDriverInfo(normalizedRoutes as Route[]);
      return enrichedRoutes[0] || (data as Route);
    } catch (err: any) {
      const message = err.message || "Error fetching route";
      setError(message);
      return null;
    }
  }, []);

  const createRoute = async (routeData: Omit<Route, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null);

      // Validate driver approval status
      const driverId = routeData.driver_id;
      const approvalStatus = await checkDriverApprovalStatus(driverId);

      if (!approvalStatus.canCreateRoutes) {
        let errorMsg = 'No puedes crear rutas. ';
        
        if (!approvalStatus.isDriver) {
          errorMsg += 'Solo los conductores pueden crear rutas.';
        } else if (!approvalStatus.isVerified) {
          errorMsg += 'Tu cuenta de conductor aún no ha sido verificada.';
        } else if (approvalStatus.pendingDocuments.length > 0) {
          errorMsg += `Faltan documentos por aprobar: ${approvalStatus.pendingDocuments.join(', ')}`;
        }

        throw new Error(errorMsg);
      }

      // Create the route
      const { data, error } = await supabase
        .from("routes")
        .insert([routeData])
        .select()
        .single();

      if (error) {
        if (isMissingColumnError(error, 'vehicle_type')) {
          const { vehicle_type, ...routeDataWithoutType } = routeData as any;
          const { data: fallbackData, error: fallbackInsertError } = await supabase
            .from("routes")
            .insert([routeDataWithoutType])
            .select()
            .single();

          if (fallbackInsertError) throw fallbackInsertError;
          return fallbackData;
        }

        throw error;
      }
      return data;
    } catch (err: any) {
      const message = err.message || "Error creating route";
      setError(message);
      throw err;
    }
  };

  return {
    routes,
    loading,
    error,
    fetchRoutes,
    getRouteById,
    createRoute,
  };
};
