import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { useState, useEffect } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { showSuccess, showError } from '../utils/showError'
import * as travelPreferences from '../services/travelPreferences'

type MusicPref = 'none' | 'quiet' | 'moderate' | 'loud'
type ACPref = 'cold' | 'cool' | 'normal' | 'warm'
type LuggagePref = 'strict' | 'moderate' | 'flexible'

const MUSIC_OPTIONS: { value: MusicPref; label: string }[] = [
  { value: 'none', label: 'Silencio' },
  { value: 'quiet', label: 'Bajita' },
  { value: 'moderate', label: 'Normal' },
  { value: 'loud', label: 'Fuerte' },
]

const AC_OPTIONS: { value: ACPref; label: string }[] = [
  { value: 'cold', label: 'Muy frío' },
  { value: 'cool', label: 'Frío' },
  { value: 'normal', label: 'Normal' },
  { value: 'warm', label: 'Cálido' },
]

const LUGGAGE_OPTIONS: { value: LuggagePref; label: string }[] = [
  { value: 'strict', label: 'Estricta' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'flexible', label: 'Flexible' },
]

export default function TravelPreferencesScreen() {
  const navigation = useNavigation()
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const [smokingAllowed, setSmokingAllowed] = useState(false)
  const [musicPreference, setMusicPreference] = useState<MusicPref>('quiet')
  const [acPreference, setAcPreference] = useState<ACPref>('normal')
  const [luggageRestriction, setLuggageRestriction] = useState<LuggagePref>('moderate')

  useEffect(() => {
    if (!authUser?.id || hasLoaded) return

    loadPreferences()
  }, [authUser?.id, hasLoaded])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setHasLoaded(true) // Prevenir recargas múltiples

      const prefs = await travelPreferences.getUserTravelPreferences(authUser!.id)
      if (prefs) {
        setSmokingAllowed(prefs.smoking_allowed || false)
        setMusicPreference((prefs.music_preference as MusicPref) || 'quiet')
        setAcPreference((prefs.ac_preference as ACPref) || 'normal')
        setLuggageRestriction((prefs.luggage_restriction as LuggagePref) || 'moderate')
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSaving(true)
      await travelPreferences.updateTravelPreferences(authUser!.id, {
        smoking_allowed: smokingAllowed,
        music_preference: musicPreference,
        ac_preference: acPreference,
        luggage_restriction: luggageRestriction,
      })
      showSuccess('Preferencias guardadas')
    } catch (error) {
      console.error('Error saving preferences:', error)
      showError('No pudimos guardar tus preferencias')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPreferences = () => {
    Alert.alert(
      'Restablecer preferencias',
      'Volverán a los valores por defecto. Recuerda guardar para aplicar el cambio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            setSmokingAllowed(false)
            setMusicPreference('quiet')
            setAcPreference('normal')
            setLuggageRestriction('moderate')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Preferencias de viaje</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comodidad</Text>

            <View style={styles.switchRow}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.warningLight }]}>
                <Icon name="Flame" size={18} color={COLORS.warningDark} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Permitir fumar</Text>
                <Text style={styles.rowSub}>Cigarrillos permitidos durante el viaje</Text>
              </View>
              <Switch
                value={smokingAllowed}
                onValueChange={setSmokingAllowed}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={smokingAllowed ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>

          <OptionCard
            icon="Music"
            title="Música"
            options={MUSIC_OPTIONS}
            value={musicPreference}
            onChange={setMusicPreference}
          />

          <OptionCard
            icon="Snowflake"
            title="Temperatura del aire"
            options={AC_OPTIONS}
            value={acPreference}
            onChange={setAcPreference}
          />

          <OptionCard
            icon="Luggage"
            title="Equipaje"
            options={LUGGAGE_OPTIONS}
            value={luggageRestriction}
            onChange={setLuggageRestriction}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSavePreferences} disabled={saving} activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Icon name="Check" size={18} color={COLORS.white} />
                <Text style={styles.saveBtnText}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={handleResetPreferences} activeOpacity={0.85}>
            <Icon name="RefreshCw" size={16} color={COLORS.error} />
            <Text style={styles.resetBtnText}>Restablecer valores</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function OptionCard<T extends string>({ icon, title, options, value, onChange }: {
  icon: IconName
  title: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.rowIcon}>
          <Icon name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = value === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  cardTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rowText: { flex: 1 },
  rowTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  rowSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  option: {
    flexGrow: 1,
    minWidth: '45%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  optionTextActive: { color: COLORS.white },

  saveBtn: {
    ...SHADOWS.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  saveBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.errorLight,
  },
  resetBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.error },
  btnDisabled: { opacity: 0.6 },
})
