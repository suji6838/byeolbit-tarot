import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userData, error: userError } = await anon.auth.getUser(token)
  if (userError || !userData.user) return res.status(401).json({ error: '로그인이 필요해요.' })

  // auth.users 삭제 시 readings/wallets/ai_usage_log/charge_requests 등은
  // 전부 on delete cascade로 걸려 있어 자동으로 함께 삭제된다.
  const admin = createClient(SUPABASE_URL, serviceRoleKey)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id)
  if (deleteError) {
    console.error('deleteUser failed:', deleteError)
    return res.status(500).json({ error: '탈퇴 처리 중 오류가 발생했어요.' })
  }

  return res.status(200).json({ ok: true })
}
