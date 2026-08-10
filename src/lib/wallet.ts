import { supabase } from './supabase'

export async function getCoinBalance(): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return 0
  const { data, error } = await supabase.from('wallets').select('coins').eq('user_id', userId).maybeSingle()
  if (error) {
    console.error('getCoinBalance failed:', error)
    return 0
  }
  return data?.coins ?? 0
}
