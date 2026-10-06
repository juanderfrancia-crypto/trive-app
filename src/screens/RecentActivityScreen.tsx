import { useEffect, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

interface Activity {
  id: string
  action: string
  device: string
  location: string
  status: 'exitoso' | 'fallido'
  created_at: string
}

export default function RecentActivityScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    if (user?.id && !loadedOnce) {
      loadActivities()
    } else if (!user?.id) {
      setLoading(false)
    }
  }, [user?.id, loadedOnce])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setActivities(
        data?.map((item: any) => ({
          id: item.id,
          action: item.action,
          device: item.device || 'Dispositivo desconocido',
          location: item.location || 'Ubicación desconocida',
          status: item.status,
          created_at: item.created_at,
        })) || []
      )
      setLoadedOnce(true)
    } catch (err) {
      console.error('Error loading activities:', err)
      Alert.alert('Error', 'No se pueden cargar las actividades')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace unos segundos'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`

    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const getActivityIcon = (action: string): IconName => {
    if (action.includes('Inicio de sesión')) return 'LogIn'
    if (action.includes('Contraseña')) return 'Lock'
    if (action.includes('fallido')) return 'TriangleAlert'
    if (action.includes('Correo')) return 'Mail'
    if (action.includes('Perfil')) return 'User'
    if (action.includes('Documentos')) return 'FileText'
    return 'Bell'
  }

  const getActivityColor = (status: 'exitoso' | 'fallido') => {
    return status === 'exitoso' ? COLORS.success : COLORS.error
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Actividad reciente</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : activities.length > 0 ? (
          <>
            <Text style={styles.sectionSubtitle}>
              {activities.length} actividad{activities.length > 1 ? 'es' : ''} registrada{activities.length > 1 ? 's' : ''}
            </Text>

            {activities.map((activity) => {
              const color = getActivityColor(activity.status)
              return (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon name={getActivityIcon(activity.action)} size={20} color={color} />
                  </View>

                  <View style={styles.activityInfo}>
                    <Text style={styles.actionText}>{activity.action}</Text>
                    <Text style={styles.deviceText}>{activity.device}</Text>
                    <View style={styles.locationRow}>
                      <Icon name="MapPin" size={14} color={COLORS.textTertiary} />
                      <Text style={styles.locationText}>{activity.location}</Text>
                    </View>
                  </View>

                  <View style={styles.rightContent}>
                    <Icon name={activity.status === 'exitoso' ? 'CircleCheck' : 'CircleX'} size={18} color={color} />
                    <Text style={styles.timeText}>{formatTime(activity.created_at)}</Text>
                  </View>
                </View>
              )
            })}

            <View style={styles.securityNote}>
              <Icon name="Info" size={18} color={COLORS.primary} />
              <Text style={styles.noteText}>
                Si ves actividad inusual, cambia tu contraseña de inmediato.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Illustration name="noData" width={170} />
            <Text style={styles.emptyTitle}>Sin actividad registrada</Text>
            <Text style={styles.emptyText}>Aquí verás los inicios de sesión y cambios de tu cuenta.</Text>
          </View>
        )}
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
  loader: { marginTop: SPACING.xxl },
  sectionSubtitle: { ...TYPOGRAPHY.labelMedium, color: COLORS.textSecondary, marginBottom: SPACING.md },

  activityCard: {
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: { flex: 1, gap: 2 },
  actionText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.bold },
  deviceText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  locationText: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  rightContent: { alignItems: 'flex-end', gap: SPACING.xs },
  timeText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  noteText: { ...TYPOGRAPHY.caption, flex: 1, color: COLORS.primaryDark, lineHeight: 18 },

  empty: { alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
})
