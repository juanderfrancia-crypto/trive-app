// Sistema de diseño profesional para Trive - Paleta Azure Tech + Black
import { StyleSheet } from 'react-native'

export const COLORS = {
  // Primarios - Azul Tecnológico
  primary: '#154AA8', // Azul Tech vibrante con energía
  primaryLight: '#2E5FBF', // Azul claro para hover/light states
  primaryDark: '#0D3A88', // Azul oscuro para press states
  primaryDarkest: '#082D66', // Azul muy oscuro para gradientes 3D

  // Secundarios - Azul Cálido/Celeste
  accent: '#2E7DC0', // Azul cálido para acentos y complementos
  accentLight: '#5A9FD4', // Azul muy claro para backgrounds
  accentDark: '#1E5FA0', // Azul oscuro alternativo

  // Gradientes 3D
  gradient3D1: '#0D3A88', // Azul oscuro inicio
  gradient3D2: '#154AA8', // Azul medio
  gradient3D3: '#2E7DC0', // Azul claro final
  gradient3D4: '#5A9FD4', // Azul muy claro
  
  // Premium - Azul y variantes azul premium
  gold: '#1E5FA0', // Azul premium sofisticado
  goldLight: '#2E7DC0', // Azul premium claro
  orangeGradient1: '#154AA8', // Azul base para gradientes
  orangeGradient2: '#2E7DC0', // Transición a azul claro
  orangeGradient3: '#5A9FD4', // Azul claro final
  
  // Sombras blancas para realismo (con transparencia simulada)
  shadowWhiteLight: '#FFFFFF99', // Blanco con 60% e opacidad - para highlights
  shadowWhiteMid: '#FFFFFF66', // Blanco con 40% de opacidad - medias sombras
  shadowWhiteDark: '#FFFFFF33', // Blanco con 20% de opacidad - sombras sutiles
  
  // Semánticos
  success: '#10B981', // Verde éxito
  warning: '#F59E0B', // Amarillo/Naranja advertencia
  error: '#EF4444', // Rojo error
  info: '#154AA8', // Igual al primary para consistencia
  
  // Fondos - Tonos grises sutiles con tech feel
  background: '#FAFAFA', // Gris muy claro, casi blanco
  surface: '#FFFFFF', // Blanco puro para cards/containers
  surfaceAlt: '#F5F5F5', // Gris muy claro alternativo
  surfaceHover: '#F0F0F0', // Gris claro para hover states
  backgroundAlt: '#F5F5F5', // Alias de surfaceAlt
  
  // Texto - Negro profundo y grises (no azul/púrpura)
  textPrimary: '#0F0F0F', // Negro profundo para máximo contraste
  textSecondary: '#5A5A5A', // Gris oscuro profesional
  textTertiary: '#8B8B8B', // Gris medio
  textInverse: '#FFFFFF', // Blanco para texto sobre azul
  
  // Alias para compatibilidad
  text: '#0F0F0F', // Alias de textPrimary
  secondary: '#5A5A5A', // Alias de textSecondary
  dark: '#0F0F0F', // Alias de textPrimary
  grayLight: '#D1D5DB', // Gris claro para elementos deshabilitados
  grayDark: '#374151', // Gris oscuro para elementos
  
  // Bordes - Grises sutiles
  border: '#E8E8E8', // Gris sutil
  borderLight: '#F0F0F0', // Gris muy claro para divisiones suaves
  
  // Divisores
  divider: '#E8E8E8',
}

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as any,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as any,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as any,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as any,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as any,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as any,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as any,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as any,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '500' as any,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as any,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as any,
    lineHeight: 24,
  },
  subtitle1: {
    fontSize: 18,
    fontWeight: '500' as any,
    lineHeight: 26,
  },
  subtitle2: {
    fontSize: 16,
    fontWeight: '500' as any,
    lineHeight: 24,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as any,
    lineHeight: 16,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as any,
    lineHeight: 20,
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
  },
  weight: {
    regular: '400' as any,
    medium: '500' as any,
    semibold: '600' as any,
    bold: '700' as any,
  },
  bold: {
    fontWeight: '700' as const,
  },
  regular: {
    fontWeight: '400' as const,
  },
  semibold: {
    fontWeight: '600' as const,
  },
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
}

export const SHADOWS = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 16,
  },

  // Sombra extra profunda para cards premium
  deep: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },

  // Sombras premium con luz blanca para elementos azules
  orangeGlow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.4, // Luz blanca suave desde arriba-izquierda
    shadowRadius: 8,
    elevation: 6,
  },
  orangeSoft: {
    shadowColor: '#154AA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Sombra azul muy suave
    shadowRadius: 12,
    elevation: 5,
  },
  orangePremium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, // Sombra negra base
    shadowRadius: 12,
    elevation: 6,
    // La luz blanca se agregará con código adicional para realismo
  },
}

export const COMPONENTS = StyleSheet.create({
  cardBase: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  
  buttonBase: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  inputBase: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  
  chipBase: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  
  chipPrimary: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  
  badgeBase: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
