import type { Json } from '../types/database.types'

export interface EmergencyContact {
  name: string
  phone: string
}

/**
 * Valida el JSON de `profiles.emergency_contact`. Devuelve el contacto solo si
 * tiene `name` y `phone` como texto; en cualquier otro caso devuelve null.
 */
export const toEmergencyContact = (value: Json | null | undefined): EmergencyContact | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const { name, phone } = value
  return typeof name === 'string' && typeof phone === 'string' ? { name, phone } : null
}
