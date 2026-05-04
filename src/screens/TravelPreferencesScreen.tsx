import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useLayoutEffect, useState, useEffect } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import Toast from '../components/Toast'
import * as travelPreferences from '../services/travelPreferences'

type MusicPref = 'none' | 'quiet' | 'moderate' | 'loud'
type ACPref = 'cold' | 'cool' | 'normal' | 'warm'
type LuggagePref = 'strict' | 'moderate' | 'flexible'

export default function TravelPreferencesScreen() {
  const navigation = useNavigation()
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Preferences State
  const [smokingAllowed, setSmokingAllowed] = useState(false)
  const [musicPreference, setMusicPreference] = useState<MusicPref>('quiet')
  const [acPreference, setAcPreference] = useState<ACPref>('normal')
  const [luggageRestriction, setLuggageRestriction] = useState<LuggagePref>('moderate')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [priceAlert, setPriceAlert] = useState('50000')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

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
        setNotificationsEnabled(prefs.notifications_enabled !== false)
        setPriceAlert(prefs.price_alert_threshold?.toString() || '50000')
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
        notifications_enabled: notificationsEnabled,
        price_alert_threshold: parseFloat(priceAlert) || 50000,
      })
      setToastMessage('Preferencias guardadas exitosamente')
      setToastVisible(true)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setToastMessage('Error al guardar preferencias')
      setToastVisible(true)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPreferences = () => {
    Alert.alert(
      'Reiniciar preferencias',
      '¿Deseas restaurar los valores por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            setSmokingAllowed(false)
            setMusicPreference('quiet')
            setAcPreference('normal')
            setLuggageRestriction('moderate')
            setNotificationsEnabled(true)
            setPriceAlert('50000')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferencias de Viaje</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Comodidad Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛋️ Comodidad y Entorno</Text>

            {/* Smoking */}
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfoRow}>
                <Ionicons name="flame" size={20} color={COLORS.warning} />
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceName}>Permitir Fumar</Text>
                  <Text style={styles.preferenceDesc}>Cigarrillos permitidos en el viaje</Text>
                </View>
              </View>
              <Switch
                value={smokingAllowed}
                onValueChange={setSmokingAllowed}
                trackColor={{ false: COLORS.surfaceHover, true: COLORS.success + '50' }}
                thumbColor={smokingAllowed ? COLORS.success : COLORS.textSecondary}
              />
            </View>

            {/* Music */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>🎵 Preferencia de Música</Text>
              <View style={styles.optionButtons}>
                {(['none', 'quiet', 'moderate', 'loud'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      musicPreference === option && styles.optionBtnActive,
                    ]}
                    onPress={() => setMusicPreference(option)}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        musicPreference === option && styles.optionBtnTextActive,
                      ]}
                    >
                      {option === 'none' && 'Silencio'}
                      {option === 'quiet' && 'Bajita'}
                      {option === 'moderate' && 'Normal'}
                      {option === 'loud' && 'Fuerte'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* AC */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>❄️ Temperatura del AC</Text>
              <View style={styles.optionButtons}>
                {(['cold', 'cool', 'normal', 'warm'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      acPreference === option && styles.optionBtnActive,
                    ]}
                    onPress={() => setAcPreference(option)}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        acPreference === option && styles.optionBtnTextActive,
                      ]}
                    >
                      {option === 'cold' && 'Muy frío'}
                      {option === 'cool' && 'Frío'}
                      {option === 'normal' && 'Normal'}
                      {option === 'warm' && 'Cálido'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Luggage */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>🎒 Restricción de Equipaje</Text>
              <View style={styles.optionButtons}>
                {(['strict', 'moderate', 'flexible'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      luggageRestriction === option && styles.optionBtnActive,
                    ]}
                    onPress={() => setLuggageRestriction(option)}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        luggageRestriction === option && styles.optionBtnTextActive,
                      ]}
                    >
                      {option === 'strict' && 'Estricta'}
                      {option === 'moderate' && 'Moderada'}
                      {option === 'flexible' && 'Flexible'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Notificaciones Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Notificaciones y Alertas</Text>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfoRow}>
                <Ionicons name="notifications" size={20} color={COLORS.info} />
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceName}>Notificaciones Activas</Text>
                  <Text style={styles.preferenceDesc}>Recibir alertas de viajes</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: COLORS.surfaceHover, true: COLORS.success + '50' }}
                thumbColor={notificationsEnabled ? COLORS.success : COLORS.textSecondary}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Alerta de Precio</Text>
                <Text style={styles.preferenceDesc}>Notificar si el precio baja de $</Text>
              </View>
              <TextInput
                style={styles.priceInput}
                value={priceAlert}
                onChangeText={setPriceAlert}
                keyboardType="number-pad"
                placeholder="50000"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePreferences} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={COLORS.textInverse} />
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={handleResetPreferences}>
              <Ionicons name="refresh" size={18} color={COLORS.error} />
              <Text style={styles.resetBtnText}>Reiniciar Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {toastVisible && (
        <Toast message={toastMessage} visible={toastVisible} type="success" onHide={() => setToastVisible(false)} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  preferenceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  preferenceDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionGroup: {
    marginVertical: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionBtn: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceHover,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  optionBtnTextActive: {
    color: COLORS.textInverse,
  },
  priceInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.surfaceHover,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    minWidth: 80,
  },
  buttonContainer: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  saveBtnText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  resetBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  resetBtnText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
})
