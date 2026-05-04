import React, { useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const { width, height } = Dimensions.get('window')

type OnboardingSlide = {
  id: string
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  accent: string
  badge?: {
    icon: keyof typeof Ionicons.glyphMap
    label: string
    tone: 'blue' | 'gold'
  }
}

interface OnboardingScreenProps {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList<OnboardingSlide>>(null)

  const slides = useMemo<OnboardingSlide[]>(
    () => [
      {
        id: '1',
        title: 'Viaja con\npropósito',
        description: 'Conecta con conductores\nverificados y ahorra tiempo en\ntus trayectos intermunicipales.',
        icon: 'car-sport-outline',
        accent: COLORS.primary,
        badge: { icon: 'shield-checkmark-outline', label: 'VERIFICADO', tone: 'blue' },
      },
      {
        id: '2',
        title: 'Seguridad en cada\nkilómetro',
        description:
          'Todos nuestros conductores pasan por un\nriguroso proceso de verificación para tu\ntranquilidad.',
        icon: 'shield-checkmark-outline',
        accent: COLORS.accent,
      },
      {
        id: '3',
        title: 'Dile adiós a las\nfilas',
        description:
          'Reserva tu cupo digitalmente y llega\ndirecto a tu punto de recogida sin\nesperas innecesarias.',
        icon: 'ticket-outline',
        accent: COLORS.primaryDark,
        badge: { icon: 'ticket-outline', label: 'Cupo Reservado', tone: 'gold' },
      },
    ],
    []
  )

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    setCurrentIndex(Math.max(0, Math.min(slides.length - 1, next)))
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, idx) => {
        const isActive = idx === currentIndex
        return (
          <View
            key={idx}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        )
      })}
    </View>
  )

  const isLastSlide = currentIndex === slides.length - 1

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.brand}>Trive</Text>

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{isLastSlide ? '' : 'Saltar'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.heroCard} accessibilityRole="image">
              <View style={[styles.heroGlow, { backgroundColor: item.accent + '18' }]} />
              <View style={[styles.heroGlow2, { backgroundColor: item.accent + '10' }]} />

              <View style={styles.heroIconWrap}>
                <View style={[styles.heroIconBg, { backgroundColor: item.accent + '16' }]}>
                  <Ionicons name={item.icon} size={56} color={item.accent} />
                </View>
                <View style={[styles.heroChip, { borderColor: item.accent + '35' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.heroChipText}>Conductores verificados</Text>
                </View>
              </View>

              {!!item.badge && (
                <View
                  style={[
                    styles.badge,
                    item.badge.tone === 'blue' ? styles.badgeBlue : styles.badgeGold,
                  ]}
                >
                  <Ionicons
                    name={item.badge.icon}
                    size={16}
                    color={item.badge.tone === 'blue' ? COLORS.primary : '#5A4A00'}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      item.badge.tone === 'blue' ? styles.badgeTextBlue : styles.badgeTextGold,
                    ]}
                  >
                    {item.badge.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      {/* Footer con paginación y botón */}
      <View style={styles.footer}>
        <View style={styles.paginationRow}>
          {renderPagination()}
          <Text style={styles.paginationText}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </Text>
        </View>

        {/* Botón siguiente / comenzar */}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            isLastSlide && styles.getStartedBtn,
          ]}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextBtnText}>{isLastSlide ? 'Comenzar' : 'Siguiente'}</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.stepText}>
          {isLastSlide ? `PASO ${slides.length} DE ${slides.length}` : '...'}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  skipBtn: {
    padding: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  heroCard: {
    width: '100%',
    minHeight: Math.max(240, Math.floor(height * 0.34)),
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 999,
  },
  heroGlow2: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
  },
  heroIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  heroIconBg: {
    width: 140,
    height: 140,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
  },
  heroChipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: 18,
    top: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    ...SHADOWS.sm,
  },
  badgeBlue: {
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  badgeGold: {
    backgroundColor: 'rgba(153, 122, 0, 0.86)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeTextBlue: {
    color: COLORS.primary,
  },
  badgeTextGold: {
    color: '#FFFFFF',
  },
  textBlock: {
    width: '100%',
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  description: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    paddingTop: SPACING.md,
    alignItems: 'center',
    width: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: SPACING.md,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.border,
  },
  dotInactive: {
    width: 18,
    opacity: 0.55,
  },
  dotActive: {
    width: 44,
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  paginationText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textTertiary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    gap: SPACING.sm,
    width: '100%',
    ...SHADOWS.lg,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  getStartedBtn: {
    backgroundColor: COLORS.primary,
  },
  stepText: {
    marginTop: SPACING.lg,
    ...TYPOGRAPHY.label,
    color: COLORS.textTertiary,
    letterSpacing: 2,
  },
})
