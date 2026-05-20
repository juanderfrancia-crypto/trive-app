import React, { useRef, useState } from 'react'
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
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../theme/theme'

const { width, height } = Dimensions.get('window')
const HERO_H = Math.round(height * 0.52)

type Slide = {
  id: string
  eyebrow: string
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  colors: readonly [string, string, string]
  accent: string
  stat: { value: string; label: string }
}

const SLIDES: Slide[] = [
  {
    id: '1',
    eyebrow: 'MOVILIDAD INTERMUNICIPAL',
    title: 'Tu viaje,\na tu manera',
    description:
      'Conecta con conductores verificados y reserva tu cupo en segundos. Sin filas, sin intermediarios.',
    icon: 'car-sport-outline',
    colors: ['#050D1F', '#0A2860', '#154AA8'] as const,
    accent: '#6DB8FF',
    stat: { value: '+2.000', label: 'viajes realizados' },
  },
  {
    id: '2',
    eyebrow: 'SEGURIDAD GARANTIZADA',
    title: 'Conductores\ncertificados',
    description:
      'Verificación de identidad, antecedentes y vehículo en cada conductor que se une a Trive.',
    icon: 'shield-checkmark-outline',
    colors: ['#041420', '#083040', '#0D5060'] as const,
    accent: '#4FC3A1',
    stat: { value: '100%', label: 'verificados' },
  },
  {
    id: '3',
    eyebrow: 'RESERVA DIGITAL',
    title: 'Listo en\nmenos de un minuto',
    description:
      'Elige tu asiento, paga de forma segura y recibe tu confirmación al instante.',
    icon: 'phone-portrait-outline',
    colors: ['#08081E', '#101850', '#1A2888'] as const,
    accent: '#FFB547',
    stat: { value: '< 60s', label: 'para reservar' },
  },
]

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const slide = SLIDES[currentIndex]
  const isLast = currentIndex === SLIDES.length - 1

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    setCurrentIndex(Math.max(0, Math.min(SLIDES.length - 1, next)))
  }

  const handleNext = () => {
    if (!isLast) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    } else {
      onComplete()
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#050D1F" />

      {/* ── Hero oscuro ─────────────────────────────────────── */}
      <View style={styles.heroArea}>
        {/* Header fijo sobre el área oscura */}
        <View style={styles.header}>
          <Text style={styles.brand}>TRIVE</Text>
          {!isLast && (
            <TouchableOpacity onPress={onComplete} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides visuales */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.slideVisual}
            >
              {/* Glows decorativos */}
              <View style={[styles.glow1, { backgroundColor: item.accent + '22' }]} />
              <View style={[styles.glow2, { backgroundColor: item.accent + '10' }]} />

              {/* Icono con anillos de profundidad */}
              <View style={styles.iconStack}>
                <View style={[styles.iconRingOuter, { borderColor: item.accent + '18' }]} />
                <View style={[styles.iconRingInner, { borderColor: item.accent + '30' }]} />
                <View style={[styles.iconCore, { backgroundColor: item.accent + '25' }]}>
                  <Ionicons name={item.icon} size={68} color="#FFFFFF" />
                </View>
              </View>

              {/* Estadística / trust indicator */}
              <View style={styles.statPill}>
                <Text style={[styles.statValue, { color: item.accent }]}>
                  {item.stat.value}
                </Text>
                <Text style={styles.statSep}>·</Text>
                <Text style={styles.statLabel}>{item.stat.label}</Text>
              </View>
            </LinearGradient>
          )}
        />
      </View>

      {/* ── Tarjeta de texto blanca ─────────────────────────── */}
      <View style={styles.textCard}>
        {/* Eyebrow */}
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>

        {/* Título */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Descripción */}
        <Text style={styles.description}>{slide.description}</Text>

        {/* Barra de progreso segmentada */}
        <View style={styles.progressRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressSeg,
                { backgroundColor: idx <= currentIndex ? COLORS.primary : '#E5E7EB' },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={styles.btnText}>
            {isLast ? 'Comenzar ahora' : 'Continuar'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>

        {/* Contador de pasos */}
        <Text style={styles.stepLabel}>
          {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050D1F',
  },

  // ── Hero área oscura ────────────────────────────────────────
  heroArea: {
    height: HERO_H,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },

  slideVisual: {
    width,
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 60,
    paddingBottom: 24,
  },
  glow1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -60,
    right: -80,
  },
  glow2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -40,
    left: -60,
  },

  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
  },
  iconRingOuter: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1,
  },
  iconRingInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
  },
  iconCore: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statSep: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

  // ── Tarjeta blanca ──────────────────────────────────────────
  textCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: COLORS.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: '#0A1628',
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
    fontWeight: '400',
    flex: 1,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    marginBottom: 16,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 99,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 56,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  stepLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
    letterSpacing: 1.5,
    paddingBottom: 4,
  },
})
