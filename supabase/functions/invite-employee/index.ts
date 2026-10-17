import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Crea la cuenta de un empleado nuevo del back-office (solo administrador general).
// Usa el Admin API de Supabase (createUser), que necesita la clave service_role —
// por eso vive en una Edge Function y nunca en el repo del back-office, que solo
// tiene la clave pública. La contraseña temporal se manda por correo (Resend, el
// mismo que ya usa send-contact-message) directo al nuevo empleado, y además se
// devuelve una vez a quien hace la llamada por si el correo no llega a tiempo.

const ALLOWED_ROLES = [
  'verificacion',
  'contabilidad',
  'atencion_cliente',
  'operaciones',
  'analitica',
  'administrador_general',
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function randomPassword() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return 'Tr' + Array.from(bytes, (b) => b.toString(36)).join('').slice(0, 14) + '!9'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return json({ error: 'No autorizado' }, 401)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) {
    return json({ error: 'No autorizado' }, 401)
  }
  const callerId = callerData.user.id

  const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
    admin.from('profiles').select('is_admin').eq('id', callerId).single(),
    admin.from('staff_roles').select('role').eq('employee_id', callerId),
  ])
  const isAuthorized =
    callerProfile?.is_admin === true ||
    (callerRoles ?? []).some((r) => r.role === 'administrador_general')
  if (!isAuthorized) {
    return json({ error: 'Solo el administrador general puede crear empleados' }, 403)
  }

  let body: { name?: string; email?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400)
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const role = body.role ?? ''

  if (name.length < 2) {
    return json({ error: 'Escribe el nombre completo del empleado' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Correo inválido' }, 400)
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return json({ error: 'Cargo inválido' }, 400)
  }

  const tempPassword = randomPassword()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (createError || !created.user) {
    const msg = createError?.message?.includes('already been registered')
      ? 'Ya existe una cuenta con ese correo.'
      : createError?.message ?? 'No se pudo crear la cuenta'
    return json({ error: msg }, 400)
  }

  const { error: roleError } = await admin
    .from('staff_roles')
    .insert({ employee_id: created.user.id, role })

  if (roleError) {
    return json(
      { error: 'La cuenta se creó pero no se pudo asignar el cargo: ' + roleError.message },
      500
    )
  }

  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  let emailSent = false
  if (resendApiKey) {
    const html = `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background-color:#1230B8;padding:24px 32px;"><span style="color:#ffffff;font-size:20px;font-weight:800;">Trive</span></td></tr>
          <tr><td style="padding:28px 32px 8px 32px;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1230B8;text-transform:uppercase;letter-spacing:0.04em;">Acceso al back-office</p>
            <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:800;color:#101828;">Hola, ${escapeHtml(name)}</h1>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475467;">Te crearon una cuenta en el panel interno de Trive. Entra con estas credenciales y luego activa la verificación en dos pasos que te va a pedir la primera vez:</p>
            <p style="margin:0 0 6px 0;font-size:13px;color:#8a93a6;">Correo</p>
            <p style="margin:0 0 16px 0;font-size:15px;font-weight:700;color:#101828;">${escapeHtml(email)}</p>
            <p style="margin:0 0 6px 0;font-size:13px;color:#8a93a6;">Contraseña temporal</p>
            <p style="margin:0 0 20px 0;font-size:15px;font-weight:700;color:#101828;font-family:monospace;">${escapeHtml(tempPassword)}</p>
            <a href="https://backoffice.trivesoft.com/login" style="display:inline-block;background-color:#1230B8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:999px;">Entrar al back-office</a>
          </td></tr>
          <tr><td style="padding:20px 32px 28px 32px;"><p style="margin:0;font-size:12px;color:#8a93a6;">Por seguridad, cambia esta contraseña apenas entres.</p></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        from: 'Trive <contacto@trivesoft.com>',
        to: [email],
        subject: 'Tu acceso al back-office de Trive',
        html,
      }),
    })
    emailSent = resendResponse.ok
  }

  return json({ ok: true, email, tempPassword, userId: created.user.id, emailSent })
})
