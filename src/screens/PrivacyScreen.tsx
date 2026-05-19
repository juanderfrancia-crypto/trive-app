import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, Share,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system/legacy'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { exportUserData } from '../services/exportData'
import { supabase } from '../services/supabase'
import { useAppStore } from '../store/useAppStore'

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets()
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
              'Escribe ELIMINAR en el siguiente paso para confirmar.',
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

  const confirmDeleteAccount = async () => {
    if (!user?.id) return
    setIsDeleting(true)
    try {
      // Cancelar reservas activas del pasajero
      await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled' })
        .eq('passenger_id', user.id)
        .in('booking_status', ['pending', 'confirmed'])

      // Cancelar rutas activas del conductor
      await supabase
        .from('routes')
        .update({ status: 'cancelled' })
        .eq('driver_id', user.id)
        .eq('status', 'scheduled')

      // Limpiar push token
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id)

      // Cerrar sesión
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
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Privacidad</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tus Datos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tus Datos</Text>

          <TouchableOpacity
            style={s.card}
            onPress={handleDownloadData}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            <View style={s.cardRow}>
              <View style={s.icon}>
                <Ionicons name="download-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={s.cardContent}>
                <Text style={s.cardLabel}>Descargar mis datos</Text>
                <Text style={s.cardDesc}>Obtén una copia de toda tu información</Text>
              </View>
              {isExporting
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              }
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, s.dangerCard]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <View style={s.cardRow}>
              <View style={[s.icon, s.dangerIcon]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={s.cardContent}>
                <Text style={[s.cardLabel, { color: COLORS.error }]}>Eliminar cuenta</Text>
                <Text style={[s.cardDesc, { color: COLORS.error + 'AA' }]}>
                  Cancela reservas activas y cierra tu cuenta
                </Text>
              </View>
              {isDeleting
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              }
            </View>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
          <Text style={s.infoText}>
            Para solicitudes adicionales sobre tus datos contáctanos en soporte.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },

  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dangerCard: {
    borderColor: COLORS.error + '30',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  icon: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: COLORS.error + '15',
  },
  cardContent: { flex: 1 },
  cardLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    margin: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
})
