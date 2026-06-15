import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme/theme'
import { useAppStore } from '../../store/useAppStore'
import { SkeletonList } from '../SkeletonLoader'
import { useAirportNegotiation, AirportRequest } from '../../hooks/useAirportNegotiation'
import type { HubTabProps } from './types'

export default function PendingRequestsTab({ isDriver }: HubTabProps) {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const { requests, loading, loadPassengerRequests, cancelRequest } = useAirportNegotiation()
  const [refreshing, setRefreshing] = useState(false)

  const pendingRequests = requests.filter(
    (r) => r.passenger_id === user?.id && r.status === 'pending'
  )

  const load = useCallback(async () => {
    if (!user?.id || isDriver) return
    await loadPassengerRequests(user.id)
  }, [user?.id, isDriver, loadPassengerRequests])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleDeleteRequest = (requestId: string) => {
    Alert.alert('Cancelar solicitud', '¿Deseas cancelar esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return
          try {
            await cancelRequest(requestId, user.id)
          } catch {
            Alert.alert('Error', 'No se pudo cancelar la solicitud')
          }
        },
      },
    ])
  }

  const openDetails = (requestId: string) => {
    navigation.navigate('AirportRequestDetails', { requestId })
  }

  const openCreate = () => {
    navigation.navigate('AirportRequest')
  }

  const renderRequestItem = ({ item: request }: { item: AirportRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      activeOpacity={0.7}
      onPress={() => openDetails(request.id)}
    >
      <View style={styles.requestLeft}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusIcon}>⏳</Text>
        </View>
      </View>

      <View style={styles.requestContent}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestStatus}>Pendiente</Text>
          <Text style={styles.requestPrice}>
            ${request.offered_price.toLocaleString('es-CO')}
          </Text>
        </View>

        <Text style={styles.requestRoute} numberOfLines={2}>
          {request.origin} → {request.destination}
        </Text>

        <Text style={styles.requestTime}>
          Salida:{' '}
          {new Date(request.departure_time).toLocaleString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <Text style={styles.tapHint}>Toca para ver ofertas de conductores</Text>
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
      <Text style={styles.emptyTitle}>Sin solicitudes activas</Text>
      <Text style={styles.emptySubtitle}>
        Publica un viaje al aeropuerto o a cualquier destino para que los conductores te encuentren
      </Text>
      <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Nueva solicitud</Text>
      </TouchableOpacity>
    </View>
  )

  if (isDriver) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtitle}>Cambia a modo pasajero para ver tus solicitudes</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {pendingRequests.length > 0 && (
        <TouchableOpacity style={styles.topCreateBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color={COLORS.primary} />
          <Text style={styles.topCreateBtnText}>Nueva solicitud</Text>
        </TouchableOpacity>
      )}

      {loading && pendingRequests.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={pendingRequests.length > 0}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#eef2ff',
  },
  topCreateBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.primary,
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
  requestLeft: { justifyContent: 'center', alignItems: 'center' },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: { fontSize: 24 },
  requestContent: { flex: 1 },
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
  tapHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  deleteButton: { padding: SPACING.sm, marginLeft: SPACING.sm },
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
    marginBottom: SPACING.lg,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  createBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: '#fff',
  },
})
