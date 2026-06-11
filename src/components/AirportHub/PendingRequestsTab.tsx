import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { supabase } from '../../services/supabase'

interface PendingRequest {
  id: string
  origin: string
  destination: string
  offered_price: number
  status: string
  createdAt: string
  driverName?: string
}

export default function PendingRequestsTab() {
  const user = useAppStore((s) => s.user)
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadRequests = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const { data, error } = await supabase
        .from('airport_requests')
        .select('id, origin, destination, offered_price, status, created_at, driver_id')
        .eq('passenger_id', user.id)
        .in('status', ['pending', 'negotiating'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedRequests = (data || []).map((req: any) => ({
        id: req.id,
        origin: req.origin,
        destination: req.destination,
        offered_price: req.offered_price,
        status: req.status,
        createdAt: req.created_at,
      }))

      setRequests(formattedRequests)
    } catch (err) {
      console.error('❌ Error loading requests:', err)
      Alert.alert('Error', 'No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [loadRequests])
  )

  const handleDeleteRequest = async (requestId: string) => {
    Alert.alert('Eliminar solicitud', '¿Deseas cancelar esta solicitud?', [
      { text: 'No', onPress: () => {} },
      {
        text: 'Sí, eliminar',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('airport_requests')
              .update({ status: 'cancelled' })
              .eq('id', requestId)

            if (error) throw error
            loadRequests()
          } catch (err) {
            Alert.alert('Error', 'No se pudo cancelar la solicitud')
          }
        },
      },
    ])
  }

  const renderRequestItem = ({ item: request }: { item: PendingRequest }) => (
    <TouchableOpacity style={styles.requestCard} activeOpacity={0.7}>
      <View style={styles.requestLeft}>
        <View style={[styles.statusBadge, request.status === 'pending' ? styles.badgePending : styles.badgeNegotiating]}>
          <Text style={styles.statusIcon}>{request.status === 'pending' ? '⏳' : '💬'}</Text>
        </View>
      </View>

      <View style={styles.requestContent}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestStatus}>
            {request.status === 'pending' ? 'Pendiente' : 'Negociando'}
          </Text>
          <Text style={styles.requestPrice}>${request.offered_price.toLocaleString('es-CO')}</Text>
        </View>

        <Text style={styles.requestRoute} numberOfLines={2}>
          {request.origin} → {request.destination}
        </Text>

        <Text style={styles.requestTime}>
          {new Date(request.createdAt).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteRequest(request.id)}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="document-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text>
      <Text style={styles.emptySubtitle}>
        Crea una nueva solicitud desde la pestaña de "Viajes"
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading && requests.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadRequests()
          }}
          scrollEnabled={requests.length > 0}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  requestLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePending: {
    backgroundColor: '#fff3e0',
  },
  badgeNegotiating: {
    backgroundColor: '#e3f2fd',
  },
  statusIcon: {
    fontSize: 24,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  requestStatus: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  requestPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  requestRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  requestTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textTertiary,
  },
  deleteButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
