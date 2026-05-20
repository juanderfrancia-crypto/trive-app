import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function AboutScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const handleTerms = () => {
    navigation.navigate('Terms' as never)
  }

  const handlePrivacy = () => {
    navigation.navigate('PrivacyPolicy' as never)
  }

  const handleOpenSource = () => {
    navigation.navigate('OpenSourceLicenses' as never)
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Acerca de Trive</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Ionicons name="car-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Trive</Text>
          <Text style={styles.version}>Versión 1.0.0</Text>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué es Trive?</Text>
          <View style={styles.card}>
            <Text style={styles.descriptionText}>
              Trive es una plataforma de viajes compartidos que conecta conductores y pasajeros de manera segura y eficiente. Disfruta de un diseño moderno, navegación fluida y gestión en tiempo real de tus rutas y reservas.
            </Text>
          </View>
        </View>

        {/* Características */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características Principales</Text>
          
          <View style={styles.card}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Seguridad</Text>
                <Text style={styles.featureDescription}>Verificación de identidad y calificaciones de usuarios</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Rastreo en Tiempo Real</Text>
                <Text style={styles.featureDescription}>Sigue tu viaje en tiempo real con GPS</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Pagos Seguros</Text>
                <Text style={styles.featureDescription}>Múltiples opciones de pago integradas</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="star-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Calificaciones y Reseñas</Text>
                <Text style={styles.featureDescription}>Comunidad confiable basada en experiencias reales</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Información Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity style={styles.legalLink} onPress={handleTerms} activeOpacity={0.7}>
            <Text style={styles.legalText}>Términos de Servicio</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.legalLink} onPress={handlePrivacy} activeOpacity={0.7}>
            <Text style={styles.legalText}>Política de Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.legalLink} onPress={handleOpenSource} activeOpacity={0.7}>
            <Text style={styles.legalText}>Licencias de Código Abierto</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 Trive. Todos los derechos reservados.
          </Text>
          <Text style={styles.footerSubtext}>
            Hecho con ❤️ para conectar personas
          </Text>
        </View>
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
    backgroundColor: COLORS.background,
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    ...TYPOGRAPHY.h2,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  version: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  descriptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  legalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  legalText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginTop: SPACING.lg,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  footerSubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
})
