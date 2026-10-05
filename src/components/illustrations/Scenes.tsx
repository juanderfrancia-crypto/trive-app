import React from 'react'
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg'

export type SceneProps = {
  width?: number
  height?: number
  fg: string
  bg: string
}

const VB = '0 0 160 120'

export function WheelScene({ width = 150, height = 112, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Ellipse cx="80" cy="112" rx="58" ry="4" fill={fg} opacity={0.18} />
      <Circle cx="92" cy="50" r="34" stroke={fg} strokeWidth={7} fill="none" />
      <Path d="M92 50 L92 24 M92 50 L114 62 M92 50 L70 62" stroke={fg} strokeWidth={6} strokeLinecap="round" />
      <Circle cx="92" cy="50" r="8" fill={bg} stroke={fg} strokeWidth={4} />
      <Path d="M18 96 C 40 80, 56 104, 80 90 S 118 82, 140 70" stroke={fg} strokeWidth={3} strokeDasharray="5 6" fill="none" strokeLinecap="round" />
      <Circle cx="18" cy="96" r="6" fill={fg} />
      <Circle cx="140" cy="70" r="6" fill={bg} stroke={fg} strokeWidth={3} />
    </Svg>
  )
}

export function TripsScene({ width = 120, height = 90, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Path d="M-10 100 C 40 70, 90 110, 170 56" stroke={fg} strokeWidth={22} opacity={0.22} fill="none" />
      <Path d="M22 96 C 52 60, 88 96, 124 46" stroke={fg} strokeWidth={3} strokeDasharray="6 6" fill="none" strokeLinecap="round" />
      <Circle cx="22" cy="96" r="8" fill={fg} />
      <Path d="M124 26 C 124 14, 136 10, 136 0 A 12 12 0 1 0 112 0 C 112 10, 124 14, 124 26 Z" fill={bg} stroke={fg} strokeWidth={3} />
      <Circle cx="124" cy="10" r="4" fill={fg} />
    </Svg>
  )
}

export function ChatScene({ width = 120, height = 90, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Rect x="10" y="22" width="92" height="52" rx="18" fill={fg} opacity={0.9} />
      <Path d="M28 74 L22 90 L44 74 Z" fill={fg} opacity={0.9} />
      <Circle cx="40" cy="48" r="5" fill={bg} />
      <Circle cx="56" cy="48" r="5" fill={bg} />
      <Circle cx="72" cy="48" r="5" fill={bg} />
      <Rect x="58" y="60" width="96" height="40" rx="16" fill={bg} stroke={fg} strokeWidth={3} />
      <Rect x="72" y="72" width="60" height="6" rx="3" fill={fg} opacity={0.6} />
      <Rect x="72" y="84" width="38" height="6" rx="3" fill={fg} opacity={0.35} />
    </Svg>
  )
}

export function EarningsScene({ width = 150, height = 110, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Rect x="14" y="70" width="18" height="34" rx="4" fill={fg} opacity={0.35} />
      <Rect x="40" y="56" width="18" height="48" rx="4" fill={fg} opacity={0.55} />
      <Rect x="66" y="42" width="18" height="62" rx="4" fill={fg} opacity={0.8} />
      <Rect x="92" y="28" width="18" height="76" rx="4" fill={fg} />
      <Circle cx="128" cy="32" r="20" fill={bg} stroke={fg} strokeWidth={4} />
      <SvgText x="128" y="39" fontSize="22" fontWeight="700" fill={fg} textAnchor="middle">$</SvgText>
      <Circle cx="140" cy="62" r="10" fill={fg} opacity={0.5} />
    </Svg>
  )
}

export function FrequentScene({ width = 110, height = 90, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Rect x="20" y="24" width="100" height="84" rx="16" fill={bg} stroke={fg} strokeWidth={3} />
      <Rect x="20" y="24" width="100" height="22" rx="16" fill={fg} />
      <Rect x="40" y="14" width="8" height="18" rx="4" fill={fg} />
      <Rect x="92" y="14" width="8" height="18" rx="4" fill={fg} />
      <Circle cx="44" cy="66" r="5" fill={fg} opacity={0.35} />
      <Circle cx="66" cy="66" r="5" fill={fg} opacity={0.35} />
      <Circle cx="88" cy="66" r="5" fill={fg} />
      <Circle cx="110" cy="66" r="5" fill={fg} opacity={0.35} />
      <Circle cx="44" cy="90" r="5" fill={fg} opacity={0.35} />
      <Circle cx="66" cy="90" r="5" fill={fg} />
      <Circle cx="88" cy="90" r="5" fill={fg} opacity={0.35} />
      <Path d="M112 84 C 112 76, 122 74, 122 66 A 10 10 0 1 0 102 66 C 102 74, 112 76, 112 84 Z" fill={fg} />
    </Svg>
  )
}

export function PaymentScene({ width = 110, height = 90, fg, bg }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={VB}>
      <Rect x="34" y="8" width="62" height="104" rx="12" fill={bg} stroke={fg} strokeWidth={3} />
      <Rect x="46" y="22" width="38" height="38" rx="6" fill={fg} opacity={0.15} />
      <Rect x="52" y="28" width="10" height="10" fill={fg} />
      <Rect x="66" y="28" width="10" height="10" fill={fg} opacity={0.5} />
      <Rect x="52" y="42" width="10" height="10" fill={fg} opacity={0.5} />
      <Rect x="66" y="42" width="10" height="10" fill={fg} />
      <Rect x="46" y="72" width="38" height="6" rx="3" fill={fg} opacity={0.5} />
      <Rect x="46" y="84" width="26" height="6" rx="3" fill={fg} opacity={0.3} />
      <Circle cx="120" cy="34" r="16" fill={fg} />
      <Path d="M112 34 L118 40 L129 28" stroke={bg} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export const SCENES = {
  wheel: WheelScene,
  trips: TripsScene,
  chat: ChatScene,
  earnings: EarningsScene,
  frequent: FrequentScene,
  payment: PaymentScene,
} as const

export type SceneName = keyof typeof SCENES
