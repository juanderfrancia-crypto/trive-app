import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    const payload = await req.json()

    // Payload del database webhook: { type, table, schema, record, old_record }
    const record = payload.record
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 })
    }

    const { trip_id, from_user_id, to_user_id, message } = record

    if (!to_user_id || !from_user_id || !message) {
      return new Response(JSON.stringify({ skipped: 'missing fields' }), { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar token del destinatario y nombre del remitente en paralelo
    const [recipientRes, senderRes] = await Promise.all([
      supabase.from('profiles').select('push_token, name').eq('id', to_user_id).single(),
      supabase.from('profiles').select('name').eq('id', from_user_id).single(),
    ])

    const recipientToken = recipientRes.data?.push_token
    const senderName = senderRes.data?.name || 'Usuario'

    if (!recipientToken) {
      return new Response(JSON.stringify({ skipped: 'recipient has no push token' }), { status: 200 })
    }

    // Enviar via Expo Push Service (que usa FCM V1 para Android)
    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: recipientToken,
        title: `Mensaje de ${senderName}`,
        body: message.length > 100 ? message.substring(0, 97) + '...' : message,
        data: {
          type: 'trip_message',
          trip_id,
          from_user_id,
        },
        sound: 'default',
        priority: 'high',
        badge: 1,
      }),
    })

    const result = await pushResponse.json()
    const success = pushResponse.ok && result?.data?.status !== 'error'

    return new Response(JSON.stringify({ success, result }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
