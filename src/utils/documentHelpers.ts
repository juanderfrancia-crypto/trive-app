import { COLORS } from '../theme/theme'

export interface ExpiryStatus {
  daysLeft: number
  isExpired: boolean
  label: string
  color: string
  icon: string
}

/**
 * Calculate days until expiry and return status with color
 * Verde: > 30 días
 * Amarillo: 15-30 días
 * Rojo: < 15 días o vencido
 */
export function getExpiryStatus(expiryDate?: string | null): ExpiryStatus | null {
  if (!expiryDate) return null

  const expiry = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return {
      daysLeft: 0,
      isExpired: true,
      label: 'VENCIDO',
      color: COLORS.error,
      icon: 'alert-circle',
    }
  } else if (daysLeft === 0) {
    return {
      daysLeft: 0,
      isExpired: false,
      label: 'Vence hoy',
      color: COLORS.error,
      icon: 'alert-circle',
    }
  } else if (daysLeft < 15) {
    return {
      daysLeft,
      isExpired: false,
      label: `Vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`,
      color: COLORS.error,
      icon: 'alert-circle',
    }
  } else if (daysLeft < 30) {
    return {
      daysLeft,
      isExpired: false,
      label: `Vence en ${daysLeft} días`,
      color: COLORS.warning,
      icon: 'alert',
    }
  } else {
    return {
      daysLeft,
      isExpired: false,
      label: `Vence en ${daysLeft} días`,
      color: COLORS.success,
      icon: 'checkmark-circle',
    }
  }
}

export const DOCUMENTS_WITH_EXPIRY = ['licencia', 'soat', 'tecnomecanica']
export const DOCUMENTS_WITHOUT_EXPIRY = ['cedula', 'antecedentes']

export const DOCUMENT_LABELS: Record<string, string> = {
  cedula: 'Cédula de Ciudadanía',
  licencia: 'Licencia de Conducción',
  soat: 'SOAT',
  tecnomecanica: 'Tecnomecánica',
  antecedentes: 'Certificado de Antecedentes',
}
