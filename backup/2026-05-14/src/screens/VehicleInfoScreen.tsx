import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/colors';

interface VehicleInfo {
  vehicle_make: string;
  vehicle_year: number;
  vehicle_plate: string;
  vehicle_color: string;
}

export function VehicleInfoScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadVehicleInfo();
      }
    }, [user?.id])
  );

  const loadVehicleInfo = async () => {
    try {
      setLoading(true);
      // Get vehicle info from the most recent route
      const { data, error } = await supabase
        .from('routes')
        .select('vehicle_make, vehicle_year, vehicle_plate, vehicle_color')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading vehicle:', error);
        return;
      }

      if (data) {
        setVehicle(data);
      }
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'No se pudo cargar la información del vehículo');
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

  if (!vehicle) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="car-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.noDataText}>No hay información de vehículo</Text>
        <Text style={styles.noDataSubText}>Publica una ruta para registrar tu vehículo</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mi Vehículo</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car-outline" size={48} color={COLORS.primary} />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.label}>Marca</Text>
          <Text style={styles.value}>{vehicle.vehicle_make || 'No especificada'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Año</Text>
          <Text style={styles.value}>{vehicle.vehicle_year || 'No especificado'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Placa</Text>
          <Text style={styles.plateBadge}>{vehicle.vehicle_plate || 'No especificada'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Color</Text>
          <Text style={styles.value}>{vehicle.vehicle_color || 'No especificado'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          (navigation as any).navigate('EditVehicle', { vehicle });
        }}
      >
        <Ionicons name="pencil-outline" size={18} color="white" />
        <Text style={styles.editButtonText}>Editar Información</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  vehicleIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
  },
  infoSection: {
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  plateBadge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    textAlign: 'center',
    letterSpacing: 2,
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 12,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 30,
    gap: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  noDataSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
