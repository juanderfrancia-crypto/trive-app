import { supabase } from './supabase'

export type PaymentPreference = 'cash' | 'transfer'

export const getPaymentPreference = async (userId: string): Promise<PaymentPreference> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_payment_method')
      .eq('id', userId)
      .maybeSingle()
    if (error) return 'cash'
    return data?.preferred_payment_method === 'transfer' ? 'transfer' : 'cash'
  } catch {
    return 'cash'
  }
}

export const setPaymentPreference = async (userId: string, value: PaymentPreference): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ preferred_payment_method: value })
    .eq('id', userId)
  if (error) throw error
}
