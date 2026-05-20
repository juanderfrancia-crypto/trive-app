import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import ReputationCard from './ReputationCard'
import ReviewComments from './ReviewComments'
import { DriverReputation } from '../services/driverReputation'

interface DriverDetailsBottomSheetProps {
  visible: boolean
  onClose: () => void
  onReserve?: () => void
  reputation: DriverReputation | null
  driverName: string
  loading?: boolean
  route?: any
}

const { height: screenHeight } = Dimensions.get('window')

export default function DriverDetailsBottomSheet({
  visible,
  onClose,
  onReserve,
  reputation,
  driverName,
  loading = false,
  route,
}: DriverDetailsBottomSheetProps) {
  const [slideAnim] = React.useState(new Animated.Value(screenHeight))

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, slideAnim])

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose())
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* Overlay oscuro */}
      <View style={styles.overlay}>
        {/* BottomSheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {driverName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {driverName}
                </Text>
                {reputation && (
                  <Text style={styles.driverSubtitle}>
                    {reputation.completedTrips} viajes completados
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando información...</Text>
              </View>
            ) : reputation ? (
              <>
                {/* Reputation Card */}
                <View style={styles.section}>
                  <ReputationCard reputation={reputation} />
                </View>

                {/* Review Comments */}
                {reputation.reviewComments.length > 0 ? (
                  <View style={styles.section}>
                    <ReviewComments
                      comments={reputation.reviewComments}
                      driverName={driverName}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyCommentsContainer}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={40}
                      color={COLORS.textTertiary}
                    />
                    <Text style={styles.emptyCommentsText}>
                      Sin comentarios aún
                    </Text>
                  </View>
                )}

                {/* Route Info (if provided) */}
                {route && (
                  <View style={styles.section}>
                    <View style={styles.routeInfoCard}>
                      <Text style={styles.routeInfoTitle}>Detalle del Viaje</Text>

                      <View style={styles.routeInfoRow}>
                        <Ionicons
                          name="location"
                          size={16}
                          color={COLORS.primary}
                        />
                        <View style={styles.routeInfoText}>
                          <Text style={styles.routeInfoLabel}>Salida</Text>
                          <Text style={styles.routeInfoValue}>
                            {route.origin}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeInfoRow}>
                        <Ionicons
                          name="location"
                          size={16}
                          color={COLORS.error}
                        />
                        <View style={styles.routeInfoText}>
                          <Text style={styles.routeInfoLabel}>Destino</Text>
                          <Text style={styles.routeInfoValue}>
                            {route.destination}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeInfoRow}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={COLORS.primary}
                        />
                        <View style={styles.routeInfoText}>
                          <Text style={styles.routeInfoLabel}>Salida</Text>
                          <Text style={styles.routeInfoValue}>
                            {new Date(route.departure_time).toLocaleTimeString(
                              'es-CO',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeInfoRow}>
                        <Ionicons
                          name="cash-outline"
                          size={16}
                          color={COLORS.primary}
                        />
                        <View style={styles.routeInfoText}>
                          <Text style={styles.routeInfoLabel}>Precio</Text>
                          <Text style={styles.routeInfoValue}>
                            ${route.price_per_seat?.toLocaleString('es-CO') ||
                              'N/A'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeInfoRow}>
                        <Ionicons
                          name="people"
                          size={16}
                          color={COLORS.primary}
                        />
                        <View style={styles.routeInfoText}>
                          <Text style={styles.routeInfoLabel}>Disponible</Text>
                          <Text
                            style={[
                              styles.routeInfoValue,
                              route.available_seats === 0 &&
                                styles.routeInfoValueError,
                            ]}
                          >
                            {route.available_seats === 0
                              ? 'Sin puestos'
                              : `${route.available_seats} puesto(s)`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={40}
                  color={COLORS.error}
                />
                <Text style={styles.errorText}>
                  No se pudo cargar la información
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.reserveButton,
                route?.available_seats === 0 && styles.reserveButtonDisabled,
              ]}
              onPress={onReserve}
              disabled={route?.available_seats === 0}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={styles.reserveButtonText}>
                {route?.available_seats === 0
                  ? 'Sin Puestos Disponibles'
                  : 'Reservar Ahora'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  bottomSheet: {
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },

  // Handle bar (drag indicator)
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  driverAvatarText: {
    ...TYPOGRAPHY.h4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  driverName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  driverSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
  },

  section: {
    gap: SPACING.md,
  },

  // Loading
  loadingContainer: {
    paddingVertical: SPACING.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
  },

  // Error
  errorContainer: {
    paddingVertical: SPACING.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.error,
    marginTop: SPACING.md,
  },

  // Empty Comments
  emptyCommentsContainer: {
    paddingVertical: SPACING.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCommentsText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },

  // Route Info Card
  routeInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  routeInfoTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  routeInfoText: {
    flex: 1,
  },
  routeInfoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  routeInfoValue: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  routeInfoValueError: {
    color: COLORS.error,
  },

  // Action Container
  actionContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: SPACING.md,
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  reserveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  reserveButtonText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
})
