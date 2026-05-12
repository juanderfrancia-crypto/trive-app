import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Unauthorized')

    const { amount } = await req.json()
    if (!amount || amount < 1000) throw new Error('Monto mínimo: $1.000')

    const publicKey       = Deno.env.get('WOMPI_PUBLIC_KEY')!
    const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET')!
    const redirectUrl     = Deno.env.get('WOMPI_REDIRECT_URL') ?? 'https://trive.com/wallet/return'

    const reference     = crypto.randomUUID()
    const amountInCents = amount * 100
    const currency      = 'COP'

    // Integrity: SHA256(reference + amountInCents + currency + integritySecret)
    const raw = `${reference}${amountInCents}${currency}${integritySecret}`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const signature = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Registrar transacción pendiente
    const { error: dbError } = await supabase.from('wallet_transactions').insert({
      user_id:          user.id,
      amount,
      type:             'recharge',
      wompi_reference:  reference,
      status:           'pending',
    })
    if (dbError) throw new Error(`DB error: ${dbError.message}`)

    const checkoutUrl =
      `https://checkout.wompi.co/p/` +
      `?public-key=${encodeURIComponent(publicKey)}` +
      `&currency=${currency}` +
      `&amount-in-cents=${amountInCents}` +
      `&reference=${reference}` +
      `&signature:integrity=${signature}` +
      `&redirect-url=${encodeURIComponent(redirectUrl)}`

    return new Response(JSON.stringify({ checkoutUrl, reference }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
