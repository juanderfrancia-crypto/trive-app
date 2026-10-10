import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Linking, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import * as Device from 'expo-device'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { APP_VERSION_LABEL } from '../config/appInfo'

type BugCategory = 'crash' | 'visual' | 'network' | 'performance' | 'other'

interface BugReport {
  title: string
  category: BugCategory
  description: string
  email: string
}

const CATEGORIES: { id: BugCategory; label: string; icon: IconName }[] = [
  { id: 'crash', label: 'La app se cierra', icon: 'CircleAlert' },
  { id: 'visual', label: 'Problema visual', icon: 'Palette' },
  { id: 'network', label: 'Conexión', icon: 'Wifi' },
  { id: 'performance', label: 'Va lenta', icon: 'Gauge' },
  { id: 'other', label: 'Otro', icon: 'CircleHelp' },
]

const TIPS = [
  'Sé específico: describe exactamente qué pasó.',
  'Incluye los pasos que seguiste antes del problema.',
  'Menciona si es la primera vez que ocurre.',
  'Indica la versión de tu teléfono si es relevante.',
]

export default function BugReportScreen() {
  const navigation = useNavigation()
  const [report, setReport] = useState<BugReport>({
    title: '',
    category: 'other',
    description: '',
    email: '',
  })
  const [loading, setLoading] = useState(false)

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
      const categoryLabel = CATEGORIES.find((c) => c.id === report.category)?.label

      // Create bug report email
      const deviceInfo = `
Dispositivo: ${Device.modelName || 'Unknown'}
SO: ${Device.osName || 'Unknown'} ${Device.osVersion || 'Unknown'}
App Version: ${APP_VERSION_LABEL}
Categoría: ${categoryLabel}`

      const emailBody = `Reporte de Bug
========================================
Título: ${report.title}
Categoría: ${categoryLabel}

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
          'Revisa tu correo',
          'Se abrió tu app de correo con el reporte listo. Envíalo para que nuestro equipo lo revise. ¡Gracias por ayudarnos a mejorar!',
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reportar un problema</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <KeyboardAvoidingScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.welcome}>
          <View style={styles.welcomeIcon}>
            <Icon name="Bug" size={26} color={COLORS.error} />
          </View>
          <Text style={styles.welcomeTitle}>Ayúdanos a mejorar</Text>
          <Text style={styles.welcomeText}>Cada reporte nos ayuda a hacer Trive más estable.</Text>
        </View>

        <Field label="Título del problema *" count={`${report.title.length}/100`}>
          <TextInput
            style={styles.input}
            placeholder="Ej: La app se cierra al reservar"
            placeholderTextColor={COLORS.textTertiary}
            value={report.title}
            onChangeText={(text) => setReport({ ...report, title: text })}
            maxLength={100}
          />
        </Field>

        <Text style={styles.label}>Categoría *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => {
            const active = report.category === category.id
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryButton, active && styles.categoryButtonActive]}
                onPress={() => setReport({ ...report, category: category.id })}
                activeOpacity={0.7}
              >
                <Icon name={category.icon} size={20} color={active ? COLORS.primary : COLORS.textTertiary} />
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{category.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Field label="Descripción del problema *" count={`${report.description.length}/1000`}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe qué pasó, cuándo ocurrió y qué esperabas que sucediera."
            placeholderTextColor={COLORS.textTertiary}
            value={report.description}
            onChangeText={(text) => setReport({ ...report, description: text })}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
        </Field>

        <Field label="Tu correo electrónico *" hint="Para contactarte con la solución.">
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
        </Field>

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Icon name="Lightbulb" size={18} color={COLORS.primary} />
            <Text style={styles.tipsTitle}>Para un mejor reporte</Text>
          </View>
          {TIPS.map((tip, index) => (
            <View key={tip} style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitReport}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Icon name="Send" size={18} color={COLORS.white} />
          <Text style={styles.submitButtonText}>{loading ? 'Enviando…' : 'Enviar reporte'}</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Icon name="Info" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Tu correo no se comparte públicamente. Solo lo usaremos para responderte.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  )
}

function Field({ label, count, hint, children }: {
  label: string
  count?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {count ? <Text style={styles.counter}>{count}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },

  welcome: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.errorLight,
    marginBottom: SPACING.lg,
  },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  welcomeTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginBottom: SPACING.xs },
  welcomeText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },

  field: { marginBottom: SPACING.lg },
  label: {
    ...TYPOGRAPHY.labelMedium,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 130,
    paddingTop: SPACING.md,
  },
  counter: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: SPACING.xs, textAlign: 'right' },
  hint: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: SPACING.xs },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  categoryButton: {
    width: '31%',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  categoryButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  categoryLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center', fontWeight: TYPOGRAPHY.weight.semibold },
  categoryLabelActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weight.bold },

  tipsCard: {
    ...SHADOWS.sm,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  tipsTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipNumberText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  tipText: { ...TYPOGRAPHY.labelMedium, flex: 1, color: COLORS.textSecondary, paddingTop: 2 },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  infoText: { ...TYPOGRAPHY.caption, flex: 1, color: COLORS.primaryDark, lineHeight: 18 },
})
