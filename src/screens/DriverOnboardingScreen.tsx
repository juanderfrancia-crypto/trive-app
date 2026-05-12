import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, RADIUS } from '../theme/theme'

const STEPS = [
  {
    number: '1',
    icon: 'document-text-outline' as const,
    title: 'Sube tus documentos',
    desc: 'Licencia de conducir y SOAT vigentes',
    color: COLORS.primary,
  },
  {
    number: '2',
    icon: 'shield-checkmark-outline' as const,
    title: 'Verificación',
    desc: 'Revisamos tus datos en 24-48 h',
    color: '#7C3AED',
  },
  {
    number: '3',
    icon: 'cash-outline' as const,
    title: '¡Publica y gana!',
    desc: 'Crea rutas y recibe pasajeros',
    color: COLORS.success,
  },
]

const REQUIREMENTS = [
  { icon: 'person-outline' as const,         text: 'Mayor de 18 años' },
  { icon: 'card-outline' as const,            text: 'Licencia categoría B vigente' },
  { icon: 'document-outline' as const,        text: 'Cédula de ciudadanía' },
  { icon: 'shield-outline' as const,          text: 'SOAT vigente' },
  { icon: 'car-outline' as const,             text: 'Vehículo en buen estado' },
]

export default function DriverOnboardingScreen() {
  const navigation = useNavigation()

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <ImageBackground
          source={require('../../assets/banners/condu.png')}
          style={s.hero}
          resizeMode="cover"
          imageStyle={{ borderRadius: RADIUS.xl }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.65)']}
            style={s.heroOverlay}
          />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroContent}>
            <View style={s.heroBadge}>
              <Ionicons name="car-sport-outline" size={13} color="#fff" />
              <Text style={s.heroBadgeText}>MODO CONDUCTOR</Text>
            </View>
            <Text style={s.heroTitle}>Conviértete en{'\n'}conductor Trive</Text>
            <Text style={s.heroSub}>Gana dinero en tu tiempo libre compartiendo tus viajes</Text>
          </View>
        </ImageBackground>

        {/* ── Cómo funciona ── */}
        <View style={s.block}>
          <Text style={s.blockTitle}>¿Cómo funciona?</Text>
          <View style={s.stepsRow}>
            {STEPS.map((step, i) => (
              <View key={step.number} style={s.stepCol}>
                <View style={[s.stepIconWrap, { backgroundColor: step.color + '15' }]}>
                  <Ionicons name={step.icon} size={22} color={step.color} />
                </View>
                <Text style={s.stepNumber}>{step.number}</Text>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
                {i < STEPS.length - 1 && <View style={s.stepArrow}><Ionicons name="chevron-forward" size={16} color={COLORS.borderLight} /></View>}
              </View>
            ))}
          </View>
        </View>

        {/* ── Comisión ── */}
        <View style={s.commissionCard}>
          <View style={s.commissionLeft}>
            <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={s.commissionInfo}>
            <Text style={s.commissionTitle}>Comisión por publicación</Text>
            <Text style={s.commissionDesc}>Se descuentan <Text style={s.commissionAmount}>$2.000</Text> de tu billetera cada vez que publicas un viaje.</Text>
          </View>
        </View>

        {/* ── Requisitos ── */}
        <View style={s.block}>
          <Text style={s.blockTitle}>Requisitos</Text>
          <View style={s.reqCard}>
            {REQUIREMENTS.map((r, i) => (
              <View key={i}>
                {i > 0 && <View style={s.reqDivider} />}
                <View style={s.reqRow}>
                  <View style={s.reqCheck}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  <Ionicons name={r.icon} size={18} color={COLORS.textSecondary} style={s.reqIcon} />
                  <Text style={s.reqText}>{r.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={s.secondaryBtnText}>Más tarde</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => navigation.navigate('DriverDocuments' as never)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.primaryBtnGrad}
          >
            <Ionicons name="arrow-forward-circle-outline" size={20} color="#fff" />
            <Text style={s.primaryBtnText}>Comenzar ahora</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.lg },

  // Hero
  hero: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    height: 260,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xl },
  backBtn: {
    margin: SPACING.md,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroContent: { padding: SPACING.xl, paddingTop: 0, gap: SPACING.sm },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 32 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 18 },

  // Blocks
  block: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  blockTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.lg, letterSpacing: -0.2 },

  // Steps
  stepsRow: { flexDirection: 'row', gap: 0 },
  stepCol: { flex: 1, alignItems: 'center', position: 'relative' },
  stepIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepNumber: { fontSize: 10, fontWeight: '800', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 3 },
  stepTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 3 },
  stepDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
  stepArrow: { position: 'absolute', right: -4, top: 14 },

  // Commission
  commissionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    marginHorizontal: SPACING.lg, marginTop: SPACING.xl,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  commissionLeft: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  commissionInfo: { flex: 1 },
  commissionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  commissionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  commissionAmount: { fontWeight: '800', color: COLORS.primary },

  // Requirements
  reqCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden',
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14, gap: SPACING.md },
  reqCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  reqIcon: { flexShrink: 0 },
  reqText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  reqDivider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: SPACING.lg + 22 + SPACING.md },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  secondaryBtn: {
    flex: 1, height: 52, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  primaryBtn: { flex: 2, height: 52, borderRadius: RADIUS.md, overflow: 'hidden' },
  primaryBtnGrad: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
