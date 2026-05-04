import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import { getUserSessions, endUserSession, UserSessionRecord } from '../services/userSessions'
import { getItem } from '../utils/storage'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function SessionHistoryScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [sessions, setSessions] = useState<UserSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSessionKey, setLocalSessionKey] = useState<string | null>(null)

  const loadSessions = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        throw userError
      }

      const storedKey = await getItem('trive_user_session_key')
      setLocalSessionKey(storedKey)

      if (!user) {
        setSessions([])
        return
      }

      const activeSessions = await getUserSessions(user.id)
      setSessions(activeSessions)
    } catch (err: any) {
      console.error('Error cargando sesiones:', err)
      setError(err?.message || 'No se pudieron cargar las sesiones')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async (sessionId: string) => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas cerrar esta sesión en otro dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              await endUserSession(sessionId)
              setSessions((prev) => prev.filter((session) => session.id !== sessionId))
            } catch (err: any) {
              console.error('Error cerrando sesión remota:', err)
              setError(err?.message || 'No se pudo cerrar la sesión')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  useEffect(() => {
    loadSessions()
  }, [])

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispositivos Conectados</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>
            {sessions.length} dispositivo{sessions.length !== 1 ? 's' : ''} conectado{sessions.length !== 1 ? 's' : ''}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.detailText}>
              No se encontró ninguna sesión activa. Inicia sesión nuevamente para actualizar este listado.
            </Text>
          ) : (
            sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View>
                    <Text style={styles.deviceName}>{session.device_name || 'Dispositivo'}</Text>
                    {session.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Actual</Text>
                      </View>
                    )}
                  </View>
                  {session.session_key !== localSessionKey && (
                    <TouchableOpacity
                      style={styles.logoutBtn}
                      onPress={() => handleCloseSession(session.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.sessionDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{session.device_type || 'App'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="laptop-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{session.os_version || 'Versión no disponible'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{session.last_active_at ? new Date(session.last_active_at).toLocaleString('es-CO') : 'Última actividad desconocida'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Si no reconoces algún dispositivo, cierra la sesión y cambia tu contraseña
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  deviceName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  currentBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '15',
  },
  logoutBtnText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
})
