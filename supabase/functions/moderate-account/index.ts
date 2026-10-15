import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Suspende o reactiva la cuenta de un conductor/pasajero. Bloquear el acceso
// de verdad (que no pueda iniciar sesión ni refrescar su token) requiere el
// Admin API de Supabase, que necesita la clave service_role — por eso vive
// acá y no en un RPC normal. Cargo 'operaciones' o administrador general.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

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
    (callerRoles ?? []).some((r) => r.role === 'operaciones' || r.role === 'administrador_general')
  if (!isAuthorized) {
    return json({ error: 'No autorizado para moderar cuentas' }, 403)
  }

  let body: { userId?: string; action?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400)
  }

  const { userId, action, reason } = body
  if (!userId || (action !== 'suspend' && action !== 'reactivate')) {
    return json({ error: 'Parámetros inválidos' }, 400)
  }
  if (action === 'suspend' && (!reason || reason.trim().length < 5)) {
    return json({ error: 'Escribe el motivo de la suspensión (mínimo 5 caracteres)' }, 400)
  }
  if (userId === callerId) {
    return json({ error: 'No puedes moderar tu propia cuenta' }, 400)
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: action === 'suspend' ? '87600h' : 'none',
  })
  if (banError) {
    return json({ error: 'No se pudo cambiar el acceso de la cuenta: ' + banError.message }, 500)
  }

  const { error: statusError } = await admin
    .from('profiles')
    .update({ account_status: action === 'suspend' ? 'suspended' : 'active' })
    .eq('id', userId)
  if (statusError) {
    return json({ error: 'El acceso se bloqueó pero no se pudo actualizar el estado: ' + statusError.message }, 500)
  }

  await admin.from('admin_actions').insert({
    admin_id: callerId,
    action: action === 'suspend' ? 'account_suspended' : 'account_reactivated',
    target_user_id: userId,
    reason: reason ?? null,
  })

  return json({ ok: true })
})
