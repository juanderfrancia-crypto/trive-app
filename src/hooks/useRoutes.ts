import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { insertNotificationForUser } from "../services/notificationInsert";

// Función para normalizar texto: elimina acentos y convierte a minúsculas
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD') // Descompone caracteres con acento
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
    .toLowerCase()
    .trim();
};

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

// Campos que publish_route acepta en p_route (departure_time en hora local, sin zona).
export type PublishRoutePayload = {
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time?: string;
  price_per_seat: number;
  total_seats: number;
  description?: string;
  pickup_point?: string;
  pickup_point_custom?: boolean;
  route_via?: string;
  dropoff_point?: string;
  vehicle_type: 'auto' | 'taxi' | 'busetica' | 'buseta';
};

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
        const normalizedOrigin = normalizeText(origin);
        query = query.ilike('origin', `%${normalizedOrigin}%`);
      }

      if (destination) {
        const normalizedDestination = normalizeText(destination);
        query = query.ilike('destination', `%${normalizedDestination}%`);
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

      // Post-filtrado en cliente para asegurar búsqueda sin acentos
      let filteredData = (data as Route[]) || [];
      if (origin) {
        const normalizedOrigin = normalizeText(origin);
        filteredData = filteredData.filter(route => 
          normalizeText(route.origin).includes(normalizedOrigin)
        );
      }
      if (destination) {
        const normalizedDestination = normalizeText(destination);
        filteredData = filteredData.filter(route => 
          normalizeText(route.destination).includes(normalizedDestination)
        );
      }

      let normalizedRoutes = await enrichRoutesWithDriverInfo(filteredData);

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
            fallbackQuery = fallbackQuery.ilike('origin', `%${normalizeText(origin)}%`);
          }

          if (destination) {
            fallbackQuery = fallbackQuery.ilike('destination', `%${normalizeText(destination)}%`);
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

          // Post-filtrado en cliente para asegurar búsqueda sin acentos
          let filteredFallbackData = (fallbackData as Route[]) || [];
          if (origin) {
            const normalizedOrigin = normalizeText(origin);
            filteredFallbackData = filteredFallbackData.filter(route => 
              normalizeText(route.origin).includes(normalizedOrigin)
            );
          }
          if (destination) {
            const normalizedDestination = normalizeText(destination);
            filteredFallbackData = filteredFallbackData.filter(route => 
              normalizeText(route.destination).includes(normalizedDestination)
            );
          }

          let normalizedRoutes = await enrichRoutesWithDriverInfo(filteredFallbackData);

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

      const normalizedRoutes = [data as Route];
      const enrichedRoutes = await enrichRoutesWithDriverInfo(normalizedRoutes as Route[]);
      return enrichedRoutes[0] || (data as Route);
    } catch (err: any) {
      const message = err.message || "Error fetching route";
      setError(message);
      return null;
    }
  }, []);

  // El cobro de $2.000 y la creación de la ruta ocurren en una sola transacción
  // del servidor (publish_route). El servidor toma conductor, vehículo y saldo
  // de la sesión; el cliente solo envía los datos del viaje.
  const createRoute = async (routeData: PublishRoutePayload) => {
    try {
      setError(null);

      const { data, error } = await supabase.rpc("publish_route", { p_route: routeData });
      if (error) throw error;

      return data as Route;
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
