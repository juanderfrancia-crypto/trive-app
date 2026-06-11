import React from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { COLORS, SPACING, RADIUS } from '../theme/theme'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  marginBottom?: number
}

export function SkeletonItem({ width = '100%', height = 60, borderRadius = RADIUS.lg, marginBottom = SPACING.md }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.3)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          marginBottom,
          opacity,
        },
      ]}
    />
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  skeleton: {
    backgroundColor: COLORS.border,
  },
})
