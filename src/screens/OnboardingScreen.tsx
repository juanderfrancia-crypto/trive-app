import React, { useRef, useState } from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity, StatusBar, FlatList, NativeScrollEvent, NativeSyntheticEvent, Image } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'
import {
  byTheRoadXml,
  certificationXml,
  sendMoneyXml,
  biometricLoginXml,
} from '../components/illustrations/onboarding/onboardingIllustrations'

const { width } = Dimensions.get('window')
const ILLUSTRATION_MAX_HEIGHT = 340
const ILLUSTRATION_MAX_WIDTH = width - SPACING.xxl * 2

type Slide = {
  id: string
  xml: string
  ratio: number
  eyebrow: string
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    id: '1',
    xml: byTheRoadXml,
    ratio: 888 / 623.13,
    eyebrow: 'RUTAS COMPARTIDAS',
    title: 'Encuentra tu ruta y reserva tu cupo',
    description: 'Busca viajes publicados por conductores y reserva en pocos toques.',
  },
  {
    id: '2',
    xml: certificationXml,
    ratio: 428.873 / 567.469,
    eyebrow: 'CONDUCTORES REGISTRADOS',
    title: 'Conoce al conductor antes de subir',
    description: 'Revisamos los documentos del conductor y del vehículo antes de publicar cualquier ruta.',
  },
  {
    id: '3',
    xml: sendMoneyXml,
    ratio: 800 / 483.13,
    eyebrow: 'PAGO SIN INTERMEDIARIOS',
    title: 'Pagas directo al conductor',
    description: 'Efectivo, Nequi, Daviplata o transferencia. Trive no retiene tu dinero.',
  },
  {
    id: '4',
    xml: biometricLoginXml,
    ratio: 933.5 / 800,
    eyebrow: 'EMPECEMOS',
    title: 'Crea tu cuenta en un minuto',
    description: 'Usa tu correo y confirma tu celular. Cada persona tiene una sola cuenta.',
  },
]

function illustrationSize(ratio: number) {
  const height = Math.min(ILLUSTRATION_MAX_HEIGHT, ILLUSTRATION_MAX_WIDTH / ratio)
  return { width: height * ratio, height }
}

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const insets = useSafeAreaInsets()
  const isLast = currentIndex === SLIDES.length - 1

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    setCurrentIndex(Math.max(0, Math.min(SLIDES.length - 1, next)))
  }

  const handleNext = () => {
    if (isLast) {
      onComplete()
      return
    }
    listRef.current?.scrollToOffset({ offset: (currentIndex + 1) * width, animated: true })
    setCurrentIndex(currentIndex + 1)
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

      <View style={styles.progress}>
        {SLIDES.map((s, idx) => (
          <View
            key={s.id}
            style={[styles.progressSegment, idx <= currentIndex ? styles.progressActive : styles.progressInactive]}
          />
        ))}
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
          <View style={[styles.slide, { width }]}>
            <View style={styles.illustrationBox}>
              <SvgXml {...illustrationSize(item.ratio)} xml={item.xml} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        {!isLast ? (
          <>
            <View style={styles.dots}>
              {SLIDES.map((s, idx) => (
                <View
                  key={s.id}
                  style={[styles.dot, idx === currentIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={onComplete} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Crear cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onComplete} activeOpacity={0.88}>
              <Text style={styles.secondaryBtnText}>Ya tengo cuenta</Text>
            </TouchableOpacity>
            <Text style={styles.terms}>Al continuar aceptas los términos de uso.</Text>
          </>
        )}
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

  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.sm,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 4 },
  progressActive: { backgroundColor: COLORS.primary },
  progressInactive: { backgroundColor: COLORS.border },

  pager: { flex: 1 },
  slide: { flex: 1, paddingTop: SPACING.lg },
  illustrationBox: {
    height: ILLUSTRATION_MAX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textBlock: { paddingHorizontal: SPACING.xxl, marginTop: SPACING.lg },
  eyebrow: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 1.4,
    color: COLORS.primary,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    textShadowColor: COLORS.shadowBlue,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginTop: SPACING.md,
  },

  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  dot: { height: 6, borderRadius: 6 },
  dotActive: { width: 22, backgroundColor: COLORS.primary },
  dotInactive: { width: 6, borderRadius: 3, backgroundColor: COLORS.grayLight },

  primaryBtn: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...TYPOGRAPHY.button, color: COLORS.white, fontWeight: TYPOGRAPHY.weight.bold },
  secondaryBtn: {
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...TYPOGRAPHY.button, color: COLORS.primary, fontWeight: TYPOGRAPHY.weight.bold },
  terms: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
})
