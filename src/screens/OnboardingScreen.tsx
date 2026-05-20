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
  Image,
  ImageSourcePropType,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../theme/theme'

const { width, height } = Dimensions.get('window')
const HERO_H = Math.round(height * 0.64)

type Slide = {
  id: string
  image: ImageSourcePropType
  eyebrow: string
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    id: '1',
    image: require('../../assets/mocks/onboarding-1.png'),
    eyebrow: 'MOVILIDAD INTERMUNICIPAL',
    title: 'Tu viaje,\na tu manera',
    description:
      'Conecta con conductores verificados y reserva tu cupo en segundos. Sin filas, sin intermediarios.',
  },
  {
    id: '2',
    image: require('../../assets/mocks/onboarding-2.png'),
    eyebrow: 'SEGURIDAD GARANTIZADA',
    title: 'Conductores\ncertificados',
    description:
      'Verificación de identidad, antecedentes y vehículo en cada conductor que se une a Trive.',
  },
  {
    id: '3',
    image: require('../../assets/mocks/onboarding-3.png'),
    eyebrow: 'RESERVA DIGITAL',
    title: 'Listo en\nmenos de un minuto',
    description:
      'Busca tu ruta, reserva tu cupo y listo. Todo desde tu celular en segundos.',
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
      <StatusBar barStyle="light-content" backgroundColor="#0a1a5c" translucent={false} />

      {/* ── Hero: imagen a pantalla completa ─────────────────── */}
      <View style={styles.heroArea}>
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
            <View style={styles.slideVisual}>
              <Image
                source={item.image}
                style={styles.slideImage}
                resizeMode="cover"
              />
              {/* Fade suave hacia la tarjeta blanca */}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.75)', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.imageFade}
              />
            </View>
          )}
        />

        {/* Header flotante sobre la imagen */}
        <View style={styles.header}>
          <Text style={styles.brand}>TRIVE</Text>
          {!isLast && (
            <TouchableOpacity onPress={onComplete} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tarjeta de texto blanca ─────────────────────────── */}
      <View style={styles.textCard}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>

        {/* Barra de progreso segmentada */}
        <View style={styles.progressRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressSeg,
                { backgroundColor: idx <= currentIndex ? '#1230B8' : '#E5E7EB' },
              ]}
            />
          ))}
        </View>

        {/* CTA con gradiente */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#0E2699', '#1230B8', '#1A3FCC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>
              {isLast ? 'Comenzar ahora' : 'Continuar'}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>

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
    backgroundColor: '#FFFFFF',
  },

  // ── Hero área ───────────────────────────────────────────────
  heroArea: {
    height: HERO_H,
    overflow: 'hidden',
  },
  slideVisual: {
    width,
    height: HERO_H,
  },
  slideImage: {
    width,
    height: HERO_H,
  },
  imageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_H * 0.38,
  },

  // Header flotante
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
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
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Tarjeta blanca ──────────────────────────────────────────
  textCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#1230B8',
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: '#0A1628',
    letterSpacing: -0.8,
    marginBottom: 10,
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
    marginTop: 16,
    marginBottom: 14,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 99,
  },

  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
