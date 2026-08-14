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

// api/interpret.js의 precheck와 동일한 기준(UTC 날짜 경계)으로 오늘 무료 해석을 이미 썼는지 확인한다.
export async function hasUsedFreeAiToday(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data, error } = await supabase
    .from('ai_usage_log')
    .select('id')
    .eq('user_id', userId)
    .eq('is_paid', false)
    .gte('created_at', new Date().toISOString().slice(0, 10))
    .maybeSingle()
  if (error) {
    console.error('hasUsedFreeAiToday failed:', error)
    return false
  }
  return Boolean(data)
}
