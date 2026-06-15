import type { AppUser } from '../store/useAppStore'

/** Rol activo en la app: conductor verificado en modo driver */
export function isDriverRole(user?: AppUser | null): boolean {
  return user?.role === 'driver'
}

export function isPassengerRole(user?: AppUser | null): boolean {
  return !isDriverRole(user)
}
