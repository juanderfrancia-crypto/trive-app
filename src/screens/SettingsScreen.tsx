import { useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Modal, TextInput, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { toEmergencyContact } from '../utils/emergencyContact'
import { MunicipalityPickerModal } from '../components/MunicipalityPickerModal'
import { Municipality } from '../data/colombiaMunicipalities'
import Icon, { type IconName } from '../components/Icon'
import { APP_VERSION_LABEL } from '../config/appInfo'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'

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
        const contact = toEmergencyContact(data?.emergency_contact)
        if (contact) setEmergencyContact(contact)
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

  const go = (screen: string) => () => navigation.navigate(screen as never)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Group title="Notificaciones">
          <SwitchRow
            icon="Bell"
            title="Notificaciones push"
            sub="Alertas de viajes y reservas"
            value={pushNotifications}
            onChange={handlePushNotificationsChange}
          />
          <Divider />
          <SwitchRow
            icon="Mail"
            title="Correo electrónico"
            sub="Resúmenes y avisos por correo"
            value={emailNotifications}
            onChange={handleEmailNotificationsChange}
          />
        </Group>

        <Group title="Seguridad y privacidad">
          <NavRow icon="ShieldCheck" title="Seguridad" sub="Contraseña, dispositivos y actividad" onPress={go('Security')} />
          <Divider />
          <NavRow icon="Eye" title="Privacidad" sub="Tus datos y tu cuenta" onPress={go('Privacy')} />
          <Divider />
          <NavRow
            icon="CircleAlert"
            tone="danger"
            title="Contacto de emergencia"
            sub={emergencyContact ? emergencyContact.phone : 'Recibe tu ubicación con el botón SOS'}
            status={emergencyContact ? 'Configurado' : 'Sin configurar'}
            onPress={() => {
              setSosName(emergencyContact?.name || '')
              setSosPhone(emergencyContact?.phone || '')
              setSosModalVisible(true)
            }}
          />
        </Group>

        <Group title="Viajes">
          <NavRow
            icon="MapPin"
            title="Mi municipio"
            sub={preferredMunicipality ?? 'Filtra los viajes de tu zona'}
            onPress={() => setShowMunicipalityPicker(true)}
          />
          <Divider />
          <NavRow icon="House" title="Direcciones guardadas" sub="Casa, trabajo y lugares frecuentes" onPress={go('SavedAddresses')} />
          <Divider />
          <NavRow icon="Settings" title="Preferencias de viaje" sub="Música, temperatura y equipaje" onPress={go('TravelPreferences')} />
          <Divider />
          <NavRow icon="Star" title="Rutas favoritas" sub="Tus rutas guardadas" onPress={go('FavoriteRoutes')} />
          <Divider />
          <NavRow icon="Receipt" title="Cancelaciones" sub="Tus cancelaciones y reembolsos" onPress={go('CancellationHistory')} />
        </Group>

        <Group title="Información">
          <NavRow icon="Info" title="Acerca de Trive" sub={`Versión ${APP_VERSION_LABEL}`} onPress={go('AboutTrive')} />
          <Divider />
          <NavRow icon="FileText" title="Términos de uso" onPress={go('TermsOfService')} />
          <Divider />
          <NavRow icon="ShieldCheck" title="Política de privacidad" onPress={go('PrivacyPolicy')} />
          <Divider />
          <NavRow icon="CircleHelp" title="Soporte y ayuda" sub="Escríbenos o revisa las preguntas frecuentes" onPress={go('Support')} />
        </Group>

        <Text style={styles.footer}>Trive · versión {APP_VERSION_LABEL}</Text>
      </ScrollView>

      <MunicipalityPickerModal
        visible={showMunicipalityPicker}
        current={preferredMunicipality}
        onSelect={saveMunicipality}
        onClose={() => setShowMunicipalityPicker(false)}
      />

      <Modal visible={sosModalVisible} transparent animationType="fade" onRequestClose={() => setSosModalVisible(false)}>
        <KeyboardAvoidingScreen>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIcon}>
                <Icon name="CircleAlert" size={20} color={COLORS.error} />
              </View>
              <Text style={styles.sheetTitle}>Contacto de emergencia</Text>
            </View>
            <Text style={styles.sheetText}>
              Tu contacto recibirá tu ubicación cuando presiones el botón SOS durante un viaje.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Mamá)"
              placeholderTextColor={COLORS.textTertiary}
              value={sosName}
              onChangeText={setSosName}
            />
            <TextInput
              style={styles.input}
              placeholder="Número de WhatsApp (ej. 3001234567)"
              placeholderTextColor={COLORS.textTertiary}
              value={sosPhone}
              onChangeText={setSosPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSosModalVisible(false)} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmergencyContact} activeOpacity={0.85}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingScreen>
      </Modal>
    </SafeAreaView>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

function Tile({ icon, tone }: { icon: IconName; tone?: 'danger' }) {
  const bg = tone === 'danger' ? COLORS.errorLight : COLORS.primaryTint
  const color = tone === 'danger' ? COLORS.error : COLORS.primary
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
  )
}

function SwitchRow({ icon, title, sub, value, onChange }: {
  icon: IconName
  title: string
  sub: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <View style={styles.row}>
      <Tile icon={icon} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
        thumbColor={value ? COLORS.primary : COLORS.textTertiary}
      />
    </View>
  )
}

function NavRow({ icon, title, sub, status, tone, onPress }: {
  icon: IconName
  title: string
  sub?: string
  status?: string
  tone?: 'danger'
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Tile icon={icon} tone={tone} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, tone === 'danger' && { color: COLORS.error }]}>{title}</Text>
        {!!sub && <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>}
      </View>
      {status ? (
        <View style={[styles.pill, status === 'Configurado' ? styles.pillOk : styles.pillWarn]}>
          <Text style={[styles.pillText, status === 'Configurado' ? styles.pillOkText : styles.pillWarnText]}>{status}</Text>
        </View>
      ) : (
        <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />
      )}
    </TouchableOpacity>
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
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },

  group: { marginTop: SPACING.lg },
  groupTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  groupCard: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 64 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  rowSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  pill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  pillOk: { backgroundColor: COLORS.successLight },
  pillWarn: { backgroundColor: COLORS.warningLight },
  pillText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold },
  pillOkText: { color: COLORS.success },
  pillWarnText: { color: COLORS.warningDark },

  footer: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.xl },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,26,46,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    ...SHADOWS.md,
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary },
  sheetText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 20 },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  sheetButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },
})
