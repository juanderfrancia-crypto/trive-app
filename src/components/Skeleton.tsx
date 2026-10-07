import { COLORS } from '../theme/theme'
import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native'
import { SPACING, RADIUS } from '../theme/theme'
import DepthCard from './DepthCard'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - SPACING.lg * 2

function useShimmer() {
  const anim = useRef(new Animated.Value(0.35)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
    return () => anim.setValue(0.35)
  }, [anim])
  return anim
}

// White card matching new HomeScreen carousel cards
export function SkeletonRouteCard() {
  const opacity = useShimmer()
  return (
    <View style={sk.routeCard}>
      <View style={sk.routeCardInner}>
        {/* Route track + names section */}
        <View style={sk.routeTop}>
          <View style={sk.routeRouteWrap}>
            {/* Track with dots and line */}
            <View style={sk.routeTrack}>
              <Animated.View style={[sk.skeletonDot, { opacity }]} />
              <View style={sk.skeletonLine} />
              <Animated.View style={[sk.skeletonDot, { opacity }]} />
            </View>
            {/* Origin and destination names */}
            <View style={sk.routeNames}>
              <Animated.View style={[sk.bar, { width: '70%', height: 15, opacity }]} />
              <Animated.View style={[sk.bar, { width: '65%', height: 14, opacity }]} />
            </View>
          </View>
          {/* Meta info (price, time) */}
          <View style={sk.routeMetaColumn}>
            <Animated.View style={[sk.bar, { width: 50, height: 16, opacity }]} />
            <Animated.View style={[sk.bar, { width: 65, height: 11, opacity }]} />
            <Animated.View style={[sk.bar, { width: 45, height: 11, opacity }]} />
          </View>
        </View>

        <View style={sk.dividerLight} />

        {/* Driver section */}
        <View style={sk.driverRow}>
          <Animated.View style={[sk.driverAvatarCircle, { opacity }]} />
          <View style={{ flex: 1, gap: 5 }}>
            <Animated.View style={[sk.bar, { width: '55%', height: 13, opacity }]} />
            <Animated.View style={[sk.bar, { width: '40%', height: 11, opacity }]} />
          </View>
          <Animated.View style={[sk.vehicleImageSk, { opacity }]} />
        </View>
      </View>
    </View>
  )
}

// Matches AirportFeedScreen cards (DepthCard, avatar, ruta con pines, chips, botones)
export function SkeletonAirportCard() {
  const opacity = useShimmer()
  return (
    <DepthCard style={sk.cardWrap} contentStyle={sk.depthContent}>
      <View style={sk.cardTop}>
        <Animated.View style={[sk.avatarCircle, { opacity }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View style={[sk.barGray, { width: '50%', height: 14, opacity }]} />
          <Animated.View style={[sk.barGray, { width: '38%', height: 11, opacity }]} />
        </View>
        <Animated.View style={[sk.barGray, { width: 64, height: 18, opacity }]} />
      </View>

      <View style={sk.routeBoxV2}>
        <View style={sk.routeLineV2}>
          <Animated.View style={[sk.dotV2, { opacity }]} />
          <View style={sk.lineSegmentV2} />
          <Animated.View style={[sk.dotV2, { opacity }]} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[sk.barGray, { width: '75%', height: 13, opacity }]} />
          <Animated.View style={[sk.barGray, { width: '60%', height: 13, opacity }]} />
        </View>
        <Animated.View style={[sk.barGray, { width: 86, height: 22, borderRadius: RADIUS.full, opacity }]} />
      </View>

      <View style={sk.chipsRow}>
        <Animated.View style={[sk.chip, { opacity }]} />
        <Animated.View style={[sk.chip, { width: 120, opacity }]} />
      </View>

      <View style={sk.buttonRowV2}>
        <Animated.View style={[sk.btnHalf, { opacity }]} />
        <Animated.View style={[sk.btnHalf, { opacity }]} />
      </View>
    </DepthCard>
  )
}

// Matches AvailableRidesScreen "ticket" cards (hora, ruta, vehículo, cupos, precio)
export function SkeletonRideCard() {
  const opacity = useShimmer()
  return (
    <View style={sk.ticketSk}>
      <View style={sk.ticketTopSk}>
        <View style={sk.ticketHeadSk}>
          <Animated.View style={[sk.timePillSk, { opacity }]} />
          <Animated.View style={[sk.favBtnSk, { opacity }]} />
        </View>
        <View style={sk.ticketBodySk}>
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View style={[sk.barGray, { width: '80%', height: 15, opacity }]} />
            <Animated.View style={[sk.barGray, { width: '60%', height: 11, opacity }]} />
            <View style={sk.ticketDriverRowSk}>
              <Animated.View style={[sk.barGray, { width: 70, height: 11, opacity }]} />
              <Animated.View style={[sk.barGray, { width: 30, height: 11, opacity }]} />
            </View>
          </View>
          <Animated.View style={[sk.vehicleBoxSk, { opacity }]} />
        </View>
      </View>

      <View style={sk.perforationSk} />

      <View style={sk.ticketBottomSk}>
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View style={[sk.barGray, { width: 48, height: 10, opacity }]} />
          <View style={sk.seatRowSk}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Animated.View key={i} style={[sk.seatBoxSk, { opacity }]} />
            ))}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Animated.View style={[sk.barGray, { width: 56, height: 10, opacity }]} />
          <Animated.View style={[sk.barGray, { width: 70, height: 20, opacity }]} />
        </View>
      </View>
    </View>
  )
}

