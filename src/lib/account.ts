import { supabase } from './supabase'

export async function deleteAccount(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('로그인이 필요해요.')

  const res = await fetch('/api/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || '탈퇴 처리에 실패했어요.')
  }
}
