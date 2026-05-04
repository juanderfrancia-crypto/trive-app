/**
 * Travel Preferences Service
 * Manages user travel preferences and recommendations
 */

import { supabase } from './supabase';
import { errorHandler, ErrorType } from './errorHandler';

export interface TravelPreferences {
  id?: string;
  user_id: string;
  preferred_times?: string[]; // ["06:00", "07:00", etc]
  preferred_routes?: string[]; // ["Cali->Bogota", etc]
  avoid_routes?: string[];
  smoking_allowed?: boolean;
  music_preference?: 'none' | 'quiet' | 'moderate' | 'loud';
  ac_preference?: 'cold' | 'cool' | 'normal' | 'warm';
  luggage_restriction?: 'strict' | 'moderate' | 'flexible';
  notifications_enabled?: boolean;
  price_alert_threshold?: number;
}

export interface TripPreferences {
  booking_id: string;
  seat_preference?: 'window' | 'aisle' | 'middle' | 'any';
  temperature_preference?: 'cold' | 'cool' | 'normal' | 'warm';
  music_ok?: boolean;
  silence_preferred?: boolean;
}

/**
 * Get user travel preferences
 */
export const getUserTravelPreferences = async (userId: string): Promise<TravelPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('travel_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Return default preferences if not found
      return {
        user_id: userId,
        smoking_allowed: false,
        music_preference: 'quiet',
        ac_preference: 'cool',
        luggage_restriction: 'moderate',
        notifications_enabled: true,
      };
    }

    // Parse JSON fields
    return {
      ...data,
      preferred_times: data.preferred_times ? JSON.parse(data.preferred_times) : [],
      preferred_routes: data.preferred_routes ? JSON.parse(data.preferred_routes) : [],
      avoid_routes: data.avoid_routes ? JSON.parse(data.avoid_routes) : [],
    };
  } catch (error) {
    console.error('Error fetching travel preferences:', error);
    errorHandler.handle(error as Error, ErrorType.DATABASE, undefined, false);
    return null;
  }
};

/**
 * Update user travel preferences
 */
export const updateTravelPreferences = async (
  userId: string,
  preferences: Partial<TravelPreferences>
): Promise<boolean> => {
  try {
    const payload = {
      ...preferences,
      // Convert arrays to JSON
      preferred_times: preferences.preferred_times ? JSON.stringify(preferences.preferred_times) : null,
      preferred_routes: preferences.preferred_routes ? JSON.stringify(preferences.preferred_routes) : null,
      avoid_routes: preferences.avoid_routes ? JSON.stringify(preferences.avoid_routes) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('travel_preferences')
      .upsert({
        user_id: userId,
        ...payload,
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating travel preferences:', error);
    errorHandler.handle(error as Error, ErrorType.DATABASE, undefined, false);
    return false;
  }
};

/**
 * Save preferences for a specific trip
 */
export const saveTripPreferences = async (
  bookingId: string,
  preferences: TripPreferences
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_preferences')
      .upsert({
        ...preferences,
        booking_id: bookingId,
      }, {
        onConflict: 'booking_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving trip preferences:', error);
    errorHandler.handle(error as Error, ErrorType.DATABASE, undefined, false);
    return false;
  }
};

/**
 * Get preferences for a trip
 */
export const getTripPreferences = async (bookingId: string): Promise<TripPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('trip_preferences')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching trip preferences:', error);
    return null;
  }
};

/**
 * Get compatible drivers based on preferences
 */
export const getCompatibleDrivers = async (
  userId: string,
  routeId: string
): Promise<Array<{ driver_id: string; compatibility_score: number }>> => {
  try {
    // Get user preferences
    const userPrefs = await getUserTravelPreferences(userId);
    if (!userPrefs) return [];

    // Get route info
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('driver_id')
      .eq('id', routeId)
      .single();

    if (routeError || !route) return [];

    // Get driver info
    const { data: drivers, error: driversError } = await supabase
      .from('profiles')
      .select('id, smoking_allowed, music_preference, ac_preference')
      .eq('role', 'driver');

    if (driversError || !drivers) return [];

    // Score compatibility
    const compatibilityScores = drivers.map(driver => {
      let score = 100;

      // Deduct points for non-matching preferences
      if (driver.smoking_allowed !== userPrefs.smoking_allowed) score -= 20;
      if (driver.music_preference && userPrefs.music_preference !== driver.music_preference) score -= 10;
      if (driver.ac_preference && userPrefs.ac_preference !== driver.ac_preference) score -= 10;

      return {
        driver_id: driver.id,
        compatibility_score: Math.max(0, score),
      };
    }).sort((a, b) => b.compatibility_score - a.compatibility_score);

    return compatibilityScores;
  } catch (error) {
    console.error('Error getting compatible drivers:', error);
    return [];
  }
};

/**
 * Add route to preferred routes
 */
export const addPreferredRoute = async (
  userId: string,
  origin: string,
  destination: string
): Promise<boolean> => {
  try {
    const prefs = await getUserTravelPreferences(userId);
    if (!prefs) return false;

    const routeString = `${origin}->${destination}`;
    const preferred_routes = prefs.preferred_routes || [];

    if (!preferred_routes.includes(routeString)) {
      preferred_routes.push(routeString);
      return updateTravelPreferences(userId, { preferred_routes });
    }

    return true;
  } catch (error) {
    console.error('Error adding preferred route:', error);
    return false;
  }
};

/**
 * Get recommended routes based on preferences
 */
export const getRecommendedRoutes = async (
  userId: string,
  allRoutes: any[]
): Promise<any[]> => {
  try {
    const prefs = await getUserTravelPreferences(userId);
    if (!prefs) return allRoutes;

    // Filter out avoid_routes
    let filtered = allRoutes;
    if (prefs.avoid_routes && prefs.avoid_routes.length > 0) {
      prefs.avoid_routes.forEach(avoidRoute => {
        const [origin, dest] = avoidRoute.split('->');
        filtered = filtered.filter(
          r => !(r.origin === origin && r.destination === dest)
        );
      });
    }

    // Prioritize preferred_routes
    if (prefs.preferred_routes && prefs.preferred_routes.length > 0) {
      const preferred: any[] = [];
      const others: any[] = [];

      filtered.forEach(route => {
        const routeString = `${route.origin}->${route.destination}`;
        if (prefs.preferred_routes?.includes(routeString)) {
          preferred.push(route);
        } else {
          others.push(route);
        }
      });

      return [...preferred, ...others];
    }

    return filtered;
  } catch (error) {
    console.error('Error getting recommended routes:', error);
    return allRoutes;
  }
};
