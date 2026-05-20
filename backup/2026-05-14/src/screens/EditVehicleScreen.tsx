import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/colors';

interface VehicleFormData {
  vehicle_make: string;
  vehicle_year: string;
  vehicle_plate: string;
  vehicle_color: string;
}

export function EditVehicleScreen({ route }: any) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const initialVehicle = route?.params?.vehicle;

  const [formData, setFormData] = useState<VehicleFormData>({
    vehicle_make: initialVehicle?.vehicle_make || '',
    vehicle_year: initialVehicle?.vehicle_year?.toString() || '',
    vehicle_plate: initialVehicle?.vehicle_plate || '',
    vehicle_color: initialVehicle?.vehicle_color || '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicle_make.trim()) {
      newErrors.vehicle_make = 'La marca es requerida';
    }
    if (!formData.vehicle_year.trim()) {
      newErrors.vehicle_year = 'El año es requerido';
    } else if (!/^\d{4}$/.test(formData.vehicle_year)) {
      newErrors.vehicle_year = 'Ingresa un año válido (ej: 2023)';
    }
    if (!formData.vehicle_plate.trim()) {
      newErrors.vehicle_plate = 'La placa es requerida';
    } else if (formData.vehicle_plate.trim().length < 4) {
      newErrors.vehicle_plate = 'La placa debe tener al menos 4 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor completa todos los campos correctamente');
      return;
    }

    try {
      setLoading(true);

      // Update all routes for this driver with the new vehicle info
      const { error } = await supabase
        .from('routes')
        .update({
          vehicle_make: formData.vehicle_make,
          vehicle_year: parseInt(formData.vehicle_year),
          vehicle_plate: formData.vehicle_plate.toUpperCase(),
          vehicle_color: formData.vehicle_color,
          updated_at: new Date(),
        })
        .eq('driver_id', user?.id);

      if (error) {
        throw error;
      }

      Alert.alert('Éxito', 'Información del vehículo actualizada correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Error updating vehicle:', err);
      Alert.alert('Error', 'No se pudo actualizar la información del vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Vehículo</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          {/* Marca */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Marca *</Text>
            <TextInput
              style={[styles.input, errors.vehicle_make && styles.inputError]}
              placeholder="Ej: Nissan, Chevrolet, Toyota"
              value={formData.vehicle_make}
              onChangeText={(text) => {
                setFormData({ ...formData, vehicle_make: text });
                if (errors.vehicle_make) {
                  setErrors({ ...errors, vehicle_make: '' });
                }
              }}
              editable={!loading}
            />
            {errors.vehicle_make && <Text style={styles.errorText}>{errors.vehicle_make}</Text>}
          </View>

          {/* Año */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Año *</Text>
            <TextInput
              style={[styles.input, errors.vehicle_year && styles.inputError]}
              placeholder="Ej: 2023"
              value={formData.vehicle_year}
              onChangeText={(text) => {
                setFormData({ ...formData, vehicle_year: text });
                if (errors.vehicle_year) {
                  setErrors({ ...errors, vehicle_year: '' });
                }
              }}
              keyboardType="numeric"
              maxLength={4}
              editable={!loading}
            />
            {errors.vehicle_year && <Text style={styles.errorText}>{errors.vehicle_year}</Text>}
          </View>

          {/* Placa */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Placa *</Text>
            <TextInput
              style={[styles.input, errors.vehicle_plate && styles.inputError]}
              placeholder="Ej: ABC-123"
              value={formData.vehicle_plate}
              onChangeText={(text) => {
                setFormData({ ...formData, vehicle_plate: text });
                if (errors.vehicle_plate) {
                  setErrors({ ...errors, vehicle_plate: '' });
                }
              }}
              editable={!loading}
            />
            {errors.vehicle_plate && <Text style={styles.errorText}>{errors.vehicle_plate}</Text>}
          </View>

          {/* Color */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Rojo, Azul metalizado, Plateado oscuro"
              value={formData.vehicle_color}
              onChangeText={(text) => {
                setFormData({ ...formData, vehicle_color: text });
              }}
              editable={!loading}
            />
          </View>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Esta información se aplicará a todos tus viajes futuros
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: `${COLORS.primary}15`,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginVertical: 24,
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
