import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Crea la cuenta de un empleado nuevo del back-office (solo administrador general).
// Usa el Admin API de Supabase (createUser), que necesita la clave service_role —
// por eso vive en una Edge Function y nunca en el repo del back-office, que solo
// tiene la clave pública. El correo del proyecto no tiene un proveedor SMTP propio
// configurado (ver docs/features/EMAIL_RATE_LIMIT_SOLUTION.md), así que no se manda
// un correo de invitación: se genera una contraseña temporal y se devuelve una sola
// vez a quien hace la llamada, para que se la comparta al empleado por otro medio.

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

  return json({ ok: true, email, tempPassword, userId: created.user.id })
})
