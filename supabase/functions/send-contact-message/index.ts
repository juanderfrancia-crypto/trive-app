import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Recibe el formulario de contacto del sitio público (trive-web) y lo envía
// por correo vía Resend a privacy@trivesoft.com, con reply-to al remitente
// para que se pueda responder directo. No requiere sesión: lo llama cualquier
// visitante anónimo del sitio, por eso se despliega con --no-verify-jwt.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (req.method !== 'POST') throw new Error('Método no permitido')

    const { name, email, message } = await req.json()

    const cleanName = String(name ?? '').trim().slice(0, 120)
    const cleanEmail = String(email ?? '').trim().toLowerCase().slice(0, 200)
    const cleanMessage = String(message ?? '').trim().slice(0, 2000)

    if (cleanName.length < 2) throw new Error('Escribe tu nombre')
    if (!EMAIL_RE.test(cleanEmail)) throw new Error('Correo inválido')
    if (cleanMessage.length < 10) throw new Error('Cuéntanos un poco más en el mensaje')

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const escapeHtml = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

    const html = `<!doctype html>
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
              <td align="center" style="padding:28px 32px 8px 32px;">
                <img src="https://trivesoft.com/illustrations/chatting.svg" width="140" alt="" style="display:block;width:140px;max-width:50%;height:auto;margin:0 0 20px 0;" />
                <p style="margin:0 0 20px 0;font-size:13px;font-weight:700;color:#1230B8;text-transform:uppercase;letter-spacing:0.04em;">Nuevo mensaje de contacto</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#8a93a6;text-transform:uppercase;letter-spacing:0.03em;">Nombre</p>
                <p style="margin:0 0 16px 0;font-size:15px;color:#101828;">${escapeHtml(cleanName)}</p>

                <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#8a93a6;text-transform:uppercase;letter-spacing:0.03em;">Correo</p>
                <p style="margin:0 0 16px 0;font-size:15px;"><a href="mailto:${escapeHtml(cleanEmail)}" style="color:#1230B8;text-decoration:none;">${escapeHtml(cleanEmail)}</a></p>

                <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#8a93a6;text-transform:uppercase;letter-spacing:0.03em;">Mensaje</p>
                <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#101828;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;">
                <p style="margin:0;font-size:12px;color:#8a93a6;">Responde directo a este correo para contestarle a ${escapeHtml(cleanName)}.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;color:#9aa2b1;">Enviado automáticamente desde el formulario de contacto de trivesoft.com</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        from: 'Trive <contacto@trivesoft.com>',
        to: ['privacy@trivesoft.com'],
        reply_to: cleanEmail,
        subject: `Nuevo mensaje de contacto — ${cleanName}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const detail = await resendResponse.text()
      throw new Error('No se pudo enviar el mensaje: ' + detail)
    }

    return new Response(JSON.stringify({ ok: true }), {
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
