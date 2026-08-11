import { COIN_PACKAGE } from '../config'
import { supabase } from './supabase'

export interface ChargeRequest {
  id: string
  referenceNote: string
  coins: number
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export async function submitChargeRequest(referenceNote: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('로그인이 필요해요.')

  const { error } = await supabase.from('charge_requests').insert({
    user_id: userId,
    reference_note: referenceNote.trim().slice(0, 100),
    coins: COIN_PACKAGE.coins,
    amount: COIN_PACKAGE.amount,
  })
  if (error) throw new Error('충전 요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
}

export async function listMyChargeRequests(): Promise<ChargeRequest[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('charge_requests')
    .select('id, reference_note, coins, amount, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.id,
    referenceNote: r.reference_note,
    coins: r.coins,
    amount: r.amount,
    status: r.status,
    createdAt: r.created_at,
  }))
}
