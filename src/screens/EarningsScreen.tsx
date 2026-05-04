import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/colors';

interface EarningsData {
  total_earnings: number;
  completed_trips: number;
  pending_earnings: number;
  total_bookings: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

export function EarningsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadEarningsData();
      }
    }, [user?.id])
  );

  const loadEarningsData = async () => {
    try {
      setLoading(true);

      // Get completed routes and their bookings
      const { data: routes } = await supabase
        .from('routes')
        .select('id, status, price_per_seat')
        .eq('driver_id', user?.id);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('price, payment_status')
        .in(
          'route_id',
          routes?.map((r) => r.id) || []
        );

      // Calculate earnings
      const completedTrips = routes?.filter((r) => r.status === 'completed').length || 0;
      const totalEarnings = bookings
        ?.filter((b) => b.payment_status === 'completed')
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      const totalBookings = bookings?.length || 0;
      const pendingEarnings = bookings
        ?.filter((b) => b.payment_status === 'pending')
        .reduce((sum, b) => sum + (b.price || 0), 0) || 0;

      setEarnings({
        total_earnings: totalEarnings,
        completed_trips: completedTrips,
        pending_earnings: pendingEarnings,
        total_bookings: totalBookings,
      });
    } catch (err) {
      console.error('Error loading earnings:', err);
      Alert.alert('Error', 'No se pudo cargar las ganancias');
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
        <Text style={styles.title}>Ganancias</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Total Earnings Card */}
      <View style={styles.mainCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.label}>Ganancias Totales</Text>
        <Text style={styles.totalAmount}>{formatCurrency(earnings?.total_earnings || 0)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{earnings?.completed_trips || 0}</Text>
            <Text style={styles.statLabel}>Viajes Completados</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{earnings?.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Total de Pasajeros</Text>
          </View>
        </View>
      </View>

      {/* Pending Earnings */}
      {earnings && earnings.pending_earnings > 0 && (
        <View style={styles.card}>
          <View style={styles.pendingHeader}>
            <Ionicons name="time-outline" size={24} color="#FF9500" />
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingLabel}>Ganancias Pendientes</Text>
              <Text style={styles.pendingAmount}>{formatCurrency(earnings.pending_earnings)}</Text>
            </View>
          </View>
          <Text style={styles.pendingSubtext}>
            Los pagos pendientes serán acreditados al completar los viajes
          </Text>
        </View>
      )}

      {/* Earnings Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de Ganancias</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.breakdownLabel}>Completadas</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(earnings?.total_earnings || 0)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={24} color="#FF9500" />
            </View>
            <Text style={styles.breakdownLabel}>Pendientes</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(earnings?.pending_earnings || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Withdrawal Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Retiros</Text>
        <Text style={styles.noDataText}>Saldo disponible: {formatCurrency(earnings?.total_earnings || 0)}</Text>
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => Alert.alert('Retiro', 'Funcionalidad de retiro en desarrollo')}
        >
          <Ionicons name="cash-outline" size={18} color="white" />
          <Text style={styles.withdrawButtonText}>Solicitar Retiro</Text>
        </TouchableOpacity>
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
  mainCard: {
    backgroundColor: `${COLORS.primary}15`,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
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
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  pendingSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 36,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  withdrawButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
