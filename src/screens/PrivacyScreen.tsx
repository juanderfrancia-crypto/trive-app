import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Share, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system/legacy'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { exportUserData } from '../services/exportData'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'
import Icon, { type IconName } from '../components/Icon'

export default function PrivacyScreen() {
  const navigation = useNavigation()
  const user        = useAppStore((s) => s.user)
  const setUser     = useAppStore((s) => s.setUser)
  const setAuthUser = useAppStore((s) => s.setAuthUser)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDownloadData = () => {
    Alert.alert(
      'Descargar mis datos',
      'Se generará un archivo JSON con toda tu información personal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar archivo',
          onPress: async () => {
            setIsExporting(true)
            try {
              const data = await exportUserData()
              const fileName = `trive-datos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
              const jsonContent = JSON.stringify(data, null, 2)

              if (Platform.OS === 'web' && typeof Blob !== 'undefined') {
                const blob = new Blob([jsonContent], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = fileName
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
                URL.revokeObjectURL(url)
              } else {
                const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || ''
                const fileUri = `${dir}${fileName}`
                await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
                  encoding: FileSystem.EncodingType.UTF8,
                })
                await Share.share({
                  url: fileUri,
                  title: 'Mis datos de Trive',
                  message: 'Aquí tienes tu archivo de datos de Trive.',
                })
              }

              Alert.alert('Listo', 'Tu archivo de datos se generó correctamente.')
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo generar el archivo.')
            } finally {
              setIsExporting(false)
            }
          },
        },
      ]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Se cancelarán tus reservas y rutas activas. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación final',
              'Esta es tu última oportunidad. Al confirmar, tu cuenta se cierra de forma permanente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar eliminación',
                  style: 'destructive',
                  onPress: () => confirmDeleteAccount(),
                },
              ]
            )
          },
        },
      ]
    )
  }

  // La función del servidor anonimiza los datos, bloquea la cuenta y devuelve el control aquí.
  const confirmDeleteAccount = async () => {
    if (!user?.id) return
    setIsDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'No se pudo eliminar la cuenta')
      }
      await supabase.auth.signOut()
      setUser(null)
      setAuthUser(null)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo eliminar la cuenta. Contacta a soporte.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacidad</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Tus datos</Text>

        <ActionCard
          icon="Download"
          title="Descargar mis datos"
          sub="Obtén una copia de toda tu información"
          onPress={handleDownloadData}
          disabled={isExporting}
          busy={isExporting}
        />

        <Text style={styles.sectionTitle}>Zona de riesgo</Text>

        <ActionCard
          icon="Trash2"
          title="Eliminar cuenta"
          sub="Cancela reservas activas y cierra tu cuenta"
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          busy={isDeleting}
          danger
        />

        <View style={styles.infoBox}>
          <Icon name="Info" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Para solicitudes adicionales sobre tus datos, escríbenos desde Soporte.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionCard({ icon, title, sub, onPress, disabled, busy, danger }: {
  icon: IconName
  title: string
  sub: string
  onPress: () => void
  disabled: boolean
  busy: boolean
  danger?: boolean
}) {
  const tint = danger ? COLORS.errorLight : COLORS.primaryTint
  const accent = danger ? COLORS.error : COLORS.primary
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75} disabled={disabled}>
      <View style={[styles.cardIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={20} color={accent} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, danger && { color: COLORS.error }]}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      {busy
        ? <ActivityIndicator size="small" color={accent} />
        : <Icon name="ChevronRight" size={18} color={COLORS.textTertiary} />}
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
  title: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },

  card: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  cardSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  infoText: { ...TYPOGRAPHY.caption, flex: 1, color: COLORS.primaryDark, lineHeight: 18 },
})
