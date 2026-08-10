import { supabase } from './supabase'

/** 확인 실패 시엔 안전하게 "이미 사용함"으로 간주해 AI 호출을 막는다(비용 보호 목적). */
export async function hasUsedAi(spreadId: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data, error } = await supabase
    .from('ai_usage')
    .select('spread_id')
    .eq('user_id', userId)
    .eq('spread_id', spreadId)
    .maybeSingle()
  if (error) {
    console.error('hasUsedAi failed:', error)
    return true
  }
  return !!data
}

export async function markAiUsed(spreadId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return
  const { error } = await supabase.from('ai_usage').insert({ user_id: userId, spread_id: spreadId })
  if (error) {
    console.error('markAiUsed failed:', error)
  }
}
