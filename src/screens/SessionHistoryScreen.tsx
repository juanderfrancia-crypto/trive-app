import { useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import { getUserSessions, endUserSession, UserSessionRecord } from '../services/userSessions'
import { getItem } from '../utils/storage'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function SessionHistoryScreen() {
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

  const renderBody = () => {
    if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
    if (error) return <Text style={styles.errorText}>{error}</Text>
    if (sessions.length === 0) {
      return (
        <View style={styles.empty}>
          <Illustration name="mobileEncryption" width={160} />
          <Text style={styles.emptyTitle}>Sin sesiones activas</Text>
          <Text style={styles.emptyText}>Inicia sesión de nuevo para actualizar esta lista.</Text>
        </View>
      )
    }
    return sessions.map((session) => (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleCol}>
            <View style={styles.deviceIcon}>
              <Icon name="Smartphone" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.sessionTitleText}>
              <Text style={styles.deviceName}>{session.device_name || 'Dispositivo'}</Text>
              {session.is_current && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Este dispositivo</Text>
                </View>
              )}
            </View>
          </View>
          {session.session_key !== localSessionKey && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => handleCloseSession(session.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutBtnText}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sessionDetails}>
          <View style={styles.detailItem}>
            <Icon name="Smartphone" size={14} color={COLORS.textTertiary} />
            <Text style={styles.detailText}>{session.device_type || 'App'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="Laptop" size={14} color={COLORS.textTertiary} />
            <Text style={styles.detailText}>{session.os_version || 'Versión no disponible'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="Clock" size={14} color={COLORS.textTertiary} />
            <Text style={styles.detailText}>{session.last_active_at ? new Date(session.last_active_at).toLocaleString('es-CO') : 'Última actividad desconocida'}</Text>
          </View>
        </View>
      </View>
    ))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Dispositivos conectados</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!loading && !error && sessions.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            {sessions.length} dispositivo{sessions.length !== 1 ? 's' : ''} conectado{sessions.length !== 1 ? 's' : ''}
          </Text>
        )}

        {renderBody()}

        <View style={styles.infoBox}>
          <Icon name="Info" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Si no reconoces algún dispositivo, ciérralo y cambia tu contraseña.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionSubtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  loader: { marginTop: SPACING.xxl },
  errorText: { ...TYPOGRAPHY.bodySmall, color: COLORS.error, marginTop: SPACING.md },

  empty: { alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },

  sessionCard: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sessionTitleCol: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitleText: { flex: 1, gap: SPACING.xs },
  deviceName: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.bold },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  currentBadgeText: { ...TYPOGRAPHY.caption, color: COLORS.success, fontWeight: TYPOGRAPHY.weight.bold },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    height: 36,
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
  },
  logoutBtnText: { ...TYPOGRAPHY.labelMedium, color: COLORS.error, fontWeight: TYPOGRAPHY.weight.bold },

  sessionDetails: { gap: SPACING.sm, paddingLeft: SPACING.xs },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  detailText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

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
