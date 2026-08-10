import { DrawnCardRecord } from './readings'
import { supabase } from './supabase'

export class InsufficientCoinsError extends Error {}

export interface AiInterpretationResult {
  interpretation: string
  method: 'free' | 'paid'
  remainingCoins: number | null
}

export async function fetchAiInterpretation(params: {
  spreadId: string
  spreadName: string
  question: string
  cards: DrawnCardRecord[]
}): Promise<AiInterpretationResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('로그인이 필요해요.')

  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body.error || '해석을 불러오지 못했어요.'
    if (res.status === 402) throw new InsufficientCoinsError(message)
    throw new Error(message)
  }
  return (await res.json()) as AiInterpretationResult
}
