import React, { useRef, useState } from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity, StatusBar, FlatList, NativeScrollEvent, NativeSyntheticEvent, Image } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import Icon from '../components/Icon'
import Illustration, { type IllustrationName } from '../components/illustrations/Illustration'

const { width } = Dimensions.get('window')

type Slide = {
  id: string
  illustration: IllustrationName
  eyebrow: string
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    id: '1',
    illustration: 'routePlanning',
    eyebrow: 'MOVILIDAD INTERMUNICIPAL',
    title: 'Viaja cuando quieras',
    description: 'Encuentra cupo en la ruta que necesitas y reserva en segundos, sin filas ni intermediarios.',
  },
  {
    id: '2',
    illustration: 'personalFile',
    eyebrow: 'CONDUCTORES VERIFICADOS',
    title: 'Viaja con confianza',
    description: 'Revisamos los documentos y el vehículo de cada conductor antes de que pueda publicar una ruta.',
  },
  {
    id: '3',
    illustration: 'mobileEncryption',
    eyebrow: 'TODO DESDE TU CELULAR',
    title: 'Reserva en minutos',
    description: 'Busca tu ruta, reserva tu cupo y sigue el estado de tu viaje desde un solo lugar.',
  },
]

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const insets = useSafeAreaInsets()
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={[styles.topBar, { paddingTop: insets.top > 0 ? SPACING.sm : SPACING.md }]}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        {!isLast ? (
          <TouchableOpacity onPress={onComplete} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.illustrationCard}>
              <Illustration name={item.illustration} width={Math.min(width - 96, 260)} />
            </View>
          </View>
        )}
      />

      <View style={styles.textBlock}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.88}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>{isLast ? 'Comenzar' : 'Continuar'}</Text>
            <Icon name={isLast ? 'CircleCheck' : 'ArrowRight'} size={18} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  logo: { width: 124, height: 56 },
  skipBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
  },
  skipText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary },
  skipPlaceholder: { width: 64, height: 32 },

  pager: { flexGrow: 0, height: 380 },
  slide: { width, height: 380, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  illustrationCard: {
    width: '100%',
    height: 320,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textBlock: { paddingHorizontal: SPACING.xxl, paddingTop: SPACING.md, flex: 1 },
  eyebrow: { ...TYPOGRAPHY.labelSmall, fontWeight: '700', letterSpacing: 1.6, color: COLORS.primary, marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.md },
  description: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 24 },

  footer: { paddingHorizontal: SPACING.xxl, paddingBottom: SPACING.lg, gap: SPACING.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  dotInactive: { width: 8, backgroundColor: COLORS.border },

  btn: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  btnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: '800' },
})
