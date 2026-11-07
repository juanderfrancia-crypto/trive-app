import React from 'react'
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Icon from './Icon'

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
      return { label: 'Aceptado', sub: 'Viaje confirmado', icon: 'CircleCheck', color: COLORS.success, bg: COLORS.successLight }
    }
    return { label: 'En Progreso', sub: 'En camino', icon: 'Navigation', color: COLORS.warning, bg: COLORS.warningLight }
  }

  const statusInfo = getStatusInfo()
  const departureDate = new Date()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="X" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del viaje</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.divider} />

        <View style={styles.content}>
          {/* Estado */}
          <View style={[styles.row, { backgroundColor: statusInfo.bg }]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.white }]}>
              <Icon name={statusInfo.icon as any} size={20} color={statusInfo.color} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{statusInfo.label}</Text>
              <Text style={styles.rowSub}>{statusInfo.sub}</Text>
            </View>
          </View>

          {/* Conductor / Pasajero */}
          <View style={[styles.row, { backgroundColor: COLORS.surfaceAlt }]}>
            {trip.otherUserAvatar ? (
              <Image source={{ uri: trip.otherUserAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.rowIcon, { backgroundColor: COLORS.primary }]}>
                <Icon name="User" size={18} color={COLORS.white} />
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{trip.otherUserName}</Text>
              <Text style={styles.rowSub}>{trip.userRole === 'conductor' ? 'Pasajero' : 'Conductor'}</Text>
            </View>
            <View style={styles.ratingPill}>
              <Icon name="Star" size={12} color={COLORS.warningDark} />
              <Text style={styles.ratingText}>5.0</Text>
            </View>
          </View>

          {/* Ruta */}
          <View style={[styles.card, { backgroundColor: COLORS.surfaceAlt }]}>
            <View style={styles.routePoint}>
              <View style={styles.routeDot} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeValue} numberOfLines={2}>{trip.origin}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, styles.routeDotEnd]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeValue} numberOfLines={2}>{trip.destination}</Text>
              </View>
            </View>
          </View>

          {/* Tarifa · Fecha · Hora */}
          <View style={[styles.infoRow, { backgroundColor: COLORS.surfaceAlt }]}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>TARIFA</Text>
              <Text style={[styles.infoValue, styles.infoValuePrice]}>${trip.price.toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>FECHA</Text>
              <Text style={styles.infoValue}>{departureDate.toLocaleDateString('es-CO')}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>HORA</Text>
              <Text style={styles.infoValue}>
                {departureDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingVertical: SPACING.sm + 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warningDark,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 3,
    flexShrink: 0,
  },
  routeDotEnd: {
    backgroundColor: COLORS.success,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routeValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: COLORS.border,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  infoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoValuePrice: {
    color: COLORS.primary,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
})
