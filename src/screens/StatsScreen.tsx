import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/colors';

interface TopRoute {
  route_id: string;
  origin: string;
  destination: string;
  confirmed_bookings: number;
  occupancy_rate: number;
  status: string;
}

interface StatsData {
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  total_rating: number;
  average_rating: number;
  total_passengers: number;
  total_earnings: number;
  total_routes: number;
  scheduled_routes: number;
  in_progress_routes: number;
  average_route_occupancy: number;
  high_satisfaction_pct: number;
  top_routes: TopRoute[];
}

export function StatsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadStats();
      }
    }, [user?.id])
  );

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get driver profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_trips, rating')
        .eq('id', user?.id)
        .single();

      // Get all routes for the user
      const { data: routes } = await supabase
        .from('routes')
        .select('id, origin, destination, total_seats, status')
        .eq('driver_id', user?.id);

      // Get bookings for earnings and passenger count
      const { data: bookings } = await supabase
        .from('bookings')
        .select('route_id, price, payment_status, booking_status')
        .in(
          'route_id',
          routes?.map((r) => r.id) || []
        );

      // Get reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user?.id);

      const completedTrips = routes?.filter((r) => r.status === 'completed').length || 0;
      const cancelledTrips = routes?.filter((r) => r.status === 'cancelled').length || 0;
      const scheduledTrips = routes?.filter((r) => r.status === 'scheduled').length || 0;
      const inProgressTrips = routes?.filter((r) => r.status === 'in_progress').length || 0;
      const confirmedBookings = bookings?.filter((b) => b.booking_status === 'confirmed') || [];
      const totalEarnings = bookings
        ?.filter((b) => b.payment_status === 'completed')
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      const totalRating = reviews?.reduce((sum, r) => sum + r.rating, 0) || 0;
      const averageRating = reviews && reviews.length > 0 ? totalRating / reviews.length : 0;
      const highRatingCount = reviews?.filter((r) => r.rating >= 4).length || 0;
      const highSatisfactionPct = reviews && reviews.length ? Math.round((highRatingCount / reviews.length) * 100) : 0;

      const totalSeats = routes?.reduce((sum, route) => sum + (route.total_seats || 0), 0) || 0;
      const occupancyRate = totalSeats ? Math.round((confirmedBookings.length / totalSeats) * 100) : 0;

      const topRoutes: TopRoute[] = (routes || [])
        .map((route) => {
          const confirmedCount = confirmedBookings.filter((booking) => booking.route_id === route.id).length;
          const occupancy = route.total_seats
            ? Math.round((confirmedCount / route.total_seats) * 100)
            : 0;

          return {
            route_id: route.id,
            origin: route.origin || 'Origen',
            destination: route.destination || 'Destino',
            confirmed_bookings: confirmedCount,
            occupancy_rate: occupancy,
            status: route.status || 'scheduled',
          };
        })
        .sort((a, b) => b.confirmed_bookings - a.confirmed_bookings)
        .slice(0, 3);

      setStats({
        total_trips: profile?.total_trips || routes?.length || 0,
        completed_trips: completedTrips,
        cancelled_trips: cancelledTrips,
        total_rating: totalRating,
        average_rating: Number(averageRating.toFixed(1)),
        total_passengers: bookings?.length || 0,
        total_earnings: totalEarnings,
        total_routes: routes?.length || 0,
        scheduled_routes: scheduledTrips,
        in_progress_routes: inProgressTrips,
        average_route_occupancy: occupancyRate,
        high_satisfaction_pct: highSatisfactionPct,
        top_routes: topRoutes,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      Alert.alert('Error', 'No se pudo cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={18} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={18} color="#FFD700" />
      );
    }

    for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={18} color="#D1D5DB" />
      );
    }

    return stars;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Estadísticas</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Rating Card */}
      <View style={styles.ratingCard}>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingValue}>{stats?.average_rating || 0}</Text>
          <View style={styles.starsContainer}>{renderStarRating(stats?.average_rating || 0)}</View>
          <Text style={styles.ratingLabel}>Calificación Promedio</Text>
          <Text style={styles.satisfactionLabel}>
            {stats?.high_satisfaction_pct || 0}% de reseñas 4★ y 5★
          </Text>
        </View>
        <View style={styles.ratingDivider} />
        <View style={styles.reviewCount}>
          <Text style={styles.reviewCountLabel}>Reseñas</Text>
          <Text style={styles.reviewCountValue}>
            {stats?.total_rating && stats?.average_rating
              ? Math.round(stats.total_rating / stats.average_rating)
              : 0}
          </Text>
        </View>
      </View>

      {/* Trips Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="car-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.statCardValue}>{stats?.total_trips || 0}</Text>
          <Text style={styles.statCardLabel}>Viajes Totales</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
          </View>
          <Text style={styles.statCardValue}>{stats?.completed_trips || 0}</Text>
          <Text style={styles.statCardLabel}>Completados</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.statCardValue}>{stats?.cancelled_trips || 0}</Text>
          <Text style={styles.statCardLabel}>Cancelados</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="people-outline" size={28} color="#FF9500" />
          </View>
          <Text style={styles.statCardValue}>{stats?.total_passengers || 0}</Text>
          <Text style={styles.statCardLabel}>Pasajeros</Text>
        </View>
      </View>

      {/* Operations and Route Usage */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operaciones & Uso</Text>
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Rutas totales</Text>
          <Text style={styles.perfValue}>{stats?.total_routes || 0}</Text>
        </View>
        <View style={styles.perfDivider} />
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Rutas agendadas</Text>
          <Text style={styles.perfValue}>{stats?.scheduled_routes || 0}</Text>
        </View>
        <View style={styles.perfDivider} />
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>En progreso</Text>
          <Text style={styles.perfValue}>{stats?.in_progress_routes || 0}</Text>
        </View>
        <View style={styles.perfDivider} />
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Ocupación promedio</Text>
          <Text style={styles.perfValue}>{stats?.average_route_occupancy || 0}%</Text>
        </View>
      </View>

      {stats?.top_routes && stats.top_routes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rutas más usadas</Text>
          {stats.top_routes.map((route) => (
            <View key={route.route_id} style={styles.routeItem}>
              <Text style={styles.routeTitle}>{route.origin} → {route.destination}</Text>
              <Text style={styles.routeSubtitle}>{route.confirmed_bookings} pasajeros · {route.occupancy_rate}% ocupación</Text>
              <View style={styles.routeStatusBadge}>
                <Text style={styles.routeStatusText}>{route.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Earnings Summary */}
      <View style={styles.card}>
        <View style={styles.earningsHeader}>
          <Ionicons name="wallet-outline" size={28} color={COLORS.primary} />
          <View style={styles.earningsInfo}>
            <Text style={styles.earningsLabel}>Total de Ganancias</Text>
            <Text style={styles.earningsValue}>{formatCurrency(stats?.total_earnings || 0)}</Text>
          </View>
        </View>
      </View>

      {/* Performance Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Desempeño</Text>

        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Tasa de Finalización</Text>
          <Text style={styles.perfValue}>
            {stats?.total_trips
              ? `${Math.round((stats.completed_trips / stats.total_trips) * 100)}%`
              : '0%'}
          </Text>
        </View>

        <View style={styles.perfDivider} />

        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Promedio por Viaje</Text>
          <Text style={styles.perfValue}>
            {stats?.completed_trips
              ? formatCurrency(stats.total_earnings / stats.completed_trips)
              : '$0'}
          </Text>
        </View>

        <View style={styles.perfDivider} />

        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Pasajeros por Viaje</Text>
          <Text style={styles.perfValue}>
            {stats?.total_trips
              ? (stats.total_passengers / stats.total_trips).toFixed(1)
              : '0'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  ratingCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ratingContainer: {
    alignItems: 'center',
    flex: 1,
  },
  ratingValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  satisfactionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  ratingDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  reviewCount: {
    alignItems: 'center',
    flex: 1,
  },
  reviewCountLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewCountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  perfLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  perfValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  perfDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  routeItem: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  routeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  routeStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  routeStatusText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
