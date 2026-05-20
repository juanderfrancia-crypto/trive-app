/**
 * Custom Hook for managing favorite routes
 * Persists favorites to AsyncStorage + Supabase
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { Route } from './useRoutes';

const FAVORITES_KEY = 'trive_favorite_routes';

interface FavoriteRoute {
  route_id: string;
  user_id: string;
  saved_at: string;
  origin: string;
  destination: string;
  route_data?: Route;
}

export const useFavoriteRoutes = (userId?: string) => {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar favoritos al iniciar
  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId]);

  /**
   * Load favorites from local storage + sync with database
   */
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);

      // Primero cargar del cache local
      const cached = await AsyncStorage.getItem(FAVORITES_KEY);
      if (cached) {
        const cachedFavorites = JSON.parse(cached);
        setFavorites(cachedFavorites);
      }

      // Luego sincronizar con base de datos si hay userId
      if (userId) {
        const { data, error } = await supabase
          .from('favorite_routes')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (!error && data) {
          setFavorites(data);
          // Actualizar cache
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Add route to favorites
   */
  const addFavorite = useCallback(
    async (route: Route) => {
      if (!userId) {
        console.warn('User ID required to add favorite');
        return false;
      }

      try {
        const favorite: FavoriteRoute = {
          route_id: route.id,
          user_id: userId,
          saved_at: new Date().toISOString(),
          origin: route.origin,
          destination: route.destination,
          route_data: route,
        };

        // Guardar localmente
        const updated = [...favorites, favorite];
        setFavorites(updated);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));

        // Guardar en BD
        const { error } = await supabase
          .from('favorite_routes')
          .insert([{
            route_id: route.id,
            user_id: userId,
            origin: route.origin,
            destination: route.destination,
          }]);

        if (error) {
          console.error('Error adding favorite to DB:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error adding favorite:', error);
        return false;
      }
    },
    [userId, favorites]
  );

  /**
   * Remove route from favorites
   */
  const removeFavorite = useCallback(
    async (routeId: string) => {
      if (!userId) return false;

      try {
        // Actualizar localmente
        const updated = favorites.filter(f => f.route_id !== routeId);
        setFavorites(updated);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));

        // Eliminar de BD
        const { error } = await supabase
          .from('favorite_routes')
          .delete()
          .eq('route_id', routeId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error removing favorite:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error removing favorite:', error);
        return false;
      }
    },
    [userId, favorites]
  );

  /**
   * Check if route is favorited
   */
  const isFavorite = useCallback(
    (routeId: string) => {
      return favorites.some(f => f.route_id === routeId);
    },
    [favorites]
  );

  /**
   * Get all favorites
   */
  const getFavorites = useCallback(() => {
    return favorites;
  }, [favorites]);

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(async () => {
    if (!userId) return false;

    try {
      setFavorites([]);
      await AsyncStorage.removeItem(FAVORITES_KEY);

      const { error } = await supabase
        .from('favorite_routes')
        .delete()
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error clearing favorites:', error);
      return false;
    }
  }, [userId]);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavorites,
    clearFavorites,
    reloadFavorites: loadFavorites,
  };
};
