import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const SCREEN_HEIGHT = Dimensions.get('window').height
const SCREEN_WIDTH = Dimensions.get('window').width

interface Benefit {
  id: string
  icon: string
  title: string
  description: string
  color: string
}

const BENEFITS: Benefit[] = [
  {
    id: '1',
    icon: 'cash-outline',
    title: 'Gana dinero flexible',
    description: 'Establece tu propio horario y gana dinero adicional cuando quieras',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Conecta con pasajeros',
    description: 'Ayuda a otros usuarios a llegar a sus destinos de manera segura',
    color: COLORS.success,
  },
  {
    id: '3',
    icon: 'trending-up-outline',
    title: 'Crece tu negocio',
    description: 'Acceso a herramientas de análisis y estadísticas para optimizar ganancias',
    color: COLORS.accent,
  },
  {
    id: '4',
    icon: 'shield-checkmark-outline',
    title: 'Soporte garantizado',
    description: 'Equipo de atención al cliente disponible 24/7 para ayudarte',
    color: COLORS.warning,
  },
  {
    id: '5',
    icon: 'star-outline',
    title: 'Sistema de calificaciones',
    description: 'Construye tu reputación y mejora tus probabilidades de más viajes',
    color: COLORS.primary,
  },
  {
    id: '6',
    icon: 'checkmark-done-outline',
    title: 'Verificación simple',
    description: 'Proceso rápido de verificación con documentos válidos',
    color: COLORS.success,
  },
]

export default function DriverOnboardingScreen() {
  const navigation = useNavigation()
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const currentIndex = Math.round(contentOffsetX / SCREEN_WIDTH)
    setCurrentIndex(currentIndex)
  }

  const handleContinue = () => {
    navigation.navigate('DriverDocuments' as never)
  }

  const renderBenefitCard = ({ item }: { item: Benefit }) => (
    <View style={[styles.benefitCard, { width: SCREEN_WIDTH - SPACING.xl * 2 }]}>
      <View style={[styles.benefitIcon, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={32} color={item.color} />
      </View>
      <Text style={styles.benefitTitle}>{item.title}</Text>
      <Text style={styles.benefitDescription}>{item.description}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ser Conductor</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[COLORS.primary + '10', COLORS.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="car" size={72} color={COLORS.primary} />
            </View>
            <Text style={styles.heroTitle}>¡Bienvenido a la comunidad!</Text>
            <Text style={styles.heroSubtitle}>
              Descubre cómo convertirte en conductor y empezar a ganar dinero
            </Text>
          </LinearGradient>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>¿Por qué convertirse en conductor?</Text>

          <FlatList
            data={BENEFITS}
            renderItem={renderBenefitCard}
            keyExtractor={(item) => item.id}
            horizontal
            scrollEventThrottle={16}
            onScroll={handleScroll}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH - SPACING.xl}
            snapToAlignment="center"
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.benefitsList}
          />

          {/* Pagination Dots */}
          <View style={styles.dotsContainer}>
            {BENEFITS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Requirements Section */}
        <View style={styles.requirementsSection}>
          <Text style={styles.sectionTitle}>Requisitos para conductores</Text>

          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <View style={styles.requirementCheck}>
                <Ionicons name="checkmark" size={20} color={COLORS.textInverse} />
              </View>
              <View style={styles.requirementText}>
                <Text style={styles.requirementTitle}>Mayor de 18 años</Text>
                <Text style={styles.requirementDescription}>
                  Debes tener la mayoría de edad legal
                </Text>
              </View>
            </View>

            <View style={styles.requirementItem}>
              <View style={styles.requirementCheck}>
                <Ionicons name="checkmark" size={20} color={COLORS.textInverse} />
              </View>
              <View style={styles.requirementText}>
                <Text style={styles.requirementTitle}>Licencia de conducir válida</Text>
                <Text style={styles.requirementDescription}>
                  Categoría B - documento vigente
                </Text>
              </View>
            </View>

            <View style={styles.requirementItem}>
              <View style={styles.requirementCheck}>
                <Ionicons name="checkmark" size={20} color={COLORS.textInverse} />
              </View>
              <View style={styles.requirementText}>
                <Text style={styles.requirementTitle}>Documentos de identificación</Text>
                <Text style={styles.requirementDescription}>
                  Cédula, SOAT, tecnomecánica y antecedentes
                </Text>
              </View>
            </View>

            <View style={styles.requirementItem}>
              <View style={styles.requirementCheck}>
                <Ionicons name="checkmark" size={20} color={COLORS.textInverse} />
              </View>
              <View style={styles.requirementText}>
                <Text style={styles.requirementTitle}>Vehículo en buen estado</Text>
                <Text style={styles.requirementDescription}>
                  Auto seguro y cómodo para pasajeros
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>¿Listo para comenzar?</Text>
          <Text style={styles.ctaDescription}>
            El próximo paso es cargar tus documentos para que nuestro equipo los verifique
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Más tarde</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.textInverse} />
          <Text style={styles.primaryBtnText}>Cargar documentos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  heroGradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Benefits Section
  benefitsSection: {
    paddingVertical: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  benefitsList: {
    paddingHorizontal: SPACING.lg / 2,
  },
  benefitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginHorizontal: SPACING.lg / 2,
    ...SHADOWS.md,
    gap: SPACING.md,
  },
  benefitIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  benefitTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  benefitDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pagination Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },

  // Requirements Section
  requirementsSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  requirementsList: {
    gap: SPACING.md,
  },
  requirementItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  requirementCheck: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  requirementText: {
    flex: 1,
  },
  requirementTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  requirementDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'center',
  },
  ctaTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  ctaDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  primaryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
})
