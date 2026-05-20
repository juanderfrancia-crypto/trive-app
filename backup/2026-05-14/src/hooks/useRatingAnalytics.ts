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

      // Query reviews con join de ambos perfiles en una sola llamada
      const [reviewsResult, driverDetailsResult] = await Promise.all([
        supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer_id,
            reviewee_id,
            reviewer:profiles!reviews_reviewer_id_fkey(name),
            reviewee:profiles!reviews_reviewee_id_fkey(name)
          `)
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('profiles')
          .select('id, name, rating')
          .eq('role', 'driver')
          .not('rating', 'is', null)
          .gt('rating', 0)
          .order('rating', { ascending: false }),
      ]);

      if (reviewsResult.error) throw reviewsResult.error;

      const reviews = reviewsResult.data || [];

      // Calcular distribución y promedio
      const distribution = { five_stars: 0, four_stars: 0, three_stars: 0, two_stars: 0, one_star: 0 };
      let totalRating = 0;

      reviews.forEach(review => {
        const r = Math.round(review.rating);
        if (r === 5) distribution.five_stars++;
        else if (r === 4) distribution.four_stars++;
        else if (r === 3) distribution.three_stars++;
        else if (r === 2) distribution.two_stars++;
        else if (r === 1) distribution.one_star++;
        totalRating += review.rating;
      });

      const averageRating = reviews.length > 0
        ? parseFloat((totalRating / reviews.length).toFixed(2))
        : 0;

      // Contar reviews por conductor desde los datos ya cargados
      const reviewCountByDriver = new Map<string, number>();
      reviews.forEach(r => {
        reviewCountByDriver.set(r.reviewee_id, (reviewCountByDriver.get(r.reviewee_id) || 0) + 1);
      });

      // Top y lowest rated usando profiles con role='driver'
      const topRatedDrivers: RatingStats['top_rated_drivers'] = [];
      const lowestRatedDrivers: RatingStats['lowest_rated_drivers'] = [];

      if (!driverDetailsResult.error && driverDetailsResult.data) {
        const withCounts = driverDetailsResult.data.map(d => ({
          driver_id: d.id,
          driver_name: d.name || 'Conductor',
          average_rating: d.rating || 0,
          review_count: reviewCountByDriver.get(d.id) || 0,
        }));

        topRatedDrivers.push(...withCounts.slice(0, 5));
        lowestRatedDrivers.push(...[...withCounts].reverse().slice(0, 5));
      }

      // Reviews recientes con nombres reales
      const recentReviews = reviews.slice(0, 10).map(review => {
        const reviewer = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer;
        const reviewee = Array.isArray(review.reviewee) ? review.reviewee[0] : review.reviewee;
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment || '',
          created_at: review.created_at,
          driver_name: (reviewee as any)?.name || 'Conductor',
          passenger_name: (reviewer as any)?.name || 'Pasajero',
        };
      });

      setStats({
        total_reviews: reviews.length,
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
