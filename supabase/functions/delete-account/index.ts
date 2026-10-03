import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Elimina la cuenta del usuario que llama:
// 1. Anonimiza el perfil y borra datos personales (función anonymize_account).
// 2. Borra las fotos de perfil del usuario.
// 3. Bloquea la autenticación y reemplaza el correo.
// Los registros financieros se conservan sin datos personales.

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

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) {
    return json({ error: 'No autorizado' }, 401)
  }
  const uid = userData.user.id

  const { error: anonError } = await admin.rpc('anonymize_account', { p_uid: uid })
  if (anonError) {
    return json({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }, 500)
  }

  const { data: photos } = await admin.storage.from('profile-photos').list(`profiles/${uid}`)
  if (photos && photos.length > 0) {
    await admin.storage
      .from('profile-photos')
      .remove(photos.map((file) => `profiles/${uid}/${file.name}`))
  }

  const { error: blockError } = await admin.auth.admin.updateUserById(uid, {
    email: `cuenta-eliminada-${uid}@invalid.local`,
    ban_duration: '876000h',
  })
  if (blockError) {
    return json({ error: 'La cuenta se anonimizó pero no se pudo bloquear el acceso.' }, 500)
  }

  return json({ ok: true })
})
