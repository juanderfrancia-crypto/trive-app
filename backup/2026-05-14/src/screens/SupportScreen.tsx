import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function SupportScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const handleEmail = () => {
    Linking.openURL('mailto:soportetrive@gmail.com')
  }

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/573005772967')
  }

  const handlePhone = () => {
    Linking.openURL('tel:+573173028628')
  }

  const handleFAQ = () => {
    navigation.navigate('Help' as never)
  }

  const handleLearningCenter = () => {
    navigation.navigate('LearningCenter' as never)
  }

  const handleBugReport = () => {
    navigation.navigate('BugReport' as never)
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Soporte y Ayuda</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Welcome Message */}
        <View style={styles.section}>
          <View style={styles.welcomeBox}>
            <Ionicons name="headset-outline" size={48} color={COLORS.primary} />
            <Text style={styles.welcomeTitle}>¿Necesitas Ayuda?</Text>
            <Text style={styles.welcomeText}>
              Nuestro equipo de soporte está listo para ayudarte. Elige cómo prefieres comunicarte con nosotros.
            </Text>
          </View>
        </View>

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formas de Contacto</Text>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Correo Electrónico</Text>
              <Text style={styles.contactValue}>soportetrive@gmail.com</Text>
              <Text style={styles.contactTime}>Respuesta en 24 horas</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>+57 (300) 577-2967</Text>
              <Text style={styles.contactTime}>Lunes - Viernes 8am-6pm</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#25D366" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handlePhone}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Llamada Telefónica</Text>
              <Text style={styles.contactValue}>+57 (317) 302-8628</Text>
              <Text style={styles.contactTime}>Lunes - Viernes 8am-6pm</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recursos Útiles</Text>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={handleFAQ}
            activeOpacity={0.8}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="help-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceLabel}>Preguntas Frecuentes</Text>
              <Text style={styles.resourceText}>Encuentra respuestas rápidas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={handleLearningCenter}
            activeOpacity={0.8}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="book-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceLabel}>Centro de Aprendizaje</Text>
              <Text style={styles.resourceText}>Tutoriales y guías paso a paso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={handleBugReport}
            activeOpacity={0.8}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="bug-outline" size={24} color={COLORS.error} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceLabel}>Reportar Problema</Text>
              <Text style={styles.resourceText}>Denuncia bugs y errores</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Para consultas sobre cuentas, seguridad o pagos, por favor contacta directamente con nuestro equipo de soporte.
            </Text>
          </View>
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
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  welcomeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.lg,
    ...SHADOWS.sm,
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
  },
  contactLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  contactValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  contactTime: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.lg,
    ...SHADOWS.sm,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceContent: {
    flex: 1,
  },
  resourceLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  resourceText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
})
