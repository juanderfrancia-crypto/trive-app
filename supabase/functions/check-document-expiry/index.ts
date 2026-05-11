import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const NOTIFY_DAYS = [1, 7, 15, 30]

const DOC_LABELS: Record<string, string> = {
  licencia: 'Licencia de conducción',
  soat: 'SOAT',
  tecnomecanica: 'Tecnomecánica',
}

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Traer todos los documentos con fecha de vencimiento que están verificados o vencidos
    const { data: docs, error } = await supabase
      .from('driver_documents')
      .select('id, driver_id, document_type, expiry_date, status, profiles(name, push_token)')
      .in('document_type', ['licencia', 'soat', 'tecnomecanica'])
      .not('expiry_date', 'is', null)
      .in('status', ['verified', 'expired'])

    if (error) throw error
    if (!docs?.length) return new Response(JSON.stringify({ processed: 0 }), { status: 200 })

    const pushMessages: object[] = []
    const expiredDocIds: string[] = []

    for (const doc of docs) {
      const profile = Array.isArray(doc.profiles) ? doc.profiles[0] : doc.profiles
      const pushToken = profile?.push_token
      const driverName = profile?.name ?? 'Conductor'
      const docLabel = DOC_LABELS[doc.document_type] ?? doc.document_type

      const expiry = new Date(doc.expiry_date)
      expiry.setHours(0, 0, 0, 0)
      const diffMs = expiry.getTime() - today.getTime()
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (daysLeft < 0) {
        // Ya vencido — marcar como expired y notificar solo si no estaba ya marcado
        if (doc.status !== 'expired') {
          expiredDocIds.push(doc.id)

          // Notificación in-app
          await supabase.from('notifications').insert({
            user_id: doc.driver_id,
            type: 'document_expired',
            title: `Documento vencido`,
            message: `Tu ${docLabel} venció. Actualízalo para seguir conduciendo.`,
            data: { document_type: doc.document_type },
            is_read: false,
          })

          if (pushToken) {
            pushMessages.push({
              to: pushToken,
              title: 'Documento vencido',
              body: `Tu ${docLabel} venció. Actualízalo para seguir conduciendo.`,
              data: { type: 'document_expired', document_type: doc.document_type },
              sound: 'default',
              priority: 'high',
            })
          }
        }
      } else if (NOTIFY_DAYS.includes(daysLeft)) {
        // Próximo a vencer — notificar

        await supabase.from('notifications').insert({
          user_id: doc.driver_id,
          type: 'document_expiring',
          title: daysLeft === 1 ? '¡Documento vence mañana!' : `Documento vence en ${daysLeft} días`,
          message: `Tu ${docLabel} vence ${daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`}. Renuévalo a tiempo.`,
          data: { document_type: doc.document_type, days_left: daysLeft },
          is_read: false,
        })

        if (pushToken) {
          pushMessages.push({
            to: pushToken,
            title: daysLeft === 1 ? '¡Documento vence mañana!' : `Documento vence en ${daysLeft} días`,
            body: `Tu ${docLabel} vence ${daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`}. Renuévalo a tiempo.`,
            data: { type: 'document_expiring', document_type: doc.document_type },
            sound: 'default',
            priority: 'high',
          })
        }
      }
    }

    // Marcar documentos vencidos
    if (expiredDocIds.length > 0) {
      await supabase
        .from('driver_documents')
        .update({ status: 'expired' })
        .in('id', expiredDocIds)
    }

    // Enviar push notifications en lote
    if (pushMessages.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(pushMessages),
      })
    }

    return new Response(
      JSON.stringify({ processed: docs.length, expired: expiredDocIds.length, pushSent: pushMessages.length }),
      { status: 200 }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
