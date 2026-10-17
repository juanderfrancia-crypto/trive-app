import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Manda el correo de "¡Trive ya está disponible!" a todos los que dejaron su
// correo en trivesoft.com y aún no han sido notificados. Se dispara a mano
// desde el botón de la pantalla "Lanzamiento" del back-office (una vez, el
// día del lanzamiento real en Play Store) — no es un cron. Protegida por el
// mismo patrón que moderate-account/invite-employee: exige una sesión real
// de staff con cargo administrador_general u operaciones, no un secreto fijo.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.trivesoft.app'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (req.method !== 'POST') throw new Error('Método no permitido')

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error('No autorizado')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: callerData, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !callerData.user) throw new Error('No autorizado')
    const callerId = callerData.user.id

    const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
      admin.from('profiles').select('is_admin').eq('id', callerId).single(),
      admin.from('staff_roles').select('role').eq('employee_id', callerId),
    ])
    const isAuthorized =
      callerProfile?.is_admin === true ||
      (callerRoles ?? []).some((r) => r.role === 'administrador_general' || r.role === 'operaciones')
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'No autorizado para avisar a la lista de lanzamiento' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscribers, error: fetchError } = await admin
      .from('launch_notify_subscribers')
      .select('id, email')
      .is('notified_at', null)

    if (fetchError) throw fetchError
    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No hay correos pendientes de avisar.' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const escapeHtml = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

    const buildHtml = (email: string) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#1230B8;padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Trive</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 32px 8px 32px;">
                <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#1230B8;text-transform:uppercase;letter-spacing:0.04em;">¡Ya está disponible!</p>
                <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#101828;">Trive ya está en Google Play</h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475467;">
                  Nos dejaste tu correo para avisarte, y aquí está: ya puedes descargar Trive y empezar a compartir tus viajes entre Puerto Tejada y Cali.
                </p>
                <a href="${PLAY_STORE_URL}" style="display:inline-block;background-color:#1230B8;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:999px;">Descargar en Google Play</a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 28px 32px;">
                <p style="margin:0;font-size:12px;color:#8a93a6;">Recibiste este correo porque dejaste ${escapeHtml(email)} en trivesoft.com para que te avisáramos del lanzamiento.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

    let sent = 0
    const failed: string[] = []

    for (const sub of subscribers) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          from: 'Trive <contacto@trivesoft.com>',
          to: [sub.email],
          subject: '¡Trive ya está disponible en Google Play!',
          html: buildHtml(sub.email),
        }),
      })

      if (resendResponse.ok) {
        sent++
        await admin
          .from('launch_notify_subscribers')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', sub.id)
      } else {
        failed.push(sub.email)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
