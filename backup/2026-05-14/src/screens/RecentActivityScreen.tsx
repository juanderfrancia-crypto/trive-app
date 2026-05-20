import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
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
  const insets = useSafeAreaInsets()
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

  const getActivityIcon = (action: string) => {
    if (action.includes('Inicio de sesión')) return 'log-in-outline'
    if (action.includes('Contraseña')) return 'lock-closed-outline'
    if (action.includes('fallido')) return 'alert-outline'
    if (action.includes('Correo')) return 'mail-outline'
    if (action.includes('Perfil')) return 'person-outline'
    if (action.includes('Documentos')) return 'document-outline'
    return 'notifications-outline'
  }

  const getActivityColor = (status: 'exitoso' | 'fallido') => {
    return status === 'exitoso' ? COLORS.success : COLORS.error
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Actividad Reciente</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.xxxl }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : activities.length > 0 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>
                {activities.length} actividad{activities.length > 1 ? 'es' : ''} registrada{activities.length > 1 ? 's' : ''}
              </Text>

              {activities.map((activity, index) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.cardContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getActivityColor(activity.status) + '15' },
                      ]}
                    >
                      <Ionicons
                        name={getActivityIcon(activity.action) as any}
                        size={20}
                        color={getActivityColor(activity.status)}
                      />
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.actionText}>{activity.action}</Text>
                      <Text style={styles.deviceText}>{activity.device}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
                        <Text style={styles.locationText}>{activity.location}</Text>
                      </View>
                    </View>

                    <View style={styles.rightContent}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getActivityColor(activity.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getActivityColor(activity.status) },
                          ]}
                        >
                          {activity.status === 'exitoso' ? '✓' : '!'}
                        </Text>
                      </View>
                      <Text style={styles.timeText}>{formatTime(activity.created_at)}</Text>
                    </View>
                  </View>

                  {index !== activities.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.noteText}>
                Si ve actividad inusual, cambie su contraseña inmediatamente
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={styles.emptyText}>No hay actividad registrada</Text>
          </View>
        )}
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
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  activityInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  actionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  deviceText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '700',
    fontSize: 16,
  },
  timeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.lg,
  },
  securityNote: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  noteText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
})
