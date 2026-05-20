import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native'
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
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.appName}>Trive</Text>
          <Text style={styles.version}>Versión 1.0.0</Text>
        </View>

        {/* About Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Qué es Trive?</Text>
            <Text style={styles.cardText}>
              Trive es una plataforma colombiana de viajes compartidos que conecta conductores y pasajeros para hacer los desplazamientos más convenientes, económicos y sostenibles. No somos una empresa de transporte: somos tecnología que facilita que personas compartan el costo de un trayecto que ya iban a realizar.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Cómo funciona?</Text>
            <Text style={styles.cardText}>
              El conductor publica su ruta con origen, destino, hora y precio por puesto. El pasajero la encuentra, reserva y acuerda el pago directamente con el conductor (Nequi, Daviplata o efectivo). Trive cobra $2.000 al conductor por cada publicación como tarifa de intermediación tecnológica.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Por qué elegir Trive?</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Precios transparentes: el pasajero paga directamente al conductor</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Conductores verificados con documentos revisados por el equipo Trive</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Sistema de calificación y reseñas tras cada viaje</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Chat integrado entre conductor y pasajero para cada trayecto</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Billetera virtual para gestionar el saldo de publicaciones</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Programa de referidos: invita conductores y gana créditos</Text>
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
                <Text style={styles.contactValue}>privacy@trive.co</Text>
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
                <Text style={styles.contactValue}>+57 300 577 2967</Text>
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
  logoImage: {
    width: 200,
    height: 200,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  version: {
    fontSize: 11,
    color: COLORS.textTertiary,
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
