import React from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface SkeletonProps {
  width?: number | `${number}%`
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

// Matches PendingRequestsTab card: hora + pill, ruta, meta, botón, cancelar
export function SkeletonRequestCard() {
  return (
    <View style={cards.base}>
      <View style={cards.rowBetween}>
        <SkeletonItem width={90} height={13} marginBottom={0} />
        <SkeletonItem width={78} height={22} borderRadius={RADIUS.full} marginBottom={0} />
      </View>
      <SkeletonItem width="85%" height={17} marginBottom={0} />
      <SkeletonItem width="55%" height={13} marginBottom={0} />
      <SkeletonItem width="100%" height={42} borderRadius={RADIUS.md} marginBottom={0} />
      <SkeletonItem width={120} height={11} marginBottom={0} />
    </View>
  )
}

// Matches AvailableOffersTab card: hora + pill, ruta, meta, precio/costo, dos botones, link
export function SkeletonOfferCard() {
  return (
    <View style={cards.base}>
      <View style={cards.rowBetween}>
        <SkeletonItem width={90} height={13} marginBottom={0} />
        <SkeletonItem width={62} height={22} borderRadius={RADIUS.full} marginBottom={0} />
      </View>
      <SkeletonItem width="85%" height={17} marginBottom={0} />
      <SkeletonItem width="65%" height={13} marginBottom={0} />
      <View style={cards.priceBox}>
        <View style={cards.priceCol}>
          <SkeletonItem width={46} height={10} marginBottom={0} />
          <SkeletonItem width={82} height={16} marginBottom={0} />
        </View>
        <View style={[cards.priceCol, { alignItems: 'flex-end' }]}>
          <SkeletonItem width={46} height={10} marginBottom={0} />
          <SkeletonItem width={96} height={13} marginBottom={0} />
        </View>
      </View>
      <View style={cards.rowGap}>
        <SkeletonItem width="48%" height={42} borderRadius={RADIUS.md} marginBottom={0} />
        <SkeletonItem width="48%" height={42} borderRadius={RADIUS.md} marginBottom={0} />
      </View>
      <SkeletonItem width={130} height={11} marginBottom={0} />
    </View>
  )
}

// Matches ActiveTripsTab card: hora + pill, ruta, meta, dos botones
export function SkeletonTripCard() {
  return (
    <View style={cards.base}>
      <View style={cards.rowBetween}>
        <SkeletonItem width={90} height={13} marginBottom={0} />
        <SkeletonItem width={72} height={22} borderRadius={RADIUS.full} marginBottom={0} />
      </View>
      <SkeletonItem width="85%" height={17} marginBottom={0} />
      <SkeletonItem width="70%" height={13} marginBottom={0} />
      <View style={cards.rowGap}>
        <SkeletonItem width="48%" height={40} borderRadius={RADIUS.md} marginBottom={0} />
        <SkeletonItem width="48%" height={40} borderRadius={RADIUS.md} marginBottom={0} />
      </View>
    </View>
  )
}

// Matches ActiveChatsTab row: avatar + nombre/ruta/mensaje/precio + chevron
export function SkeletonChatCard() {
  return (
    <View style={cards.chatRow}>
      <SkeletonItem width={48} height={48} borderRadius={RADIUS.lg} marginBottom={0} />
      <View style={cards.chatContent}>
        <SkeletonItem width="45%" height={14} marginBottom={0} />
        <SkeletonItem width="70%" height={12} marginBottom={0} />
        <SkeletonItem width={70} height={12} marginBottom={0} />
      </View>
    </View>
  )
}

// Matches TripHistoryTab row: ícono + nombre/badge + ruta + precio/fecha
export function SkeletonHistoryCard() {
  return (
    <View style={cards.chatRow}>
      <SkeletonItem width={50} height={50} borderRadius={RADIUS.lg} marginBottom={0} />
      <View style={cards.chatContent}>
        <View style={cards.rowBetween}>
          <SkeletonItem width={100} height={14} marginBottom={0} />
          <SkeletonItem width={76} height={12} marginBottom={0} />
        </View>
        <SkeletonItem width="80%" height={12} marginBottom={0} />
        <View style={cards.rowBetween}>
          <SkeletonItem width={70} height={14} marginBottom={0} />
          <SkeletonItem width={60} height={11} marginBottom={0} />
        </View>
      </View>
    </View>
  )
}

export function SkeletonCardList({
  variant,
  count = 3,
}: {
  variant: 'request' | 'offer' | 'trip' | 'chat' | 'history'
  count?: number
}) {
  const Card = {
    request: SkeletonRequestCard,
    offer: SkeletonOfferCard,
    trip: SkeletonTripCard,
    chat: SkeletonChatCard,
    history: SkeletonHistoryCard,
  }[variant]

  return (
    <View style={styles.cardListContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
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
  cardListContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  skeleton: {
    backgroundColor: COLORS.border,
  },
})

const cards = StyleSheet.create({
  base: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowGap: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  priceCol: { gap: 4 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  chatContent: { flex: 1, gap: SPACING.xs },
})
