import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system/legacy'
import { getItem, setItem } from '../utils/storage'
import { exportUserData } from '../services/exportData'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [isPublicProfile, setIsPublicProfile] = useState(false)
  const [shareLocation, setShareLocation] = useState(true)
  const [showRating, setShowRating] = useState(true)
  const [allowMessages, setAllowMessages] = useState(true)
  const [searchIndexing, setSearchIndexing] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)

  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const [
          storedPublic,
          storedShareLocation,
          storedShowRating,
          storedAllowMessages,
          storedSearchIndexing,
        ] = await Promise.all([
          getItem('privacy_public_profile'),
          getItem('privacy_share_location'),
          getItem('privacy_show_rating'),
          getItem('privacy_allow_messages'),
          getItem('privacy_search_indexing'),
        ])

        if (storedPublic !== null) {
          setIsPublicProfile(storedPublic === 'true')
        }
        if (storedShareLocation !== null) {
          setShareLocation(storedShareLocation === 'true')
        }
        if (storedShowRating !== null) {
          setShowRating(storedShowRating === 'true')
        }
        if (storedAllowMessages !== null) {
          setAllowMessages(storedAllowMessages === 'true')
        }
        if (storedSearchIndexing !== null) {
          setSearchIndexing(storedSearchIndexing === 'true')
        }
      } catch (error) {
        console.log('Error loading privacy settings:', error)
      }
    }

    loadPrivacySettings()
  }, [])

  const savePrivacySetting = async (key: string, value: boolean) => {
    try {
      await setItem(key, value.toString())
    } catch (error) {
      console.log(`Error saving privacy setting ${key}:`, error)
    }
  }

  const togglePublicProfile = () => {
    const nextValue = !isPublicProfile
    setIsPublicProfile(nextValue)
    savePrivacySetting('privacy_public_profile', nextValue)
  }

  const handleDownloadData = () => {
    Alert.alert(
      'Descargar mis datos',
      'Se generará un archivo JSON con tu información personal para que puedas guardarla o compartirla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar archivo',
          onPress: async () => {
            setIsExportingData(true)
            try {
              const data = await exportUserData()
              const fileName = `trive-data-export-${new Date()
                .toISOString()
                .replace(/[:.]/g, '-')}.json`
              const jsonContent = JSON.stringify(data, null, 2)

              if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
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
                const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory || ''
                const fileUri = `${directory}${fileName}`
                await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
                  encoding: FileSystem.EncodingType.UTF8,
                })

                await Share.share({
                  url: fileUri,
                  title: 'Exportación de datos de Trive',
                  message: 'Aquí tienes tu archivo de datos de Trive.',
                })
              }

              Alert.alert('¡Listo!', 'Tu archivo de datos se generó correctamente.')
            } catch (error: any) {
              console.error('Error exportando datos:', error)
              Alert.alert('Error', error?.message || 'No se pudo generar el archivo de datos.')
            } finally {
              setIsExportingData(false)
            }
          },
        },
      ]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '⚠️ Esta acción no se puede deshacer. Se eliminarán todos tus datos y ese cuenta no podrá ser recuperada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entendido, continuar',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              'Por favor, ingresa tu contraseña para confirmar la eliminación de tu cuenta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive' },
              ]
            )
          },
        },
      ]
    )
  }

  const handleBlockedUsers = () => {
    Alert.alert(
      'Usuarios bloqueados',
      'Aquí puedes ver y desbloquear usuarios.',
      [{ text: 'OK' }]
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
          <Text style={styles.title}>Privacidad</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Perfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Perfil</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={togglePublicProfile}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Perfil Público</Text>
                <Text style={styles.cardDescription}>
                  {isPublicProfile ? 'Tu perfil es visible para todos' : 'Tu perfil solo es visible para contactos'}
                </Text>
                <Text style={styles.cardHint}>
                  Toca para cambiar el estado de tu perfil público
                </Text>
              </View>
              <View style={styles.switchWrapper}>
                <Switch
                  value={isPublicProfile}
                  onValueChange={(value) => {
                    setIsPublicProfile(value)
                    savePrivacySetting('privacy_public_profile', value)
                  }}
                  trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                  thumbColor={isPublicProfile ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="star-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Mostrar Calificación</Text>
                <Text style={styles.cardDescription}>
                  {showRating ? 'Tu calificación es visible' : 'Tu calificación está oculta'}
                </Text>
              </View>
              <Switch
                value={showRating}
                onValueChange={(value) => {
                  setShowRating(value)
                  savePrivacySetting('privacy_show_rating', value)
                }}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={showRating ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Compartir Ubicación en Viajes</Text>
                <Text style={styles.cardDescription}>
                  {shareLocation ? 'Los conductores ven tu ubicación' : 'Ubicación no compartida'}
                </Text>
              </View>
              <Switch
                value={shareLocation}
                onValueChange={(value) => {
                  setShareLocation(value)
                  savePrivacySetting('privacy_share_location', value)
                }}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={shareLocation ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Comunicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comunicación</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Recibir Mensajes</Text>
                <Text style={styles.cardDescription}>
                  {allowMessages ? 'Puedes recibir mensajes de otros usuarios' : 'Mensajes desactivados'}
                </Text>
              </View>
              <Switch
                value={allowMessages}
                onValueChange={(value) => {
                  setAllowMessages(value)
                  savePrivacySetting('privacy_allow_messages', value)
                }}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={allowMessages ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="search-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Indexación en Búsqueda</Text>
                <Text style={styles.cardDescription}>
                  {searchIndexing
                    ? 'Tu perfil puede aparecer en las búsquedas dentro de la app'
                    : 'Tu perfil no aparece en las búsquedas dentro de la app'}
                </Text>
              </View>
              <Switch
                value={searchIndexing}
                onValueChange={(value) => {
                  setSearchIndexing(value)
                  savePrivacySetting('privacy_search_indexing', value)
                }}
                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '50' }}
                thumbColor={searchIndexing ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Usuarios Bloqueados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={handleBlockedUsers}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="ban-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Usuarios Bloqueados</Text>
                <Text style={styles.cardDescription}>Gestiona usuarios que has bloqueado</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus Datos</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={handleDownloadData}
            activeOpacity={0.7}
            disabled={isExportingData}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="download-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Descargar mis Datos</Text>
                <Text style={styles.cardDescription}>Obtén una copia de tu información</Text>
              </View>
              {isExportingData ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.dangerCard]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, styles.dangerIcon]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, styles.dangerLabel]}>Eliminar Cuenta</Text>
                <Text style={[styles.cardDescription, styles.dangerDescription]}>
                  Esta acción no se puede deshacer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
          <Text style={styles.footerText}>
            Tu privacidad es importante. Puedes cambiar estas configuraciones en cualquier momento.
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
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  dangerCard: {
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  switchWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: COLORS.error + '15',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  cardHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  dangerLabel: {
    color: COLORS.error,
  },
  cardDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  dangerDescription: {
    color: COLORS.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    flex: 1,
    lineHeight: 20,
  },
})
