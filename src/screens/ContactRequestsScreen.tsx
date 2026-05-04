import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { useContactRequests } from '../hooks/useContactRequests'
import Toast from '../components/Toast'

export default function ContactRequestsScreen() {
  const { user } = useAuth()
  const { getPendingRequests, acceptRequest, rejectRequest } = useContactRequests(user?.id)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ visible: false, message: '', type: 'info' })

  const loadRequests = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const pendingRequests = await getPendingRequests()
      setRequests(pendingRequests || [])
    } catch (error) {
      console.log('Error loading contact requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, getPendingRequests])

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [loadRequests])
  )

  const handleAccept = async (requestId: string, senderName: string) => {
    try {
      setProcessingId(requestId)
      await acceptRequest(requestId)
      setRequests(requests.filter(r => r.id !== requestId))
      setToastConfig({
        visible: true,
        message: `✓ Contacto con ${senderName} aceptado`,
        type: 'success',
      })
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al aceptar solicitud'
      setToastConfig({
        visible: true,
        message: errorMsg,
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string, senderName: string) => {
    try {
      setProcessingId(requestId)
      await rejectRequest(requestId)
      setRequests(requests.filter(r => r.id !== requestId))
      setToastConfig({
        visible: true,
        message: `✗ Solicitud de ${senderName} rechazada`,
        type: 'info',
      })
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al rechazar solicitud'
      setToastConfig({
        visible: true,
        message: errorMsg,
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centering}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    )
  }

  if (requests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Solicitudes de Contacto</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color={COLORS.grayLight} />
          <Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text>
          <Text style={styles.emptySubtitle}>
            Cuando otros pasajeros te soliciten contacto, aparecerán aquí
          </Text>
        </View>

        <Toast
          {...(toastConfig as any)}
          onDismiss={() => setToastConfig({ ...toastConfig, visible: false })}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitudes de Contacto</Text>
        <Text style={styles.requestCount}>{requests.length}</Text>
      </View>

      <ScrollView style={styles.requestsList} showsVerticalScrollIndicator={false}>
        {requests.map((request: any) => (
          <LinearGradient
            key={request.id}
            colors={['#FFFFFF', COLORS.primary + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.requestCard}
          >
            <View style={styles.requestHeader}>
              <View style={styles.senderInfo}>
                <View style={styles.senderAvatar}>
                  <Text style={styles.senderInitial}>
                    {request.profiles?.name?.charAt(0).toUpperCase() || 'P'}
                  </Text>
                </View>

                <View style={styles.senderDetails}>
                  <Text style={styles.senderName}>{request.profiles?.name || 'Pasajero'}</Text>
                  <Text style={styles.routeInfo}>
                    Desea hablar contigo sobre el viaje
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={processingId === request.id}
                onPress={() => handleReject(request.id, request.profiles?.name)}
              >
                {processingId === request.id ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Rechazar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                disabled={processingId === request.id}
                onPress={() => handleAccept(request.id, request.profiles?.name)}
              >
                {processingId === request.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Aceptar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      <Toast
        {...(toastConfig as any)}
        onDismiss={() => setToastConfig({ ...toastConfig, visible: false })}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centering: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '600',
    color: COLORS.dark,
  },
  requestCount: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  requestsList: {
    flex: 1,
    padding: SPACING.md,
  },
  requestCard: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  requestHeader: {
    marginBottom: SPACING.md,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  senderInitial: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.dark,
  },
  routeInfo: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.grayDark,
    marginTop: SPACING.xs,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: COLORS.error + '30',
    backgroundColor: COLORS.error + '08',
  },
  acceptBtn: {
    borderColor: COLORS.primary + '30',
    backgroundColor: COLORS.primary + '08',
  },
  actionBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.grayDark,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
})
