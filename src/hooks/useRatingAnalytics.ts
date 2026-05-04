/**
 * Hook for rating analytics and statistics
 * Used by AdminDashboard for insights
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface RatingStats {
  total_reviews: number;
  average_rating: number;
  distribution: {
    five_stars: number;
    four_stars: number;
    three_stars: number;
    two_stars: number;
    one_star: number;
  };
  top_rated_drivers: Array<{
    driver_id: string;
    driver_name: string;
    average_rating: number;
    review_count: number;
  }>;
  lowest_rated_drivers: Array<{
    driver_id: string;
    driver_name: string;
    average_rating: number;
    review_count: number;
  }>;
  recent_reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    driver_name: string;
    passenger_name: string;
  }>;
}

export const useRatingAnalytics = () => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all rating statistics
   */
  const fetchRatingStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          routes(driver_id),
          passenger_id,
          profiles(name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (reviewsError) throw reviewsError;

      // Calculate distribution
      const distribution = {
        five_stars: 0,
        four_stars: 0,
        three_stars: 0,
        two_stars: 0,
        one_star: 0,
      };

      let totalRating = 0;
      reviews?.forEach(review => {
        const rating = Math.round(review.rating);
        if (rating === 5) distribution.five_stars++;
        else if (rating === 4) distribution.four_stars++;
        else if (rating === 3) distribution.three_stars++;
        else if (rating === 2) distribution.two_stars++;
        else if (rating === 1) distribution.one_star++;
        totalRating += review.rating;
      });

      const averageRating = reviews && reviews.length > 0
        ? parseFloat((totalRating / reviews.length).toFixed(2))
        : 0;

      // Get top rated drivers
      const { data: drivers, error: driversError } = await supabase
        .from('drivers')
        .select('id')
        .order('average_rating', { ascending: false })
        .limit(10);

      if (driversError) throw driversError;

      // Get driver details with ratings
      const topRatedDrivers: RatingStats['top_rated_drivers'] = [];
      const lowestRatedDrivers: RatingStats['lowest_rated_drivers'] = [];

      if (drivers && drivers.length > 0) {
        const { data: driverDetails, error: detailsError } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            rating
          `)
          .in('role', ['driver'])
          .order('rating', { ascending: false });

        if (!detailsError && driverDetails) {
          driverDetails
            .filter(d => d.rating && d.rating > 0)
            .slice(0, 5)
            .forEach(driver => {
              topRatedDrivers.push({
                driver_id: driver.id,
                driver_name: driver.name || 'Unknown',
                average_rating: driver.rating || 0,
                review_count: 0, // Would need separate query to get accurate count
              });
            });

          driverDetails
            .filter(d => d.rating && d.rating > 0)
            .reverse()
            .slice(0, 5)
            .forEach(driver => {
              lowestRatedDrivers.push({
                driver_id: driver.id,
                driver_name: driver.name || 'Unknown',
                average_rating: driver.rating || 0,
                review_count: 0,
              });
            });
        }
      }

      // Get recent reviews formatted
      const recentReviews = (reviews || [])
        .slice(0, 10)
        .map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment || '',
          created_at: review.created_at,
          driver_name: 'Driver',
          passenger_name: (Array.isArray(review.profiles) && review.profiles[0]?.name) ? review.profiles[0].name : (review.profiles as any)?.name || 'Passenger',
        }));

      setStats({
        total_reviews: reviews?.length || 0,
        average_rating: averageRating,
        distribution,
        top_rated_drivers: topRatedDrivers,
        lowest_rated_drivers: lowestRatedDrivers,
        recent_reviews: recentReviews,
      });
    } catch (err) {
      console.error('Error fetching rating stats:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get rating distribution percentage
   */
  const getRatingDistributionPercent = useCallback((rating: keyof RatingStats['distribution']) => {
    if (!stats || stats.total_reviews === 0) return 0;
    return Math.round((stats.distribution[rating] / stats.total_reviews) * 100);
  }, [stats]);

  /**
   * Get drivers below threshold for review
   */
  const getDriversNeedingReview = useCallback(async (threshold: number = 3.0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, rating')
        .eq('role', 'driver')
        .lt('rating', threshold)
        .order('rating', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching drivers for review:', error);
      return [];
    }
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchRatingStats();
  }, [fetchRatingStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchRatingStats,
    getRatingDistributionPercent,
    getDriversNeedingReview,
  };
};
