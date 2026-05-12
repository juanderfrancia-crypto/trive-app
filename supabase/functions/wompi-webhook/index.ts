import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()
    const { event, data, signature } = body

    // Solo nos interesan actualizaciones de transacciones
    if (event !== 'transaction.updated') {
      return new Response('ok', { status: 200 })
    }

    const tx = data.transaction
    const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET')!

    // Verificar firma: SHA256(tx.id + tx.status + tx.amount_in_cents + eventsSecret)
    const raw = `${tx.id}${tx.status}${tx.amount_in_cents}${eventsSecret}`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const computed = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (computed !== signature?.checksum) {
      console.error('Wompi signature mismatch')
      return new Response('Invalid signature', { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const normalizedStatus = tx.status.toLowerCase() // APPROVED → approved

    // Buscar la transacción pendiente por referencia
    const { data: record, error: findError } = await supabase
      .from('wallet_transactions')
      .select('id, status, user_id, amount')
      .eq('wompi_reference', tx.reference)
      .single()

    if (findError || !record) {
      console.error('Transaction not found:', tx.reference)
      return new Response('ok', { status: 200 })
    }

    // Idempotencia: si ya fue procesada, ignorar
    if (record.status === 'approved') {
      return new Response('ok', { status: 200 })
    }

    // Actualizar estado de la transacción
    await supabase
      .from('wallet_transactions')
      .update({ status: normalizedStatus, wompi_transaction_id: tx.id })
      .eq('id', record.id)

    // Si fue aprobada, incrementar saldo del conductor
    if (normalizedStatus === 'approved') {
      const { error: rpcError } = await supabase.rpc('increment_wallet_balance', {
        p_user_id: record.user_id,
        p_amount:  record.amount,
      })
      if (rpcError) {
        console.error('Error incrementing balance:', rpcError.message)
        return new Response('Balance update failed', { status: 500 })
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
