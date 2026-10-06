import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COLORS, RADIUS, SPACING } from '../theme/theme'

interface Props {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  borderColor?: string
}

// Sombra en capas translúcidas: la elevación de Android sale cuadrada en algunos equipos.
export default function DepthCard({ children, style, contentStyle, borderColor = COLORS.border }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.shadowOuter} />
      <View style={styles.shadowInner} />
      <View style={[styles.front, { borderColor }, contentStyle]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
  },
  shadowOuter: {
    position: 'absolute',
    top: SPACING.sm,
    left: -SPACING.xs,
    right: -SPACING.xs,
    bottom: -SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.shadowSoft,
  },
  shadowInner: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs / 2,
    right: SPACING.xs / 2,
    bottom: -SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.shadowSoftStrong,
  },
  front: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
})
