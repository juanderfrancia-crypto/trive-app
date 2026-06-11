import React, { useState, useEffect, useCallback } from 'react'
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

interface AvailableOffer {
  id: string
  origin: string
  destination: string
  offered_price: number
  passengerName: string
  passengerId: string
  createdAt: string
  status: string
}

export default function AvailableOffersTab() {
  const user = useAppStore((s) => s.user)
  const [offers, setOffers] = useState<AvailableOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOffers = useCallback(async () => {
    if (!user?.id) return

    try {
      if (!refreshing) setLoading(true)
      const { data, error } = await supabase
        .from('airport_requests')
        .select(
          `
          id,
          origin,
          destination,
          offered_price,
          passenger_id,
          status,
          created_at,
          profiles!passenger_id (id, name)
        `
        )
        .eq('status', 'pending')
        .neq('driver_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedOffers = (data || []).map((req: any) => ({
        id: req.id,
        origin: req.origin,
        destination: req.destination,
        offered_price: req.offered_price,
        passengerName: req.profiles?.name || 'Pasajero',
        passengerId: req.passenger_id,
        createdAt: req.created_at,
        status: req.status,
      }))

      setOffers(formattedOffers)
    } catch (err) {
      console.error('❌ Error loading offers:', err)
      Alert.alert('Error', 'No se pudieron cargar las ofertas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, refreshing])

  useFocusEffect(
    useCallback(() => {
      loadOffers()
    }, [loadOffers])
  )

  const handleAcceptOffer = async (offerId: string) => {
    console.log('Aceptar oferta:', offerId)
  }

  const renderOfferItem = ({ item: offer }: { item: AvailableOffer }) => (
    <TouchableOpacity
      style={styles.offerCard}
      onPress={() => handleAcceptOffer(offer.id)}
      activeOpacity={0.7}
    >
      <View style={styles.offerLeft}>
        <View style={styles.offerBadge}>
          <Ionicons name="sparkles" size={20} color={COLORS.success} />
        </View>
      </View>

      <View style={styles.offerContent}>
        <View style={styles.offerHeader}>
          <Text style={styles.passengerName} numberOfLines={1}>{offer.passengerName}</Text>
          <Text style={styles.offerPrice}>${offer.offered_price.toLocaleString('es-CO')}</Text>
        </View>

        <Text style={styles.offerRoute} numberOfLines={2}>
          {offer.origin} → {offer.destination}
        </Text>

        <Text style={styles.offerTime}>
          {new Date(offer.createdAt).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.offerAction}>
        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
      </View>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="briefcase-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Sin ofertas disponibles</Text>
      <Text style={styles.emptySubtitle}>
        Nuevas solicitudes de pasajeros aparecerán aquí cuando lleguen
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading && offers.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadOffers()
          }}
          scrollEnabled={offers.length > 0}
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
  offerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  offerLeft: {
    justifyContent: 'center',
  },
  offerBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    flex: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  passengerName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  offerPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.success,
  },
  offerRoute: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  offerTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textTertiary,
  },
  offerAction: {
    paddingLeft: SPACING.md,
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
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
