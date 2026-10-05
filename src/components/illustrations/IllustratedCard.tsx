import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { COLORS, RADIUS, SPACING } from '../../theme/theme'
import Illustration, { type IllustrationName } from './Illustration'

type Props = {
  illustration: IllustrationName
  illustrationWidth?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export default function IllustratedCard({ illustration, illustrationWidth = 96, style, children }: Props) {
  return (
    <View style={[styles.card, style]}>
      <View pointerEvents="none" style={styles.panel}>
        <Illustration name={illustration} width={illustrationWidth} />
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: COLORS.primary },
  panel: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
  },
})
