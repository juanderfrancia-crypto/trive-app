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

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Trive <contacto@trivesoft.com>',
        to: ['privacy@trivesoft.com'],
        reply_to: cleanEmail,
        subject: `Nuevo mensaje de contacto — ${cleanName}`,
        html: `
          <p><strong>Nombre:</strong> ${escapeHtml(cleanName)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(cleanEmail)}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${escapeHtml(cleanMessage).replace(/\n/g, '<br>')}</p>
        `,
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
