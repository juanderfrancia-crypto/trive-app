import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COLORS, RADIUS, SPACING } from '../theme/theme'

interface Props {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  borderColor?: string
}

// Sombra real de una sola capa: shadow/elevation va en el contenedor exterior
// (sin overflow:hidden, si no iOS se la recorta) y el recorte de esquinas en
// el interior (sin shadow, si no en Android la sombra sale cuadrada).
export default function DepthCard({ children, style, contentStyle, borderColor = COLORS.border }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.front, { borderColor }, contentStyle]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    shadowColor: '#0F1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  front: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
})
