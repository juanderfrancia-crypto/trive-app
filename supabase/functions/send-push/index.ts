import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Envía una notificación push cuando se inserta una fila en notifications.
// Lo llama un webhook de base de datos con el secreto WEBHOOK_SECRET.
// Las notificaciones que crea el servidor (confirmaciones, calificaciones, recargas)
// llegan así al teléfono aunque la app esté cerrada.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return json({ error: 'No autorizado' }, 401)
  }

  const payload = await req.json()
  const record = payload?.record
  if (payload?.type !== 'INSERT' || !record?.user_id) {
    return json({ skipped: true })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('push_token')
    .eq('id', record.user_id)
    .maybeSingle()

  const token: string | null = profile?.push_token ?? null
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return json({ skipped: 'sin token de push' })
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify([{
      to: token,
      title: record.title ?? 'Trive',
      body: record.message ?? '',
      data: record.data ?? {},
      sound: 'default',
    }]),
  })

  if (!response.ok) {
    return json({ error: 'Expo rechazó el envío' }, 502)
  }

  return json({ ok: true })
})
