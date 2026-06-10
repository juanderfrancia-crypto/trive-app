import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SPACING, RADIUS } from '../theme/theme'

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

// White card matching AirportFeedScreen cards
export function SkeletonAirportCard() {
  const opacity = useShimmer()
  return (
    <View style={sk.airportCard}>
      <View style={sk.cardTop}>
        <Animated.View style={[sk.avatarCircle, { opacity }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View style={[sk.barGray, { width: '52%', height: 13, opacity }]} />
          <Animated.View style={[sk.barGray, { width: '68%', height: 10, opacity }]} />
        </View>
        <Animated.View style={[sk.priceBadgeSk, { opacity }]} />
      </View>

      <View style={sk.routeBox}>
        <View style={sk.routeLine}>
          <View style={sk.dotGreen} />
          <View style={sk.lineSegment} />
          <View style={sk.dotGray} />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Animated.View style={[sk.barGray, { width: '78%', height: 12, opacity }]} />
          <Animated.View style={[sk.barGray, { width: '65%', height: 12, opacity }]} />
        </View>
      </View>

      <View style={sk.chipsRow}>
        <Animated.View style={[sk.chip, { opacity }]} />
        <Animated.View style={[sk.chip, { width: 120, opacity }]} />
      </View>

      <Animated.View style={[sk.acceptBtnSk, { opacity }]} />
    </View>
  )
}

// White card matching AvailableRidesScreen cards
export function SkeletonRideCard() {
  const opacity = useShimmer()
  return (
    <View style={sk.rideCard}>
      <View style={sk.rideRoute}>
        <Animated.View style={[sk.barGray, { flex: 1, height: 13, opacity }]} />
        <Animated.View style={[sk.arrowCircle, { opacity }]} />
        <Animated.View style={[sk.barGray, { flex: 1, height: 13, opacity }]} />
      </View>

      <View style={sk.rideMeta}>
        <Animated.View style={[sk.barGray, { width: 68, height: 34, borderRadius: RADIUS.md, opacity }]} />
        <Animated.View style={[sk.barGray, { width: 68, height: 34, borderRadius: RADIUS.md, opacity }]} />
        <Animated.View style={[sk.barGray, { width: 68, height: 34, borderRadius: RADIUS.md, opacity }]} />
      </View>

      <View style={sk.dividerLight} />

      <View style={sk.rideDriver}>
        <Animated.View style={[sk.driverCircle, { opacity }]} />
        <View style={{ flex: 1, gap: 5 }}>
          <Animated.View style={[sk.barGray, { width: '55%', height: 13, opacity }]} />
          <Animated.View style={[sk.barGray, { width: '32%', height: 11, opacity }]} />
        </View>
        <Animated.View style={[sk.reserveBtnSk, { opacity }]} />
      </View>

      <View style={sk.dividerLight} />

      <View style={sk.vehicleRow}>
        <Animated.View style={[sk.barGray, { width: 72, height: 28, borderRadius: RADIUS.sm, opacity }]} />
        <Animated.View style={[sk.barGray, { width: 80, height: 11, opacity }]} />
        <Animated.View style={[sk.barGray, { width: 62, height: 28, borderRadius: RADIUS.sm, opacity }]} />
      </View>
    </View>
  )
}

const LIGHT = 'rgba(255,255,255,0.2)'
const GRAY  = '#E5E7EB'

const sk = StyleSheet.create({
  // ── Route card (white) ──────────────────────────────────────────────────
  routeCard: {
    width: CARD_W,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDFF',
    shadowColor: '#1230B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  routeCardInner: { 
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E5E7EB', 
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

  // ── Airport card (white) ────────────────────────────────────────────────────
  airportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  barGray: { borderRadius: 6, backgroundColor: GRAY },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: GRAY },
  priceBadgeSk: { width: 72, height: 30, borderRadius: RADIUS.sm, backgroundColor: '#D1FAE5' },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  routeLine: { alignItems: 'center', gap: 3 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  lineSegment: { width: 1.5, height: 18, backgroundColor: '#D1D5DB' },
  dotGray: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  chipsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: { width: 90, height: 28, borderRadius: RADIUS.sm, backgroundColor: GRAY },
  acceptBtnSk: { height: 46, borderRadius: RADIUS.md, backgroundColor: '#C7D2FE' },

  // ── Ride card (white) ───────────────────────────────────────────────────────
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  rideRoute: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  arrowCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: GRAY },
  rideMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rideDriver: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  driverCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: GRAY },
  reserveBtnSk: { width: 90, height: 36, borderRadius: RADIUS.md, backgroundColor: GRAY },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
})
