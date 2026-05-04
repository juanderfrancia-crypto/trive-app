import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'
import Toast from '../components/Toast'
import { validateRequired, validateMinLength } from '../utils/validations'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { ErrorType } from '../services/errorHandler'

interface DriverData {
  id: string
  license_number: string
  license_expiry: string
  vehicle_registration: string
  vehicle_insurance_expiry: string
  verified: boolean
  total_trips?: number
  average_rating?: number
}

export default function DriverVehicleScreen() {
  const navigation = useNavigation()
  const { user } = useAppStore()
  const { handleError, handleSupabaseError } = useErrorHandler()
  const [driver, setDriver] = useState<DriverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [formData, setFormData] = useState({
    license_number: '',
    license_expiry: '',
    vehicle_registration: '',
    vehicle_insurance_expiry: '',
  })
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    fetchDriverData()
  }, [])

  const fetchDriverData = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setDriver(data)
    } catch (err: any) {
      console.error('Error fetching driver data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDriver = async () => {
    if (!user?.id) {
      handleError('Error al identificar usuario', ErrorType.AUTH);
      return;
    }

    // Validar número de licencia
    const licenseCheck = validateRequired(formData.license_number, 'Número de licencia');
    if (!licenseCheck.valid) {
      handleError(licenseCheck.error || 'Número de licencia es requerido', ErrorType.VALIDATION);
      return;
    }

    // Validar fecha de vencimiento
    const expiryCheck = validateRequired(formData.license_expiry, 'Fecha de vencimiento de licencia');
    if (!expiryCheck.valid) {
      handleError(expiryCheck.error || 'Fecha de vencimiento es requerida', ErrorType.VALIDATION);
      return;
    }

    try {
      setLoading(true)
      console.log('Guardando datos del conductor:', formData)
      
      const payload = {
        id: user.id,
        license_number: formData.license_number,
        license_expiry: formData.license_expiry,
        vehicle_registration: formData.vehicle_registration,
        vehicle_insurance_expiry: formData.vehicle_insurance_expiry,
      }

      if (driver?.id) {
        console.log('Actualizando conductor existente:', driver.id)
        const { data, error } = await supabase
          .from('drivers')
          .update(payload)
          .eq('id', user.id)
          .select()
        
        if (error) {
          console.error('Error en UPDATE:', error)
          throw error
        }
        console.log('UPDATE exitoso:', data)
      } else {
        console.log('Insertando conductor nuevo')
        const { data, error } = await supabase
          .from('drivers')
          .insert([payload])
          .select()
        
        if (error) {
          console.error('Error en INSERT:', error)
          throw error
        }
        console.log('INSERT exitoso:', data)
        if (data?.[0]) setDriver(data[0])
      }

      setFormData({
        license_number: '',
        license_expiry: '',
        vehicle_registration: '',
        vehicle_insurance_expiry: '',
      })
      setIsModalVisible(false)
      await fetchDriverData()
      showToast('✓ Información guardada correctamente', 'success')
    } catch (err: any) {
      console.error('Error completo al guardar:', err)
      handleSupabaseError(err, 'save_driver_info', { driver_id: user?.id })
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const handleEditDriver = () => {
    if (driver) {
      setFormData({
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry || '',
        vehicle_registration: driver.vehicle_registration || '',
        vehicle_insurance_expiry: driver.vehicle_insurance_expiry || '',
      })
    }
    setIsModalVisible(true)
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const isLicenseExpiring = driver && (getDaysUntilExpiry(driver.license_expiry) || 0) < 30

  if (loading && !driver) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  // Validación de rol: Solo conductores pueden acceder
  if (!user || user.role !== 'driver') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          {/* Icon */}
          <View style={styles.restrictedIcon}>
            <Ionicons name="lock-closed" size={48} color={COLORS.error} />
          </View>

          {/* Title */}
          <Text style={styles.restrictedTitle}>Acceso restringido</Text>

          {/* Message */}
          <Text style={styles.restrictedText}>
            Esta sección solo está disponible para conductores. Por favor, cambia tu rol a conductor.
          </Text>

          {/* Current Role Badge */}
          {user && (
            <View style={styles.roleBadge}>
              <Ionicons 
                name={user.role === 'driver' ? 'car' : 'person'} 
                size={18} 
                color={COLORS.textInverse}
              />
              <Text style={styles.roleBadgeText}>
                Rol actual: {user.role === 'driver' ? 'Conductor' : 'Pasajero'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.restrictedButtonContainer}>
            <TouchableOpacity
              style={styles.restrictedPrimaryBtn}
              onPress={() => navigation.navigate('Profile' as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle" size={20} color={COLORS.textInverse} />
              <Text style={styles.restrictedPrimaryBtnText}>Ir a Perfil y cambiar rol</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restrictedSecondaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.restrictedSecondaryBtnText}>Volver atrás</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Información del Conductor</Text>
          <Text style={styles.subtitle}>Licencia y documentos</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {driver ? (
          <>
            {/* Status Badge */}
            {driver.verified && (
              <LinearGradient
                colors={[COLORS.success + '15', COLORS.success + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verifiedBadge}
              >
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <View style={styles.verifiedContent}>
                  <Text style={styles.verifiedTitle}>Cuenta Verificada</Text>
                  <Text style={styles.verifiedText}>Tu perfil de conductor está verificado</Text>
                </View>
              </LinearGradient>
            )}

            {/* License Card */}
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Licencia de Conducción</Text>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Número de Licencia</Text>
                  <Text style={styles.detailValue}>{driver.license_number}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Fecha de Vencimiento</Text>
                  <Text style={[
                    styles.detailValue,
                    isLicenseExpiring && { color: COLORS.warning },
                  ]}>
                    {new Date(driver.license_expiry).toLocaleDateString('es-CO')}
                  </Text>
                  {getDaysUntilExpiry(driver.license_expiry) && (
                    <Text style={[
                      styles.expiryInfo,
                      isLicenseExpiring && { color: COLORS.warning },
                    ]}>
                      {getDaysUntilExpiry(driver.license_expiry)} días restantes
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Vehicle Registration Card */}
            {driver.vehicle_registration && (
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Registro del Vehículo</Text>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="document-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Número de Registro</Text>
                    <Text style={styles.detailValue}>{driver.vehicle_registration}</Text>
                  </View>
                </View>

                {driver.vehicle_insurance_expiry && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailIcon}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Seguro del Vehículo</Text>
                        <Text style={styles.detailValue}>
                          {new Date(driver.vehicle_insurance_expiry).toLocaleDateString('es-CO')}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Ionicons name="car-outline" size={24} color={COLORS.primary} />
                <Text style={styles.statValue}>{driver.total_trips || 0}</Text>
                <Text style={styles.statLabel}>Viajes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star-outline" size={24} color={COLORS.warning} />
                <Text style={styles.statValue}>{driver.average_rating?.toFixed(1) || 'N/A'}</Text>
                <Text style={styles.statLabel}>Calificación</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin información de conductor</Text>
            <Text style={styles.emptyText}>
              Completa tu información para activar tu perfil como conductor
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary + 'E0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEditDriver}
          activeOpacity={0.8}
        >
          <Ionicons name={driver ? 'create-outline' : 'add-circle-outline'} size={22} color="#fff" />
          <Text style={styles.actionButtonText}>
            {driver ? 'Editar Información' : 'Completar Información'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Información del Conductor</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Número de Licencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 12345678"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.license_number}
              onChangeText={(text) => setFormData({ ...formData, license_number: text })}
            />

            <Text style={styles.inputLabel}>Fecha de Vencimiento (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2027-12-31"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.license_expiry}
              onChangeText={(text) => setFormData({ ...formData, license_expiry: text })}
            />

            <Text style={styles.inputLabel}>Número de Registro del Vehículo</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de registro"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.vehicle_registration}
              onChangeText={(text) => setFormData({ ...formData, vehicle_registration: text })}
            />

            <Text style={styles.inputLabel}>Fecha Vencimiento Seguro (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2027-12-31"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.vehicle_insurance_expiry}
              onChangeText={(text) => setFormData({ ...formData, vehicle_insurance_expiry: text })}
            />
          </ScrollView>

          <LinearGradient
            colors={[COLORS.primary, COLORS.primary + 'E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalButtonGradient}
          >
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveDriver}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.modalSaveButtonText}>Guardar Información</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Restricted Access Screen
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  restrictedIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  restrictedTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  restrictedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  roleBadgeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  restrictedButtonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  restrictedPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  restrictedPrimaryBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  restrictedSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedSecondaryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  verifiedBadge: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  verifiedContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  verifiedTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.success,
  },
  verifiedText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  expiryInfo: {
    ...TYPOGRAPHY.label,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIcon: {
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  buttonGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  actionButtonText: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  modalButtonGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  modalSaveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  modalSaveButtonText: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
  },
})
