import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function AboutTriveScreen() {
  const navigation = useNavigation()

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Acerca de Trive</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Trive</Text>
          <Text style={styles.version}>Versión 1.0.0</Text>
        </View>

        {/* About Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Qué es Trive?</Text>
            <Text style={styles.cardText}>
              Trive es una plataforma moderna de viajes compartidos que conecta conductores y pasajeros para hacer los desplazamientos más convenientes, económicos y sostenibles.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nuestra Misión</Text>
            <Text style={styles.cardText}>
              Facilitar la conexión entre conductores y pasajeros, reduciendo costos de transporte, contaminación y creando una comunidad de usuarios comprometidos.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Por qué elegir Trive?</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Precios competitivos y transparentes</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Conductores verificados y seguros</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Sistema de calificación y reseñas</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Soporte 24/7 disponible</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contáctanos</Text>
          <View style={styles.contactCard}>
            <TouchableOpacity style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Correo Electrónico</Text>
                <Text style={styles.contactValue}>info@trive.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="globe" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Sitio Web</Text>
                <Text style={styles.contactValue}>www.trive.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="call" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Teléfono</Text>
                <Text style={styles.contactValue}>+57 1 2345 6789</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Trive. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  appName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
  },
  version: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  cardText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Feature List
  featureList: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  featureText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Contact
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContent: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  contactLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  contactValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textTertiary,
  },
})
