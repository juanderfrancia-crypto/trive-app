import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'

interface TripDetailsModalProps {
  visible: boolean
  onClose: () => void
  trip: {
    id: string
    origin: string
    destination: string
    price: number
    status: string
    otherUserName: string
    otherUserAvatar?: string
    userRole: 'conductor' | 'pasajero'
  }
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  visible,
  onClose,
  trip,
}) => {
  const getStatusInfo = () => {
    if (trip.status === 'accepted') {
      return { label: 'Aceptado', icon: 'checkmark-circle', color: '#10b981' }
    }
    return { label: 'En Progreso', icon: 'navigate-circle', color: '#f59e0b' }
  }

  const statusInfo = getStatusInfo()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Viaje</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon as any} size={32} color={statusInfo.color} />
          </View>
          <View>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusSubtext}>
              {trip.status === 'accepted' ? 'Viaje confirmado' : 'En camino'}
            </Text>
          </View>
        </View>

        {/* Passenger/Driver Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {trip.userRole === 'conductor' ? 'Pasajero' : 'Conductor'}
          </Text>
          <View style={styles.infoCard}>
            {trip.otherUserAvatar ? (
              <Image
                source={{ uri: trip.otherUserAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={COLORS.white} />
              </View>
            )}
            <View style={styles.infoContent}>
              <Text style={styles.infoName}>{trip.otherUserName}</Text>
              <Text style={styles.infoSubtext}>
                {trip.userRole === 'conductor' ? 'Pasajero' : 'Conductor'}
              </Text>
            </View>
            <View style={styles.ratingPlaceholder}>
              <Text style={styles.ratingText}>⭐ 5.0</Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruta</Text>
          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={styles.routeDot} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeValue} numberOfLines={2}>
                  {trip.origin}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, styles.routeDotEnd]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeValue} numberOfLines={2}>
                  {trip.destination}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarifa</Text>
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Precio Total</Text>
              <Text style={styles.priceValue}>
                ${trip.price.toLocaleString('es-CO')}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Adicional</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.infoItemLabel}>Hoy</Text>
              <Text style={styles.infoItemValue}>
                {new Date().toLocaleDateString('es-CO')}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <Ionicons name="time" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.infoItemLabel}>Hora</Text>
              <Text style={styles.infoItemValue}>
                {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Entendido</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  ratingPlaceholder: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: '#92400e',
  },
  routeCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  routePoint: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  routeDotEnd: {
    backgroundColor: COLORS.success,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  routeValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.border,
    marginLeft: 5,
    marginVertical: SPACING.sm,
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  priceLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  priceValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  infoItemIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoItemLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoItemValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.white,
  },
})
