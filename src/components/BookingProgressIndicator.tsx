import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../theme/theme'

interface BookingProgressIndicatorProps {
  /**
   * Current step (1, 2, or 3)
   * 1 = Search
   * 2 = Seat Selection
   * 3 = Booking Confirmation
   */
  step: 1 | 2 | 3
  /**
   * Optional: animated opacity for smooth transitions
   */
  opacity?: Animated.Value | number
}

const STEPS = [
  { number: 1, label: 'Búsqueda', icon: 'search-outline' },
  { number: 2, label: 'Asientos', icon: 'seat-outline' },
  { number: 3, label: 'Confirmación', icon: 'checkmark-done-outline' },
]

export const BookingProgressIndicator: React.FC<BookingProgressIndicatorProps> = ({
  step,
  opacity = 1,
}) => {
  const animatedStyle = useMemo(
    () => ({
      opacity: opacity instanceof Animated.Value ? opacity : new Animated.Value(opacity),
    }),
    [opacity]
  )

  return (
    <Animated.View style={[styles.container, { opacity: animatedStyle.opacity }]}>
      <View style={styles.stepsContainer}>
        {STEPS.map((s, index) => {
          const isActive = s.number <= step
          const isCurrent = s.number === step
          const isCompleted = s.number < step

          return (
            <View key={s.number} style={styles.stepWrapper}>
              {/* Step circle */}
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && styles.stepCircleCurrent,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive,
                    ]}
                  >
                    {s.number}
                  </Text>
                )}
              </View>

              {/* Step label */}
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCurrent && styles.stepLabelCurrent,
                ]}
              >
                {s.label}
              </Text>

              {/* Connector line (not on last step) */}
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isActive && styles.connectorActive,
                  ]}
                />
              )}
            </View>
          )
        })}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceVariant || '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success || '#10B981',
    borderColor: COLORS.success || '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  connector: {
    position: 'absolute',
    top: 19,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: -1,
  },
  connectorActive: {
    backgroundColor: COLORS.primary,
  },
})
