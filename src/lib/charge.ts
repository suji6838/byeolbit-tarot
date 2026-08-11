import { supabase } from './supabase'

export async function submitChargeRequest(referenceNote: string, coins: number, amount: number): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('로그인이 필요해요.')

  const res = await fetch('/api/submit-charge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ referenceNote, coins, amount }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || '충전 요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
  return body.coins as number
}
