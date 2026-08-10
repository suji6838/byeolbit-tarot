import { supabase } from './supabase'

export async function hasUsedAi(spreadId: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data } = await supabase
    .from('ai_usage')
    .select('spread_id')
    .eq('user_id', userId)
    .eq('spread_id', spreadId)
    .maybeSingle()
  return !!data
}

export async function markAiUsed(spreadId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return
  await supabase.from('ai_usage').insert({ user_id: userId, spread_id: spreadId })
}
