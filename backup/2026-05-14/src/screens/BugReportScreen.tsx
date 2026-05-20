import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import * as Device from 'expo-device'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

type BugCategory = 'crash' | 'visual' | 'network' | 'performance' | 'other'

interface BugReport {
  title: string
  category: BugCategory
  description: string
  email: string
}

export default function BugReportScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [report, setReport] = useState<BugReport>({
    title: '',
    category: 'other',
    description: '',
    email: '',
  })
  const [loading, setLoading] = useState(false)

  const categories: { id: BugCategory; label: string; icon: string }[] = [
    { id: 'crash', label: 'Aplicación se cierra', icon: 'alert-circle-outline' },
    { id: 'visual', label: 'Problema visual', icon: 'color-palette-outline' },
    { id: 'network', label: 'Conexión/Red', icon: 'wifi-outline' },
    { id: 'performance', label: 'Rendimiento lento', icon: 'speedometer-outline' },
    { id: 'other', label: 'Otro', icon: 'help-circle-outline' },
  ]

  const handleSubmitReport = async () => {
    // Validations
    if (!report.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para el problema')
      return
    }

    if (!report.description.trim()) {
      Alert.alert('Error', 'Por favor proporciona una descripción del problema')
      return
    }

    if (!report.email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(report.email)) {
      Alert.alert('Error', 'Por favor ingresa un correo electrónico válido')
      return
    }

    setLoading(true)

    try {
      // Create bug report email
      const deviceInfo = `
Dispositivo: ${Device.modelName || 'Unknown'}
SO: ${Device.osName || 'Unknown'} ${Device.osVersion || 'Unknown'}
App Version: 1.0.0
Categoría: ${categories.find(c => c.id === report.category)?.label}`

      const emailBody = `Reporte de Bug
========================================
Título: ${report.title}
Categoría: ${categories.find(c => c.id === report.category)?.label}

Descripción:
${report.description}

${deviceInfo}

Correo de contacto: ${report.email}
========================================`

      const mailtoLink = `mailto:soportetrive@gmail.com?subject=Reporte de Bug: ${encodeURIComponent(report.title)}&body=${encodeURIComponent(emailBody)}`

      await Linking.openURL(mailtoLink)

      // Show success message
      setTimeout(() => {
        setLoading(false)
        Alert.alert(
          'Reporte Enviado',
          'Tu reporte de bug ha sido enviado. Nuestro equipo revisará tu mensaje pronto.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
      }, 500)
    } catch (error) {
      setLoading(false)
      Alert.alert(
        'Error',
        'No pudimos enviar tu reporte. Por favor intenta de nuevo o contacta directamente a soportetrive@gmail.com'
      )
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
          <Text style={styles.title}>Reportar Problema</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Welcome Section */}
        <View style={styles.section}>
          <View style={styles.welcomeBox}>
            <Ionicons name="bug-outline" size={48} color={COLORS.error} />
            <Text style={styles.welcomeTitle}>Ayúdanos a Mejorar</Text>
            <Text style={styles.welcomeText}>
              Tus reportes de bugs nos ayudan a mejorar Trive constantemente
            </Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.section}>
          {/* Title Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Título del Problema *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: La aplicación se cierra al reservar"
              placeholderTextColor={COLORS.textTertiary}
              value={report.title}
              onChangeText={(text) => setReport({ ...report, title: text })}
              maxLength={100}
            />
            <Text style={styles.characterCount}>{report.title.length}/100</Text>
          </View>

          {/* Category Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Categoría del Problema *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    report.category === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => setReport({ ...report, category: category.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={report.category === category.id ? COLORS.primary : COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      report.category === category.id && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Descripción del Problema *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe en detalle qué pasó, cuándo ocurrió y qué esperabas que sucediera..."
              placeholderTextColor={COLORS.textTertiary}
              value={report.description}
              onChangeText={(text) => setReport({ ...report, description: text })}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>{report.description.length}/1000</Text>
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Tu Correo Electrónico *</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={COLORS.textTertiary}
              value={report.email}
              onChangeText={(text) => setReport({ ...report, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
            <Text style={styles.helperText}>
              Para que podamos contactarte con la solución
            </Text>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Consejos para un Mejor Reporte</Text>
          
          <View style={styles.tipItem}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>1</Text>
            </View>
            <Text style={styles.tipText}>Sé específico: describe exactamente qué pasó</Text>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>2</Text>
            </View>
            <Text style={styles.tipText}>Incluye los pasos que seguiste antes del problema</Text>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>3</Text>
            </View>
            <Text style={styles.tipText}>Menciona si es la primera vez que ocurre</Text>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>4</Text>
            </View>
            <Text style={styles.tipText}>Incluye la versión de tu dispositivo si es relevante</Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitReport}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Ionicons name="send-outline" size={20} color={COLORS.background} />
            <Text style={styles.submitButtonText}>
              {loading ? 'Enviando...' : 'Enviar Reporte'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Tu correo no será compartido públicamente. Solo usaremos para contactarte con actualizaciones.
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
    backgroundColor: COLORS.error + '08',
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
  fieldContainer: {
    marginBottom: SPACING.xl,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 200,
    paddingTop: SPACING.md,
  },
  characterCount: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary + '12',
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  helperText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
    flexShrink: 0,
  },
  tipNumberText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.background,
  },
  tipText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    color: COLORS.textPrimary,
    lineHeight: 20,
    paddingTop: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.background,
    marginLeft: SPACING.sm,
    fontSize: 16,
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
