import React, { useRef, useState } from 'react'
import { View, TextInput, TouchableOpacity, ViewStyle } from 'react-native'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'

type Meridiem = 'AM' | 'PM'

const formatHHMMInput = (texto: string): string => {
  const digitos = texto.replace(/\D/g, '').slice(0, 4)
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos
}

const to12h = (hours24: number): { time: string; meridiem: Meridiem } => {
  const meridiem: Meridiem = hours24 >= 12 ? 'PM' : 'AM'
  const h12 = hours24 % 12 || 12
  return { time: String(h12).padStart(2, '0'), meridiem }
}

const parseTime12 = (texto: string, meridiem: Meridiem): { h: number; m: number } | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(texto.trim())
  if (!match) return null
  const h12 = Number(match[1])
  const minutes = Number(match[2])
  if (h12 < 1 || h12 > 12 || minutes > 59) return null
  let h = h12 % 12
  if (meridiem === 'PM') h += 12
  return { h, m: minutes }
}

const to24hText = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

const displayFromValue = (value: string): { timeText: string; meridiem: Meridiem } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return { timeText: '', meridiem: 'AM' }
  const { time, meridiem } = to12h(Number(match[1]))
  return { timeText: `${time}:${match[2]}`, meridiem }
}

interface Props {
  label: string
  /** Hora en formato de 24h "HH:MM" (lo que ya espera el resto del código/BD), o vacío. */
  value: string
  onChangeText: (value24h: string) => void
  /** Ejemplo en 12h, ej. "07:00". */
  placeholder?: string
  style?: ViewStyle
}

/**
 * Campo de hora en 12h + AM/PM en vez de hora militar (14:30) — la mayoría de la
 * gente no piensa en esos términos para decir a qué hora sale un viaje. Por fuera
 * sigue entrando/saliendo el mismo string de 24h "HH:MM" que ya usa el resto del
 * código y la base de datos, así que no cambia nada fuera de este componente.
 */
export default function TimeInput12h({ label, value, onChangeText, placeholder = '07:00', style }: Props) {
  const initial = displayFromValue(value)
  const [timeText, setTimeText] = useState(initial.timeText)
  const [meridiem, setMeridiem] = useState<Meridiem>(initial.meridiem)
  const lastEmitted = useRef(value)

  // Si el valor llega a cambiar desde afuera (reinicio de formulario, edición
  // existente) y no es un eco de lo que este mismo componente acaba de emitir,
  // se refleja acá. Evita un loop con el commit de abajo.
  if (value !== lastEmitted.current) {
    lastEmitted.current = value
    const next = displayFromValue(value)
    if (next.timeText !== timeText) setTimeText(next.timeText)
    if (next.timeText && next.meridiem !== meridiem) setMeridiem(next.meridiem)
  }

  const commit = (nextTimeText: string, nextMeridiem: Meridiem) => {
    const parsed = parseTime12(nextTimeText, nextMeridiem)
    const next = parsed ? to24hText(parsed.h, parsed.m) : ''
    lastEmitted.current = next
    onChangeText(next)
  }

  return (
    <View style={[s.field, style]}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={timeText}
          onChangeText={(t) => {
            const formatted = formatHHMMInput(t)
            setTimeText(formatted)
            commit(formatted, meridiem)
          }}
          keyboardType="number-pad"
          maxLength={5}
        />
        <View style={s.meridiemGroup}>
          <TouchableOpacity
            style={[s.meridiemBtn, meridiem === 'AM' && s.meridiemBtnActive]}
            onPress={() => { setMeridiem('AM'); commit(timeText, 'AM') }}
            activeOpacity={0.8}
          >
            <Text style={[s.meridiemText, meridiem === 'AM' && s.meridiemTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.meridiemBtn, meridiem === 'PM' && s.meridiemBtnActive]}
            onPress={() => { setMeridiem('PM'); commit(timeText, 'PM') }}
            activeOpacity={0.8}
          >
            <Text style={[s.meridiemText, meridiem === 'PM' && s.meridiemTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = {
  field: {
    borderWidth: 1 as const,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  label: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: SPACING.sm, marginTop: SPACING.xs },
  input: { flex: 1, ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary, padding: 0 },
  meridiemGroup: {
    flexDirection: 'row' as const,
    borderRadius: RADIUS.md,
    borderWidth: 1 as const,
    borderColor: COLORS.border,
    overflow: 'hidden' as const,
  },
  meridiemBtn: {
    width: 40,
    paddingVertical: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.white,
  },
  meridiemBtnActive: { backgroundColor: COLORS.primary },
  meridiemText: { ...TYPOGRAPHY.caption, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  meridiemTextActive: { color: COLORS.white },
}
