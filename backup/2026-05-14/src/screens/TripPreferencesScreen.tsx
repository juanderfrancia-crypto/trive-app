import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { loadTripPreferences, updateTripPreference, createDefaultTripPreferences } from '../services/tripPreferences'

type PreferenceKey = 'beverage_preference' | 'snack_preference' | 'temperature_preference' | 'music_preference' | 'conversation_preference' | 'temperature_car'

interface PreferenceOption {
  label: string
  value: string | null
  icon: string
  color: string
}

export default function TripPreferencesScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    if (!user?.id) return

    try {
      let prefs = await loadTripPreferences(user.id)

      if (!prefs) {
        await createDefaultTripPreferences(user.id)
        prefs = await loadTripPreferences(user.id)
      }

      setPreferences(prefs)
    } catch (err) {
      console.error('Error loading preferences:', err)
      Alert.alert('Error', 'No se pudieron cargar las preferencias')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = async (key: PreferenceKey, value: string | null) => {
    if (!user?.id) return

    setSaving(true)
    const oldValue = preferences[key]

    // Optimistic update
    setPreferences({ ...preferences, [key]: value })

    const success = await updateTripPreference(user.id, key, value)
    if (!success) {
      // Revert on error
      setPreferences({ ...preferences, [key]: oldValue })
      Alert.alert('Error', 'No se pudo guardar la preferencia')
    }

    setSaving(false)
  }

  const beverageOptions: PreferenceOption[] = [
    { label: '💧 Agua', value: 'agua', icon: 'water', color: COLORS.primary },
    { label: '🧃 Jugo', value: 'jugo', icon: 'cafe', color: '#FF9500' },
    { label: 'Ninguno', value: null, icon: 'close-circle', color: COLORS.textTertiary },
  ]

  const snackOptions: PreferenceOption[] = [
    { label: '🍪 Dulce', value: 'dulce', icon: 'happy', color: '#FF6B6B' },
    { label: '🥜 Salado', value: 'salado', icon: 'checkmark', color: '#4ECDC4' },
    { label: 'Ninguno', value: null, icon: 'close-circle', color: COLORS.textTertiary },
  ]

  const temperatureOptions: PreferenceOption[] = [
    { label: '❄️ Frío', value: 'frio', icon: 'snow', color: '#5DADE2' },
    { label: '🌡️ Ambiente', value: 'ambiente', icon: 'sunny', color: '#F4D03F' },
    { label: '🔥 Caliente', value: 'caliente', icon: 'flame', color: '#E74C3C' },
  ]

  const musicOptions: PreferenceOption[] = [
    { label: '🎵 Música', value: 'si', icon: 'musical-notes', color: '#9B59B6' },
    { label: '🔇 Silencio', value: 'no', icon: 'volume-mute', color: COLORS.textTertiary },
    { label: '🔉 Bajo volumen', value: 'bajo', icon: 'volume-low', color: '#3498DB' },
  ]

  const conversationOptions: PreferenceOption[] = [
    { label: '💬 Conversador', value: 'conversador', icon: 'chatbubbles', color: COLORS.primary },
    { label: '🤐 Silencioso', value: 'silencioso', icon: 'ban', color: COLORS.textTertiary },
    { label: '😊 Neutral', value: 'neutral', icon: 'ellipsis-horizontal', color: '#95A5A6' },
  ]

  const carTempOptions: PreferenceOption[] = [
    { label: '❄️ Aire frío', value: 'frio', icon: 'snow', color: '#5DADE2' },
    { label: '🌡️ Normal', value: 'ambiente', icon: 'sunny', color: '#F4D03F' },
    { label: '🔥 Aire caliente', value: 'caliente', icon: 'flame', color: '#E74C3C' },
  ]

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const PreferenceSection = ({
    title,
    description,
    icon,
    options,
    currentValue,
    onchange,
  }: {
    title: string
    description: string
    icon: string
    options: PreferenceOption[]
    currentValue: string | null
    onchange: (value: string | null) => void
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={24} color={COLORS.primary} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value || 'null'}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.optionButtonActive,
              currentValue === option.value && {
                borderColor: option.color,
                backgroundColor: option.color + '15',
              },
            ]}
            onPress={() => onchange(option.value)}
            disabled={saving}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            {currentValue === option.value && (
              <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>🚗 Mi Experiencia</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Personaliza tu experiencia en los viajes para que los conductores sepan qué ofrecerte
          </Text>
        </View>

        {preferences && (
          <>
            <PreferenceSection
              title="Bebida"
              description="¿Qué tipo de bebida prefieres?"
              icon="water-outline"
              options={beverageOptions}
              currentValue={preferences.beverage_preference}
              onchange={(value) => handlePreferenceChange('beverage_preference', value)}
            />

            <PreferenceSection
              title="Aperitivo"
              description="¿Prefieres dulce o salado?"
              icon="pizza-outline"
              options={snackOptions}
              currentValue={preferences.snack_preference}
              onchange={(value) => handlePreferenceChange('snack_preference', value)}
            />

            <PreferenceSection
              title="Temperatura"
              description="¿Qué temperatura de bebida?"
              icon="thermometer-outline"
              options={temperatureOptions}
              currentValue={preferences.temperature_preference}
              onchange={(value) => handlePreferenceChange('temperature_preference', value)}
            />

            <PreferenceSection
              title="Música"
              description="¿Te gustaría escuchar música?"
              icon="musical-notes-outline"
              options={musicOptions}
              currentValue={preferences.music_preference}
              onchange={(value) => handlePreferenceChange('music_preference', value)}
            />

            <PreferenceSection
              title="Conversación"
              description="¿Qué tipo de viaje prefieres?"
              icon="chatbubbles-outline"
              options={conversationOptions}
              currentValue={preferences.conversation_preference}
              onchange={(value) => handlePreferenceChange('conversation_preference', value)}
            />

            <PreferenceSection
              title="Aire Acondicionado"
              description="¿Qué temperatura del coche?"
              icon="wind-outline"
              options={carTempOptions}
              currentValue={preferences.temperature_car}
              onchange={(value) => handlePreferenceChange('temperature_car', value)}
            />
          </>
        )}

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.footerText}>
            Los conductores verán tus preferencias y harán todo lo posible por cumplirlas
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
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  intro: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  introText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.xs,
  },
  optionButtonActive: {
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
})
