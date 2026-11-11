import { supabase } from './supabase'
import { insertNotificationForUser } from './notificationInsert'

type PendingKey = 'recovery_email' | 'emergency_contact' | 'municipality'

const PENDING_ITEMS: Record<PendingKey, { title: string; message: string }> = {
  recovery_email: {
    title: 'Protege tu cuenta',
    message: 'Agrega un correo de recuperación para poder entrar a tu cuenta si pierdes tu celular.',
  },
  emergency_contact: {
    title: 'Agrega un contacto de emergencia',
    message: 'Así podemos avisarle a alguien de confianza si pasa algo durante un viaje.',
  },
  municipality: {
    title: 'Configura tu municipio',
    message: 'Así te mostramos los viajes disponibles cerca de ti.',
  },
}

// Avisos suaves en Alertas (no bloquean nada, a diferencia de teléfono/cédula/dispositivo)
// para datos opcionales pero recomendados. Se llama una vez por login real (SIGNED_IN).
// Nunca repite un aviso: revisa si ya existe una notificación de ese pending_key antes de
// insertar otra.
export const checkPendingProfileSetup = async (userId: string): Promise<void> => {
  try {
    const [{ data: authData }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('emergency_contact, preferred_municipality').eq('id', userId).maybeSingle(),
    ])

    const missing: PendingKey[] = []
    if (!authData.user?.email_confirmed_at) missing.push('recovery_email')
    if (!profile?.emergency_contact) missing.push('emergency_contact')
    if (!profile?.preferred_municipality) missing.push('municipality')

    for (const key of missing) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'profile_incomplete')
        .contains('data', { pending_key: key })
        .limit(1)

      if (existing && existing.length > 0) continue

      const item = PENDING_ITEMS[key]
      await insertNotificationForUser(userId, {
        user_id: userId,
        type: 'profile_incomplete',
        title: item.title,
        message: item.message,
        data: { pending_key: key },
        is_read: false,
        send_push: false,
      })
    }
  } catch {
    // Silencioso -- es un recordatorio opcional, nunca debe interrumpir el login.
  }
}
