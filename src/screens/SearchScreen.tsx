import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'

const MIN_PASSENGERS = 1
const MAX_PASSENGERS = 8

type RouteParams = { origin?: string; destination?: string }

// Reserva1: buscar. Los datos de origen y destino vienen del store (buscador de Inicio)
// o de los parámetros de navegación (rutas favoritas).
export default function SearchScreen() {
  const navigation = useNavigation<any>()
  const routeNav = useRoute()
  const searchParams = useAppStore((s) => s.searchParams)
  const params = (routeNav.params ?? {}) as RouteParams

  const [origin, setOrigin] = useState(searchParams?.origin || params.origin || '')
  const [destination, setDestination] = useState(searchParams?.destination || params.destination || '')
  const [passengers, setPassengers] = useState(2)

  const canSearch = origin.trim().length > 0 && destination.trim().length > 0

  const handleSearch = () => {
    if (!canSearch) return
    navigation.navigate('AvailableRides', {
      origin: origin.trim(),
      destination: destination.trim(),
      passengers,
    })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[styles.stepSeg, n === 1 && styles.stepSegActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Paso 1 de 5 · Buscar</Text>

        <Text style={styles.title}>¿A dónde quieres ir?</Text>

        <View style={styles.routeCard}>
          <View style={styles.routeField}>
            <Text style={styles.fieldLabel}>Origen</Text>
            <TextInput
              style={styles.fieldInput}
              value={origin}
              onChangeText={setOrigin}
              placeholder="Ciudad de salida"
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="next"
            />
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeField}>
            <Text style={styles.fieldLabel}>Destino</Text>
            <TextInput
              style={styles.fieldInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="Ciudad de llegada"
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
        </View>

        <View style={styles.pairRow}>
          <View style={styles.pairCard}>
            <Text style={styles.fieldLabel}>Fecha</Text>
            <Text style={styles.pairValue}>Hoy</Text>
          </View>
          <View style={styles.pairCard}>
            <Text style={styles.fieldLabel}>Pasajeros</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setPassengers((p) => Math.max(MIN_PASSENGERS, p - 1))}
                disabled={passengers <= MIN_PASSENGERS}
                accessibilityLabel="Quitar pasajero"
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperSign, passengers <= MIN_PASSENGERS && styles.stepperSignDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.pairValue}>{passengers}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setPassengers((p) => Math.min(MAX_PASSENGERS, p + 1))}
                disabled={passengers >= MAX_PASSENGERS}
                accessibilityLabel="Agregar pasajero"
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperSign, passengers >= MAX_PASSENGERS && styles.stepperSignDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.note}>Solo verás conductores con cupos libres para la fecha y el número de pasajeros.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !canSearch && styles.ctaDisabled]}
          onPress={handleSearch}
          disabled={!canSearch}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, !canSearch && styles.ctaTextDisabled]}>Buscar cupos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg },

  stepRow: { flexDirection: 'row', gap: 6 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepSegActive: { backgroundColor: COLORS.primary },
  stepLabel: { marginTop: 10, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  title: { marginTop: 22, fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5, lineHeight: 32 },

  routeCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
  },
  routeField: { paddingHorizontal: 18, paddingVertical: 14 },
  routeDivider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  fieldInput: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2, padding: 0 },

  pairRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  pairCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pairValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: -2 },
  stepperSignDisabled: { color: COLORS.textTertiary },

  note: { marginTop: 16, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  cta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: COLORS.surfaceAlt },
  ctaText: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse },
  ctaTextDisabled: { color: COLORS.textTertiary },
})
