import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import {
  loadNotificationPreferences,
  updateNotificationPreference,
  createDefaultPreferences,
} from '../services/notificationPreferences'
import { getPushNotificationToken, registerPushToken } from '../services/pushNotifications'
import { supabase } from '../services/supabase'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [pushNotifications, setPushNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [preferredMunicipality, setPreferredMunicipality] = useState<string | null>(null)
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false)
  const [emergencyContact, setEmergencyContact] = useState<{name: string; phone: string} | null>(null)
  const [sosModalVisible, setSosModalVisible] = useState(false)
  const [sosName, setSosName] = useState('')
  const [sosPhone, setSosPhone] = useState('')

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('emergency_contact, preferred_municipality')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.emergency_contact) setEmergencyContact(data.emergency_contact)
        if (data?.preferred_municipality) setPreferredMunicipality(data.preferred_municipality)
      })
  }, [user?.id])

  const saveMunicipality = async (m: Municipality) => {
    setShowMunicipalityPicker(false)
    setPreferredMunicipality(m.name)
    if (user?.id) {
      await supabase.from('profiles').update({ preferred_municipality: m.name }).eq('id', user.id)
    }
  }

  const saveEmergencyContact = async () => {
    if (!sosPhone.trim()) {
      Alert.alert('Error', 'El número de teléfono es obligatorio')
      return
    }
    if (!user?.id) return
    const contact = { name: sosName.trim() || 'Contacto SOS', phone: sosPhone.trim() }
    await supabase.from('profiles').update({ emergency_contact: contact }).eq('id', user.id)
    setEmergencyContact(contact)
    setSosModalVisible(false)
  }

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        if (!user?.id) return

        let prefs = await loadNotificationPreferences(user.id)

        if (!prefs) {
          await createDefaultPreferences(user.id)
          prefs = await loadNotificationPreferences(user.id)
        }

        if (prefs) {
          setPushNotifications(prefs.push_notifications)
          setEmailNotifications(prefs.email_notifications)
        }
      } catch (err) {
        console.error('Error loading preferences:', err)
      }
    }

    loadPreferences()
  }, [user?.id])

  const handlePushNotificationsChange = async (value: boolean) => {
    if (!user?.id) return
    setPushNotifications(value)

    const success = await updateNotificationPreference(user.id, 'push_notifications', value)
    if (!success) {
      Alert.alert('Error', 'No se pudo guardar la preferencia')
      setPushNotifications(!value)
      return
    }

    if (value) {
      // Reactivar: registrar el token de nuevo en el perfil
      const token = await getPushNotificationToken()
      if (token) await registerPushToken(user.id, token)
    } else {
      // Desactivar: borrar el token del perfil para que no reciba pushes
      await supabase.from('profiles').update({ push_token: null }).eq('id', user.id)
    }
  }

  const handleEmailNotificationsChange = async (value: boolean) => {
    if (!user?.id) return
    setEmailNotifications(value)
    const success = await updateNotificationPreference(user.id, 'email_notifications', value)
    if (!success) {
      Alert.alert('Error', 'No se pudo guardar la preferencia')
      setEmailNotifications(!value)
    }
  }

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
        <Text style={styles.title}>Configuración</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notificaciones Push</Text>
              <Text style={styles.settingDescription}>Alertas de viajes y reservas</Text>
            </View>
            <Switch 
              value={pushNotifications}
              onValueChange={handlePushNotificationsChange}
              trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '30' }}
              thumbColor={pushNotifications ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Correo Electrónico</Text>
              <Text style={styles.settingDescription}>Notificaciones por email</Text>
            </View>
            <Switch 
              value={emailNotifications}
              onValueChange={handleEmailNotificationsChange}
              trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '30' }}
              thumbColor={emailNotifications ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
        </View>

      </View>

      {/* Privacidad y Seguridad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad y Seguridad</Text>
        
        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => navigation.navigate('ChangePassword' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cambiar Contraseña</Text>
              <Text style={styles.settingDescription}>Actualiza tu contraseña de forma segura</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('Privacy' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Configuración de Privacidad</Text>
              <Text style={styles.settingDescription}>Controla quién ve tu perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => navigation.navigate('SessionHistory' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="phone-landscape-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Sesiones Activas</Text>
              <Text style={styles.settingDescription}>Dispositivos conectados a tu cuenta</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => {
            setSosName(emergencyContact?.name || '')
            setSosPhone(emergencyContact?.phone || '')
            setSosModalVisible(true)
          }}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={[styles.settingIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Contacto de Emergencia</Text>
              <Text style={styles.settingDescription}>
                {emergencyContact ? emergencyContact.phone : 'No configurado — se usa para el botón SOS'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>



      {/* Viaje Personalizado */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Viaje Personalizado</Text>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => setShowMunicipalityPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Mi municipio</Text>
              <Text style={styles.settingDescription}>
                {preferredMunicipality ?? 'No configurado — filtra los viajes de tu zona'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => navigation.navigate('TravelPreferences' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Preferencias de Viaje</Text>
              <Text style={styles.settingDescription}>Música, aire acondicionado, smoking</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('FavoriteRoutes' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="star-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Rutas Favoritas</Text>
              <Text style={styles.settingDescription}>Tus rutas guardadas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('CancellationHistory' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Historial de Cancelaciones</Text>
              <Text style={styles.settingDescription}>Tus cancelaciones y reembolsos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('AboutTrive' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Acerca de Trive</Text>
              <Text style={styles.settingDescription}>Versión 1.0.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('TermsOfService' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Términos de Servicio</Text>
              <Text style={styles.settingDescription}>Políticas y condiciones de uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('PrivacyPolicy' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Política de Privacidad</Text>
              <Text style={styles.settingDescription}>Cómo usamos tus datos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => navigation.navigate('Support' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.settingHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Soporte y Ayuda</Text>
              <Text style={styles.settingDescription}>Comunícate con nosotros</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>

      <MunicipalityPickerModal
        visible={showMunicipalityPicker}
        current={preferredMunicipality}
        onSelect={saveMunicipality}
        onClose={() => setShowMunicipalityPicker(false)}
      />

      {/* Modal contacto de emergencia */}
      <Modal visible={sosModalVisible} transparent animationType="fade" onRequestClose={() => setSosModalVisible(false)}>
        <View style={sosStyles.overlay}>
          <View style={sosStyles.sheet}>
            <View style={sosStyles.header}>
              <Ionicons name="alert-circle" size={22} color={COLORS.error} />
              <Text style={sosStyles.title}>Contacto de Emergencia</Text>
            </View>
            <Text style={sosStyles.sub}>Este contacto recibirá tu ubicación al presionar el botón SOS durante un viaje.</Text>
            <TextInput
              style={sosStyles.input}
              placeholder="Nombre (ej. Mamá)"
              placeholderTextColor="#999"
              value={sosName}
              onChangeText={setSosName}
            />
            <TextInput
              style={sosStyles.input}
              placeholder="Número WhatsApp (ej. 3001234567)"
              placeholderTextColor="#999"
              value={sosPhone}
              onChangeText={setSosPhone}
              keyboardType="phone-pad"
            />
            <View style={sosStyles.btnRow}>
              <TouchableOpacity style={sosStyles.cancelBtn} onPress={() => setSosModalVisible(false)}>
                <Text style={sosStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sosStyles.saveBtn} onPress={saveEmergencyContact}>
                <Text style={sosStyles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const sosStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: SPACING.lg, width: '100%', gap: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: 16, fontWeight: '800', color: '#0E1A4A' },
  sub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: '#D6E0FF', borderRadius: 12, padding: 12, fontSize: 14, color: '#0E1A4A', backgroundColor: '#F8F9FF' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F4F6FF', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.error, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})

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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  
  // Section
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  
  // Setting Card
  settingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  settingLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  settingDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
})
