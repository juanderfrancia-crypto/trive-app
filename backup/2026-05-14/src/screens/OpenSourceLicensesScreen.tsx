import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

export default function OpenSourceLicensesScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const libraries = [
    {
      name: 'React Native',
      license: 'MIT',
      description: 'Framework para construir aplicaciones móviles nativas'
    },
    {
      name: 'React Navigation',
      license: 'MIT',
      description: 'Bibliotecas de navegación para React Native'
    },
    {
      name: 'Redux',
      license: 'MIT',
      description: 'Librería de gestión de estado predecible'
    },
    {
      name: 'Zustand',
      license: 'MIT',
      description: 'Gestor de estado minimalista y flexible'
    },
    {
      name: 'Expo',
      license: 'MIT',
      description: 'Plataforma de desarrollo React Native'
    },
    {
      name: 'TypeScript',
      license: 'Apache 2.0',
      description: 'Lenguaje de programación con tipos para JavaScript'
    },
    {
      name: 'Expo Icons',
      license: 'MIT',
      description: 'Conjunto completo de iconos para React Native'
    },
    {
      name: 'Safe Area Context',
      license: 'MIT',
      description: 'Proporciona límites seguros para dispositivos con notch'
    },
    {
      name: 'Supabase',
      license: 'Apache 2.0',
      description: 'Backend de código abierto para Firebase'
    },
    {
      name: 'Babel',
      license: 'MIT',
      description: 'Compilador JavaScript'
    }
  ]

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Licencias de Código Abierto</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="open-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Trive está construida con tecnologías de código abierto. Agradecemos a todos los desarrolladores que hacen posible este proyecto.
            </Text>
          </View>
        </View>

        {/* Librerías */}
        <View style={styles.librariesSection}>
          <Text style={styles.sectionTitle}>Librerías Utilizadas</Text>
          
          {libraries.map((lib, index) => (
            <View key={lib.name} style={styles.libraryCard}>
              <View style={styles.libraryHeader}>
                <Text style={styles.libraryName}>{lib.name}</Text>
                <View style={[styles.licenseBadge, getLicenseColor(lib.license)]}>
                  <Text style={styles.licenseBadgeText}>{lib.license}</Text>
                </View>
              </View>
              <Text style={styles.libraryDescription}>{lib.description}</Text>
            </View>
          ))}
        </View>

        {/* Información sobre licencias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de las Licencias</Text>
          
          <View style={styles.licenseInfoContainer}>
            <View style={styles.licenseItem}>
              <View style={[styles.licenseDot, { backgroundColor: '#6B21A8' }]} />
              <View style={styles.licenseItemContent}>
                <Text style={styles.licenseItemTitle}>MIT License</Text>
                <Text style={styles.licenseItemDescription}>
                  Licencia permisiva que permite uso comercial y privado. Aunque el software se proporciona "AS IS", es una de las licencias más utilizadas.
                </Text>
              </View>
            </View>

            <View style={styles.licenseItem}>
              <View style={[styles.licenseDot, { backgroundColor: '#DC2626' }]} />
              <View style={styles.licenseItemContent}>
                <Text style={styles.licenseItemTitle}>Apache 2.0</Text>
                <Text style={styles.licenseItemDescription}>
                  Licencia gratuita que permite uso comercial, modificación y distribución. Proporciona protección explícita de patentes.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Más información */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Más Información</Text>
          <Text style={styles.text}>
            El código fuente completo de cada librería está disponible en sus repositorios respectivos. Puedes encontrar más información sobre las licencias en:{'\n\n'}
            • www.opensource.org{'\n'}
            • www.gnu.org/licenses{'\n'}
            • www.apache.org/licenses
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.disclaimerText}>
            El cumplimiento de estas licencias de código abierto es fundamental. Para un uso comercial completo, consulta los términos específicos de cada licencia.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

function getLicenseColor(license: string) {
  switch (license) {
    case 'MIT':
      return { backgroundColor: '#6B21A8', borderColor: '#6B21A8' }
    case 'Apache 2.0':
      return { backgroundColor: '#DC2626', borderColor: '#DC2626' }
    default:
      return { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
  }
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
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 20,
  },
  librariesSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  libraryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  libraryName: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  licenseBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  licenseBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 11,
  },
  libraryDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  licenseInfoContainer: {
    gap: SPACING.lg,
  },
  licenseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  licenseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: SPACING.lg,
  },
  licenseItemContent: {
    flex: 1,
  },
  licenseItemTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  licenseItemDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  text: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  disclaimerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 18,
  },
})
