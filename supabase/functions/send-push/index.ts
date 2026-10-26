import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Envía notificaciones push cuando se insertan filas en notifications.
// Lo llama un webhook de base de datos con el secreto WEBHOOK_SECRET.
// Las notificaciones que crea el servidor (confirmaciones, calificaciones, recargas,
// rutas nuevas) llegan así al teléfono aunque la app esté cerrada.
//
// El trigger agrupa por sentencia (no por fila): una publicación de ruta que
// notifica a 50 pasajeros manda UNA sola llamada aquí con las 50 adentro, no 50
// llamadas separadas (ver migración 20261026100000_batch_push_notifications.sql).
// Expo acepta hasta 100 mensajes por llamada a su API, así que se respeta ese
// límite con chunks si llegaran más de 100 de una vez.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_BATCH_SIZE = 100

type NotificationRecord = {
  user_id: string
  title?: string | null
  message?: string | null
  data?: Record<string, unknown> | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return json({ error: 'No autorizado' }, 401)
  }

  const payload = await req.json()

  let records: NotificationRecord[] = []
  if (payload?.type === 'INSERT_BATCH' && Array.isArray(payload?.records)) {
    records = payload.records
  } else if (payload?.type === 'INSERT' && payload?.record?.user_id) {
    // Compatibilidad con el formato anterior (una fila), por si algo lo sigue mandando así.
    records = [payload.record]
  }

  if (records.length === 0) {
    return json({ skipped: true })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const userIds = [...new Set(records.map((r) => r.user_id).filter(Boolean))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token')
    .in('id', userIds)

  const tokenByUser = new Map((profiles ?? []).map((p: any) => [p.id, p.push_token as string | null]))

  const messages = records
    .map((r) => {
      const token = tokenByUser.get(r.user_id)
      if (!token || !token.startsWith('ExponentPushToken[')) return null
      return {
        to: token,
        title: r.title ?? 'Trive',
        body: r.message ?? '',
        data: r.data ?? {},
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (messages.length === 0) {
    return json({ skipped: 'sin tokens de push', total: records.length })
  }

  let sent = 0
  const expoErrors: unknown[] = []
  for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    })
    const body = await response.json().catch(() => null)
    if (response.ok) sent += batch.length
    else expoErrors.push({ status: response.status, body })
  }

  return json({ ok: true, enviados: sent, total: records.length, errores: expoErrors.length ? expoErrors : undefined })
})
