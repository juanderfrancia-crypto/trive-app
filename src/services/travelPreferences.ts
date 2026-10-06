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
  smoking_allowed?: boolean | null;
  music_preference?: string | null;
  ac_preference?: string | null;
  luggage_restriction?: string | null;
  notifications_enabled?: boolean | null;
  price_alert_threshold?: number | null;
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
