import { useRef } from 'react'
import { TextInput, View, StyleSheet } from 'react-native'
import { COLORS } from '../theme/theme'

type Props = {
  length: number
  value: string
  onChange: (value: string) => void
  editable?: boolean
  error?: boolean
  autoFocus?: boolean
}

// Casillas individuales por dígito -- evita el bug de Android donde letterSpacing +
// textAlign="center" en un solo TextInput descentra el cursor visible.
export default function OtpDigitsInput({ length, value, onChange, editable = true, error = false, autoFocus = true }: Props) {
  const refs = useRef<(TextInput | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')
  const compact = length > 6

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    onChange(newDigits.join(''))
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits]
      newDigits[index - 1] = ''
      onChange(newDigits.join(''))
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r }}
          style={[
            styles.box,
            compact && styles.boxCompact,
            digit ? styles.boxFilled : null,
            error ? styles.boxError : null,
          ]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          editable={editable}
          textAlign="center"
          autoFocus={autoFocus && i === 0}
          selectTextOnFocus
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  rowCompact: { gap: 6 },
  box: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  boxCompact: {
    height: 54,
    borderRadius: 12,
    fontSize: 19,
  },
  boxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  boxError: {
    borderColor: COLORS.error,
  },
})
