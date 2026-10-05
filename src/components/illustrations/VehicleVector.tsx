import React from 'react'
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg'
import { COLORS } from '../../theme/theme'

// Tipos exactos de la base (vehicle_type). No se usan palabras del nombre del vehículo.
export type VehicleType = 'auto' | 'taxi' | 'busetica' | 'buseta'

type Props = {
  type?: string | null
  width?: number
  height?: number
}

// Si el tipo es nulo o desconocido se dibuja el auto como base genérica.
function resolveType(type?: string | null): VehicleType {
  if (type === 'taxi' || type === 'busetica' || type === 'buseta') return type
  return 'auto'
}

function Auto() {
  return (
    <>
      <Ellipse cx={60} cy={70} rx={46} ry={4} fill={COLORS.primary} opacity={0.14} />
      <Path d="M14 52 Q14 44 22 43 L34 36 Q40 26 52 26 L74 26 Q84 26 90 36 L100 43 Q108 44 108 52 L108 58 Q108 62 104 62 L18 62 Q14 62 14 58 Z" fill={COLORS.primary} />
      <Path d="M40 43 Q45 35 53 35 L72 35 Q80 35 84 43 Z" fill={COLORS.primaryTint} />
      <Circle cx={33} cy={62} r={8} fill={COLORS.textPrimary} />
      <Circle cx={33} cy={62} r={3.2} fill={COLORS.primaryTint} />
      <Circle cx={89} cy={62} r={8} fill={COLORS.textPrimary} />
      <Circle cx={89} cy={62} r={3.2} fill={COLORS.primaryTint} />
      <Ellipse cx={104} cy={50} rx={2.4} ry={1.8} fill={COLORS.white} />
    </>
  )
}

function Taxi() {
  return (
    <>
      <Ellipse cx={60} cy={70} rx={46} ry={4} fill={COLORS.textPrimary} opacity={0.14} />
      <Rect x={50} y={14} width={20} height={6} rx={2} fill={COLORS.primary} />
      <Path d="M14 52 Q14 44 22 43 L34 36 Q40 26 52 26 L74 26 Q84 26 90 36 L100 43 Q108 44 108 52 L108 58 Q108 62 104 62 L18 62 Q14 62 14 58 Z" fill={COLORS.textPrimary} />
      <Path d="M40 43 Q45 35 53 35 L72 35 Q80 35 84 43 Z" fill={COLORS.primaryTint} />
      <Circle cx={33} cy={62} r={8} fill={COLORS.grayDark} />
      <Circle cx={33} cy={62} r={3.2} fill={COLORS.primaryTint} />
      <Circle cx={89} cy={62} r={8} fill={COLORS.grayDark} />
      <Circle cx={89} cy={62} r={3.2} fill={COLORS.primaryTint} />
      <Ellipse cx={104} cy={50} rx={2.4} ry={1.8} fill={COLORS.white} />
    </>
  )
}

function Minivan() {
  return (
    <>
      <Ellipse cx={60} cy={70} rx={48} ry={4} fill={COLORS.primary} opacity={0.14} />
      <Path d="M10 56 V24 Q10 16 18 16 L84 16 Q92 16 98 26 L106 40 Q112 42 112 50 V58 Q112 62 108 62 H14 Q10 62 10 58 Z" fill={COLORS.primary} />
      <Rect x={20} y={24} width={16} height={14} rx={3} fill={COLORS.primaryTint} />
      <Rect x={40} y={24} width={16} height={14} rx={3} fill={COLORS.primaryTint} />
      <Rect x={60} y={24} width={16} height={14} rx={3} fill={COLORS.primaryTint} />
      <Path d="M82 26 L94 26 L102 40 L82 40 Z" fill={COLORS.primaryTint} />
      <Circle cx={30} cy={62} r={8} fill={COLORS.textPrimary} />
      <Circle cx={30} cy={62} r={3.2} fill={COLORS.primaryTint} />
      <Circle cx={92} cy={62} r={8} fill={COLORS.textPrimary} />
      <Circle cx={92} cy={62} r={3.2} fill={COLORS.primaryTint} />
    </>
  )
}

function Buseta() {
  return (
    <>
      <Ellipse cx={60} cy={70} rx={50} ry={4} fill={COLORS.primary} opacity={0.14} />
      <Rect x={8} y={14} width={104} height={46} rx={10} fill={COLORS.primary} />
      <Rect x={14} y={20} width={14} height={13} rx={2.5} fill={COLORS.primaryTint} />
      <Rect x={32} y={20} width={14} height={13} rx={2.5} fill={COLORS.primaryTint} />
      <Rect x={50} y={20} width={14} height={13} rx={2.5} fill={COLORS.primaryTint} />
      <Rect x={68} y={20} width={14} height={13} rx={2.5} fill={COLORS.primaryTint} />
      <Rect x={86} y={20} width={18} height={30} rx={3} fill={COLORS.primaryTint} />
      <Rect x={92} y={54} width={8} height={6} rx={1} fill={COLORS.textPrimary} />
      <Circle cx={26} cy={60} r={8} fill={COLORS.textPrimary} />
      <Circle cx={26} cy={60} r={3.2} fill={COLORS.primaryTint} />
      <Circle cx={94} cy={60} r={8} fill={COLORS.textPrimary} />
      <Circle cx={94} cy={60} r={3.2} fill={COLORS.primaryTint} />
    </>
  )
}

export function VehicleVector({ type, width = 104, height = 72 }: Props) {
  const kind = resolveType(type)
  return (
    <Svg width={width} height={height} viewBox="0 0 120 80" accessibilityLabel={`Vehículo tipo ${kind}`}>
      {kind === 'auto' && <Auto />}
      {kind === 'taxi' && <Taxi />}
      {kind === 'busetica' && <Minivan />}
      {kind === 'buseta' && <Buseta />}
    </Svg>
  )
}
