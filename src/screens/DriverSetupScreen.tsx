import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

export default function DriverSetupScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const { user, setUser } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Welcome, 2: Requirements, 3: Confirmation

  const handleActivateDriver = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado')
      return
    }

    try {
      setIsLoading(true)

      // Actualizar perfil para activar rol de conductor
      const { error } = await supabase
        .from('profiles')
        .update({
          is_driver: true,
          driver_active: false, // Inactivo hasta que complete todos los datos
        })
        .eq('id', user.id)

      if (error) throw error

      // Actualizar store local
      setUser({ ...user, role: 'driver' })

      Alert.alert(
        'Éxito',
        'Has activado tu rol de conductor.\n\nAhora puedes acceder al panel de conductor y completar tu perfil.',
        [
          {
            text: 'Ir al Panel',
            onPress: () => navigation.navigate('DriverPanel' as never),
          },
          {
            text: 'Volver al Perfil',
            onPress: () => navigation.navigate('Main' as never, { screen: 'Profile' } as never),
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo activar el rol de conductor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Conviértete en Conductor</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, currentStep >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressDot, currentStep >= 2 && styles.progressDotActive]} />
          <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />
          <View style={[styles.progressDot, currentStep >= 3 && styles.progressDotActive]} />
        </View>

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <>
            <View style={styles.stepContainer}>
              <View style={styles.iconBox}>
                <Ionicons name="car" size={64} color={COLORS.primary} />
              </View>

              <Text style={styles.stepTitle}>Gana Dinero Compartiendo Viajes</Text>
              <Text style={styles.stepDescription}>
                Únete a nuestra comunidad de conductores y comienza a ganar dinero flexible en tu tiempo libre.
              </Text>

              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Ganancias Competitivas</Text>
                    <Text style={styles.benefitText}>Fija tu propio precio por asiento</Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Flexibilidad Total</Text>
                    <Text style={styles.benefitText}>Trabaja cuando quieras</Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Seguridad Garantizada</Text>
                    <Text style={styles.benefitText}>Usuarios verificados y calificados</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setCurrentStep(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Conocer Requisitos</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: Requirements */}
        {currentStep === 2 && (
          <>
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Requisitos</Text>
              <Text style={styles.stepDescription}>
                Para ser conductor en Trive, debes cumplir con estos requisitos:
              </Text>

              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.requirementContent}>
                    <Text style={styles.requirementTitle}>Mayor a 18 años</Text>
                    <Text style={styles.requirementText}>Debes ser legalmente mayor de edad</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.requirementContent}>
                    <Text style={styles.requirementTitle}>Licencia de Conducir Válida</Text>
                    <Text style={styles.requirementText}>Documento actualizado y vigente</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.requirementContent}>
                    <Text style={styles.requirementTitle}>Documento de Identidad</Text>
                    <Text style={styles.requirementText}>Cédula o pasaporte válido</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.requirementContent}>
                    <Text style={styles.requirementTitle}>Vehículo en Buen Estado</Text>
                    <Text style={styles.requirementText}>Seguro y documentación al día</Text>
                  </View>
                </View>

                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.requirementContent}>
                    <Text style={styles.requirementTitle}>Historial Limpio</Text>
                    <Text style={styles.requirementText}>Sin antecedentes penales relevantes</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setCurrentStep(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setCurrentStep(3)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <>
            <View style={styles.stepContainer}>
              <View style={styles.confirmationBox}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
              </View>

              <Text style={styles.stepTitle}>¡Estás Listo!</Text>
              <Text style={styles.stepDescription}>
                Confirmas que cumples con todos los requisitos y estás listo para convertirte en conductor.
              </Text>

              <View style={styles.termsBox}>
                <View style={styles.termsItem}>
                  <Ionicons name="document-text-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.termsText}>
                    Acepto los{' '}
                    <Text style={styles.termsLink}>Términos de Servicio</Text> para conductores
                  </Text>
                </View>

                <View style={styles.termsItem}>
                  <Ionicons name="shield-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.termsText}>
                    Acepto la{' '}
                    <Text style={styles.termsLink}>Política de Privacidad</Text>
                  </Text>
                </View>

                <View style={styles.termsItem}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.termsText}>
                    Entiendo que debo mantener un{' '}
                    <Text style={styles.termsLink}>comportamiento profesional</Text>
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.6 }]}
                onPress={handleActivateDriver}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Activar Conductor</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderLight,
    maxWidth: 40,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 28,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  stepDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  benefitsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  benefitIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  benefitText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  requirementsList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  requirementItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  requirementText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  confirmationBox: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  termsBox: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  termsItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
  },
  termsText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  primaryBtnText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  secondaryBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
})
