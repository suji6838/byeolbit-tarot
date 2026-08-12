import { supabase } from './supabase'

export interface ChargeRecord {
  id: string
  userId: string
  email: string
  referenceNote: string
  coins: number
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  revoked: boolean
  createdAt: string
}

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('로그인이 필요해요.')
  return { Authorization: `Bearer ${token}` }
}

export async function listRecentCharges(): Promise<ChargeRecord[]> {
  const res = await fetch('/api/admin-charges', { headers: await authHeader() })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '목록을 불러오지 못했어요.')
  const data = await res.json()
  return data.requests as ChargeRecord[]
}

async function postAction(requestId: string, action: 'approve' | 'reject' | 'revoke'): Promise<void> {
  const res = await fetch('/api/admin-charges', {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, action }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '처리에 실패했어요.')
}

export const approveCharge = (requestId: string) => postAction(requestId, 'approve')
export const rejectCharge = (requestId: string) => postAction(requestId, 'reject')
export const revokeCharge = (requestId: string) => postAction(requestId, 'revoke')
