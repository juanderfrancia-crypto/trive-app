import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useState, useEffect } from 'react'
import { getItem, setItem } from '../utils/storage'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

type Language = 'es' | 'en' | 'pt' | 'fr'

interface LanguageOption {
  id: Language
  name: string
  nativeName: string
  flag: string
  description: string
}

export default function LanguageScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('es')
  const [loading, setLoading] = useState(true)

  const languages: LanguageOption[] = [
    {
      id: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
      description: 'Español (Colombia)'
    },
    {
      id: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      description: 'English (United States)'
    },
    {
      id: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      flag: '🇧🇷',
      description: 'Português (Brasil)'
    },
    {
      id: 'fr',
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
      description: 'Français (France)'
    }
  ]

  useEffect(() => {
    loadSelectedLanguage()
  }, [])

  const loadSelectedLanguage = async () => {
    try {
      const saved = await getItem('app_language')
      if (saved) {
        setSelectedLanguage(saved as Language)
      }
    } catch (error) {
      console.log('Error loading language:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLanguage = async (language: Language) => {
    try {
      setSelectedLanguage(language)
      await setItem('app_language', language)
      
      // You can add additional logic here to change app language
      // For now it's just for preference storage
    } catch (error) {
      console.log('Error saving language:', error)
    }
  }

  if (loading) {
    return (
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Idioma</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Welcome Section */}
        <View style={styles.section}>
          <View style={styles.welcomeBox}>
            <Ionicons name="globe-outline" size={48} color={COLORS.primary} />
            <Text style={styles.welcomeTitle}>Selecciona tu Idioma</Text>
            <Text style={styles.welcomeText}>
              Cambia el idioma de la aplicación para una mejor experiencia
            </Text>
          </View>
        </View>

        {/* Brand Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identidad Visual</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityHeader}>
              <View style={styles.brandLogo}>
                <Text style={styles.brandLogoText}>TR</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.identityTitle}>Trive</Text>
                <Text style={styles.identitySubtitle}>Movilidad confiable, segura y cercana</Text>
              </View>
            </View>
            <Text style={styles.identityDescription}>
              Esta pantalla conserva la identidad visual de Trive: colores, tipografía y estilo de tarjetas.
              Aquí eliges tu idioma sin perder la experiencia de marca.
            </Text>
          </View>
        </View>

        {/* Languages List */}
        <View style={styles.languagesSection}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={[
                styles.languageCard,
                selectedLanguage === language.id && styles.languageCardActive
              ]}
              onPress={() => handleSelectLanguage(language.id)}
              activeOpacity={0.8}
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{language.nativeName}</Text>
                  <Text style={styles.languageSubtitle}>{language.description}</Text>
                </View>
              </View>
              
              {selectedLanguage === language.id ? (
                <View style={[styles.checkMark, styles.checkMarkActive]}>
                  <Ionicons name="checkmark" size={20} color={COLORS.background} />
                </View>
              ) : (
                <View style={styles.checkMark} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Tu idioma preferido se guardará y se utilizará la próxima vez que abras la aplicación.
            </Text>
          </View>
        </View>

        {/* Language Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Idioma</Text>
          
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Idioma Actual</Text>
            <Text style={styles.detailsValue}>
              {languages.find(l => l.id === selectedLanguage)?.nativeName}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Idiomas Soportados</Text>
            <Text style={styles.detailsDescription}>
              • Español (Colombia){'\n'}
              • English (United States){'\n'}
              • Português (Brasil){'\n'}
              • Français (France)
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Nota</Text>
            <Text style={styles.detailsDescription}>
              Algunos idiomas pueden estar disponibles en futuras actualizaciones. Puedes sugerir idiomas adicionales desde el Centro de Soporte.
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
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
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
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  languagesSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  languageCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 40,
    marginRight: SPACING.lg,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  languageSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  checkMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  brandLogoText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.background,
    letterSpacing: 1,
  },
  identityText: {
    flex: 1,
  },
  identityTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  identitySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  identityDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  checkMarkActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  detailsTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  detailsValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  detailsDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 18,
  },
})