const LIGHT = 'rgba(255,255,255,0.2)'
const GRAY  = COLORS.border

const sk = StyleSheet.create({
  // ── Route card (white) ──────────────────────────────────────────────────
  routeCard: {
    width: CARD_W,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primaryTint,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  routeCardInner: { 
    backgroundColor: COLORS.white,
    paddingHorizontal: 0, 
    paddingVertical: 0 
  },
  bar: { borderRadius: 6, backgroundColor: GRAY },
  pill: { width: 68, height: 26, borderRadius: RADIUS.full, backgroundColor: GRAY },
  
  // Route top section - route track + names + meta info
  routeTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.lg, 
    paddingBottom: 12,
    gap: 10,
    marginBottom: 0 
  },
  routeRouteWrap: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginRight: 0 
  },
  routeTrack: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  skeletonDot: {
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: GRAY,
  },
  skeletonLine: {
    width: 1.5, 
    height: 14, 
    backgroundColor: GRAY,
  },
  routeNames: { 
    flex: 1, 
    gap: 8 
  },
  routeMetaColumn: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  
  dividerLight: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginHorizontal: SPACING.lg,
    marginBottom: 0, 
    marginTop: 0 
  },
  
  // Driver row
  driverRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: 12,
    gap: SPACING.sm 
  },
  driverAvatarCircle: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: GRAY,
    flexShrink: 0,
  },
  vehicleImageSk: { 
    width: 100, 
    height: 70, 
    borderRadius: RADIUS.sm,
    backgroundColor: GRAY,
    flexShrink: 0,
  },

  // ── Airport card (DepthCard) ─────────────────────────────────────────────
  cardWrap: { marginBottom: SPACING.md },
  depthContent: { padding: SPACING.lg, gap: SPACING.md },
  barGray: { borderRadius: 6, backgroundColor: GRAY },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: GRAY },
  routeBoxV2: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  routeLineV2: { alignItems: 'center', gap: 3 },
  dotV2: { width: 10, height: 10, borderRadius: 5, backgroundColor: GRAY },
  lineSegmentV2: { width: 1.5, height: 18, backgroundColor: GRAY },
  chipsRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: { width: 90, height: 28, borderRadius: RADIUS.sm, backgroundColor: GRAY },
  buttonRowV2: { flexDirection: 'row', gap: SPACING.sm },
  btnHalf: { flex: 1, height: 46, borderRadius: RADIUS.md, backgroundColor: GRAY },

  // ── Ride ticket card ──────────────────────────────────────────────────────
  ticketSk: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  ticketTopSk: { padding: SPACING.lg, gap: SPACING.sm },
  ticketHeadSk: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePillSk: { width: 70, height: 26, borderRadius: RADIUS.full, backgroundColor: GRAY },
  favBtnSk: { width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: GRAY },
  ticketBodySk: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ticketDriverRowSk: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  vehicleBoxSk: { width: 84, height: 54, borderRadius: RADIUS.sm, backgroundColor: GRAY, flexShrink: 0 },
  perforationSk: {
    height: 1.5,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  ticketBottomSk: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  seatRowSk: { flexDirection: 'row', gap: 4 },
  seatBoxSk: { width: 16, height: 16, borderRadius: 4, backgroundColor: GRAY },
})
