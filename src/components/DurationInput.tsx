import React from 'react'
import { View, TextInput, TouchableOpacity, ViewStyle } from 'react-native'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'

interface Props {
  label: string
  /** Duración total en minutos. */
  valueMinutes: number
  onChangeMinutes: (minutes: number) => void
  style?: ViewStyle
}

const PRESETS: { label: string; minutes: number }[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '1 h 30', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
]

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Duración del viaje con chips para los casos comunes + personalización con
 * horas y minutos por separado — nunca obliga a calcular "minutos totales"
 * (200 min) ni a escribir una hora militar donde un cero olvidado ("130" en vez
 * de "0130") cambia el significado por completo (13h en vez de 1h30, sin aviso).
 * Para viajes largos (10h+) la personalización cubre cualquier valor sin límite
 * práctico (hasta 23h59).
 */
export default function DurationInput({ label, valueMinutes, onChangeMinutes, style }: Props) {
  const hours = Math.floor(valueMinutes / 60)
  const minutes = valueMinutes % 60

  const setHours = (text: string) => {
    const h = clamp(Number(text.replace(/\D/g, '')) || 0, 0, 23)
    onChangeMinutes(h * 60 + minutes)
  }
  const setMinutes = (text: string) => {
    const m = clamp(Number(text.replace(/\D/g, '')) || 0, 0, 59)
    onChangeMinutes(hours * 60 + m)
  }

  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>

      <View style={s.chipRow}>
        {PRESETS.map((p) => {
          const active = valueMinutes === p.minutes
          return (
            <TouchableOpacity
              key={p.minutes}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onChangeMinutes(p.minutes)}
              activeOpacity={0.85}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={s.customRow}>
        <Text style={s.customLabel}>Personalizado</Text>
        <View style={s.customField}>
          <TextInput
            style={s.customInput}
            value={String(hours)}
            onChangeText={setHours}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={s.customUnit}>h</Text>
        </View>
        <View style={s.customField}>
          <TextInput
            style={s.customInput}
            value={String(minutes).padStart(2, '0')}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={s.customUnit}>min</Text>
        </View>
      </View>
    </View>
  )
}

const s = {
  wrap: {
    borderWidth: 1 as const,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  label: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1 as const,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  customRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: SPACING.sm },
  customLabel: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, flex: 1 },
  customField: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderWidth: 1 as const,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  customInput: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    padding: 0,
    width: 22,
    textAlign: 'right' as const,
  },
  customUnit: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
}
