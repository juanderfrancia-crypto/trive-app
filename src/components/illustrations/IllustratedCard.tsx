import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { COLORS } from '../../theme/theme'
import { SCENES, SceneName } from './Scenes'

type Tone = 'brand' | 'light'

type Props = {
  scene: SceneName
  tone?: Tone
  style?: StyleProp<ViewStyle>
  sceneWidth?: number
  sceneHeight?: number
  children?: React.ReactNode
}

const PALETTE: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: COLORS.primary, fg: COLORS.white },
  light: { bg: COLORS.primaryTint, fg: COLORS.primary },
}

export default function IllustratedCard({ scene, tone = 'brand', style, sceneWidth, sceneHeight, children }: Props) {
  const { bg, fg } = PALETTE[tone]
  const Scene = SCENES[scene]
  return (
    <View style={[styles.card, { backgroundColor: bg }, style]}>
      <View pointerEvents="none" style={styles.scene}>
        <Scene fg={fg} bg={bg} width={sceneWidth} height={sceneHeight} />
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  scene: { position: 'absolute', right: 0, bottom: 0 },
})
