import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COLORS, RADIUS, SPACING } from '../theme/theme'

interface Props {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

// Profundidad sin sombra de elevación: en algunos Android la sombra sale cuadrada.
export default function DepthCard({ children, style, contentStyle }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.base} />
      <View style={[styles.front, contentStyle]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.sm,
  },
  base: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: -SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryTint,
  },
  front: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
})
