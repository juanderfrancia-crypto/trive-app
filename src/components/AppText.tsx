import React, { forwardRef } from 'react'
import { Text as RNText, TextProps, StyleSheet } from 'react-native'

const FAMILY = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const

function familyForWeight(weight: unknown): string {
  const w = String(weight ?? '400')
  if (w === '800' || w === '900') return FAMILY.extrabold
  if (w === '700' || w === 'bold') return FAMILY.bold
  if (w === '600') return FAMILY.semibold
  if (w === '500') return FAMILY.medium
  return FAMILY.regular
}

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const flat = StyleSheet.flatten(props.style) as { fontWeight?: unknown; fontFamily?: string } | undefined
  const fontFamily = flat?.fontFamily ?? familyForWeight(flat?.fontWeight)
  return <RNText ref={ref} {...props} style={[{ fontFamily }, props.style]} />
})
