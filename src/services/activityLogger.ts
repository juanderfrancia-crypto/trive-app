import { supabase } from './supabase'

export interface LogActivityParams {
  action: string
  device?: string
  location?: string
  status?: 'exitoso' | 'fallido'
}

/**
 * Registra una actividad del usuario en la tabla user_activity
 */
export const logActivity = async (userId: string, params: LogActivityParams) => {
  try {
    const { action, device = 'Mobile App', location = 'Colombia', status = 'exitoso' } = params

    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        action,
        device,
        location,
        status,
      })

    if (error) {
      console.error('Error logging activity:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Unexpected error logging activity:', err)
    return false
  }
}

/**
 * Registra un login exitoso
 */
export const logLogin = async (userId: string, device?: string) => {
  return logActivity(userId, {
    action: 'Inicio de sesión',
    device: device || 'Mobile App',
    status: 'exitoso',
  })
}

/**
 * Registra un intento de login fallido
 */
export const logFailedLogin = async (userId: string, device?: string) => {
  return logActivity(userId, {
    action: 'Intento de inicio fallido',
    device: device || 'Mobile App',
    status: 'fallido',
  })
}

/**
 * Registra un cambio de contraseña
 */
export const logPasswordChange = async (userId: string) => {
  return logActivity(userId, {
    action: 'Cambio de contraseña',
    device: 'Mobile App',
    status: 'exitoso',
  })
}

/**
 * Registra un cambio de correo
 */
export const logEmailChange = async (userId: string) => {
  return logActivity(userId, {
    action: 'Cambio de correo',
    device: 'Mobile App',
    status: 'exitoso',
  })
}

/**
 * Registra cambios en el perfil
 */
export const logProfileUpdate = async (userId: string, field?: string) => {
  const action = field ? `Actualización de perfil - ${field}` : 'Actualización de perfil'
  return logActivity(userId, {
    action,
    device: 'Mobile App',
    status: 'exitoso',
  })
}

/**
 * Registra cambios en documentos
 */
export const logDocumentUpdate = async (userId: string, action: string) => {
  return logActivity(userId, {
    action: `Documentos - ${action}`,
    device: 'Mobile App',
    status: 'exitoso',
  })
}

/**
 * Registra viajes completados
 */
export const logTripCompleted = async (userId: string) => {
  return logActivity(userId, {
    action: 'Viaje completado',
    device: 'Mobile App',
    status: 'exitoso',
  })
}
